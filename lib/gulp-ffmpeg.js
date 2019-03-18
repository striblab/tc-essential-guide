/**
 * ffmpeg processer for gulp
 */

const through = require('through2');
const path = require('path');
const fs = require('fs');
const spawnSync = require('child_process').spawnSync;
const gutil = require('gulp-util');
const File = require('vinyl');
const { isArray, isString } = require('lodash');
const tmp = require('tmp');
const _ = require('lodash');
const debug = require('debug')('gulp:ffmpeg');

module.exports = function(commands = []) {
  // through2.obj(fn) is a convenience wrapper around through2({ objectMode: true }, fn)
  return through.obj(function(file, enc, done) {
    // Check for args
    if (!commands) {
      return done(
        new gutil.PluginError(
          'gulp-ffmpeg',
          'options not given to gulp-ffmpeg plugin, use an array of array or string options for ffmpeg command.'
        )
      );
    }

    // Always error if file is a stream since gulp doesn't support a stream of streams
    if (file.isStream()) {
      this.emit(
        'error',
        new Error('Streaming not supported in gulp-ffmpeg plugin')
      );
      return done();
    }

    // Handle multiple args
    commands =
      isArray(commands) && isArray(commands[0]) ? commands : [commands];
    commands.forEach(c => {
      // Mp4 cannot handle stdout, so we have to create a temporary file
      let tmpFile = tmp.fileSync();
      debug(tmpFile);

      // Determine format
      let formatIndex = c.indexOf('-f');
      if (!formatIndex === -1) {
        return done(
          new gutil.PluginError(
            'gulp-ffmpeg',
            'Unable to find format flag "-f" in command.'
          )
        );
      }
      let format = c[formatIndex + 1];

      // Determine width
      let scaleIndex = c.indexOf('-vf');
      let width =
        scaleIndex && c[scaleIndex + 1].match(/scale=([0-9]+):/)
          ? c[scaleIndex + 1].match(/scale=([0-9]+):/)[1]
          : undefined;

      // If gif, we have to generate a palette first
      if (format.match(/gif/i)) {
        let gifTmpFile = tmp.fileSync({ postfix: '.png' });
        let lavfiIndex = c.indexOf('-lavfi');
        let lavfi = c[lavfiIndex + 1];
        let paletteConfig = lavfi.match(/^([^[]*)\s+\[x\]/)[1];
        width = lavfi.match(/scale=([0-9]+):/)[1];

        // Put together arguments
        let gifArgs = ['-i', file.path]
          .concat(['-vf', `${paletteConfig},palettegen`])
          //.concat(['-f', 'png'])
          .concat(['-y', gifTmpFile.name]);

        // Run palette command
        gutil.log(`[gif palette] ffmpeg ${gifArgs.join(' ')}`);
        const { stderr, status, error } = spawnSync('ffmpeg', gifArgs);
        if (error) {
          return done(new gutil.PluginError('gulp-ffmpeg', error));
        }
        if (status) {
          return done(new gutil.PluginError('gulp-ffmpeg', stderr.toString()));
        }

        // Add palette to input
        c = ['-i', gifTmpFile.name].concat(c);
      }

      // Add input file and output to stdout
      let args = ['-i', file.path].concat(c).concat(['-y', tmpFile.name]);

      // Command line
      gutil.log(`ffmpeg ${args.join(' ')}`);
      const { stdout, stderr, status, error } = spawnSync('ffmpeg', args);

      // Check for errors
      if (error) {
        return done(new gutil.PluginError('gulp-ffmpeg', error));
      }
      if (status) {
        return done(new gutil.PluginError('gulp-ffmpeg', stderr.toString()));
      }

      // Debug output
      debug(stderr.toString());

      // Create new file, look for scale and format for renaming
      let newfilePath = file.path.replace(
        path.extname(file.path),
        `${width ? '-' + width : ''}.${format}`
      );

      debug(newfilePath);
      let f = new File({
        base: path.dirname(file.path),
        path: newfilePath,
        contents: fs.readFileSync(tmpFile.name)
      });
      this.push(f);

      tmpFile.removeCallback();
    });

    done();
  });
};
