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
  // Go through each set
  _.each(datasets, (data, di) => {
    datasets[di] = _.map(data, d => {
      d.filename = d.filename || di + '/' + _.snakeCase(d.id) + '.html';
      d.basePath = '..';
      return d;
    });
  });

  // Add references
  _.each(datasets, (data, di) => {
    datasets[di] = _.map(data, d => {
      ['groups', 'lists', 'items'].forEach(set => {
        if (_.isArray(d[set]) && d[set].length) {
          d[set] = _.map(d[set], i => {
            let f = _.find(datasets[set], { airtableId: i });
            return f ? f : i;
          });
        }
      });

      return d;
    });
  });

  // Manually put together index page
  datasets.index = [
    {
      filename: 'index.html',
      groups: datasets.groups
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

    // TODO: Somehow make this configuration?
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

      // Look for component.  Note that something.html without other
      // extensions is needed as svelte rendered turns the filename
      // into a component name and is strict about that.
      let componentPath = path.join(
        __dirname,
        '..',
        'app',
        'svelte-components',
        di + '.html'
      );
      let component;
      if (fs.existsSync(componentPath)) {
        delete require.cache[require.resolve(componentPath)];
        component = require(componentPath);
      }

      // Go through each data point
      _.each(data, d => {
        // Add some layout information
        d.layout = d.layout || {};
        d.layout.id = di;

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
                  component: component
                    ? component.render(_.extend({}, defaultData, { data: d }))
                    : undefined
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
