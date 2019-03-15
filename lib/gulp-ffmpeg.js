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
      let formatIndex = c.indexOf('-f');
      let scaleIndex = c.indexOf('-vf');
      let width =
        scaleIndex && c[scaleIndex + 1].match(/scale=([0-9]+):/)
          ? c[scaleIndex + 1].match(/scale=([0-9]+):/)[1]
          : undefined;
      let newfilePath = file.path.replace(
        path.extname(file.path),
        `${width ? '-' + width : ''}${
          formatIndex ? '.' + c[formatIndex + 1] : path.extname(file.path)
        }`
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
