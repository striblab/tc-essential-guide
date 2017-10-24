/**
 * Render out pages
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const gutil = require('gulp-util');
const include = require('gulp-file-include');
const ejs = require('gulp-ejs');
const noopener = require('gulp-noopener');
const file = require('gulp-file');
const _ = require('lodash');
const htmlEscape = require('escape-html');

// For servers-ide rendering of svelte
require('svelte/ssr/register');

// Take guide data nd turn into data for layout templates.
// Each key in the dataset should correlate to a layout in templates/
// { lists: [{ prop: 1 }] }
//    -> templates/layout.lists.ejs.html
//    -> app/svelte-components/lists.html
function transfromData(datasets) {
  // Manually put together index page
  datasets.index = [
    {
      filename: 'index.html'
    }
  ];

  return datasets;
}

// Main render function that takes in a stream of
// gulp/vinyl files
function renderer(gulp, options = {}) {
  return () => {
    let tasks = [];

    // Get data
    let datasets = JSON.parse(fs.readFileSync(options.data, 'utf-8'));
    let defaultData = {
      config: JSON.parse(fs.readFileSync(options.config, 'utf-8')),
      content: JSON.parse(fs.readFileSync(options.content, 'utf-8')),
      package: JSON.parse(fs.readFileSync(options.package, 'utf-8')),
      _: _,
      htmlEscape: htmlEscape,
      escapeQuotes: (input = '') => {
        return _.isString(input) ? input.replace(/"/g, '\\"') : input;
      }
    };

    // TODO: Transform data
    datasets = transfromData(datasets);

    // Go through each data set
    _.each(datasets, (data, di) => {
      // Get layout
      let layoutPath = path.join(
        __dirname,
        '..',
        'templates',
        'layout.' + di + '.ejs.html'
      );
      let layout = fs.existsSync(layoutPath)
        ? fs.readFileSync(layoutPath, 'utf-8')
        : undefined;

      // No layout
      if (!layout) {
        return gutil.log('Unable to find layout file: ', layoutPath);
      }

      // Look for component
      let componentPath = path.join(
        __dirname,
        '..',
        'app',
        'svelte-components',
        'page.html'
      );
      let component = fs.existsSync(componentPath)
        ? require(componentPath)
        : undefined;

      // Go through each data point
      _.each(data, d => {
        // Render
        tasks.push(
          file(d.filename || di + '/' + _.snakeCase(d.id) + '.html', layout, {
            src: true
          })
            .pipe(
              include({
                prefix: '@@',
                basepath: path.join(__dirname, '..', 'templates')
              })
            )
            .pipe(
              ejs(
                _.extend({}, defaultData, {
                  data: d,
                  component: component.render(d)
                })
              ).on('error', gutil.log)
            )
            .pipe(noopener.warn())
            .pipe(gulp.dest('build/'))
        );
      });
    });

    return tasks;
  };
}

// Export
module.exports = renderer;
