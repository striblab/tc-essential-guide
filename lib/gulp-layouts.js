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

// For server-side rendering of svelte
require('svelte/ssr/register');

// Take guide data nd turn into data for layout templates.
// Each key in the dataset should correlate to a layout in templates/
// { lists: [{ prop: 1 }] }
//    -> templates/layout.lists.ejs.html
//    -> app/svelte-components/lists.html
function transfromData(datasets, defaultData) {
  // Go through each set
  _.each(datasets, (data, di) => {
    datasets[di] = _.map(data, d => {
      d.filename = d.filename || di + '/' + _.snakeCase(d.id) + '.html';
      d.basePath = d.basePath || '..';
      d.pageAuthor = d.byline || undefined;
      d.pageDescription = d.description || undefined;
      d.dataset = di;
      d.siteSettings = defaultData.content;
      d.baseURL = defaultData.config.publish.production.url;

      return d;
    });
  });

  // Add references, and sort
  _.each(datasets, (data, di) => {
    datasets[di] = _.map(data, d => {
      ['groups', 'lists', 'items'].forEach(set => {
        if (_.isArray(d[set]) && d[set].length) {
          d[set] = _.orderBy(
            _.map(d[set], i => {
              let f = _.find(datasets[set], { airtableId: i });
              return f ? f : i;
            }),
            ['order', 'title', 'name']
          );
        }
      });

      return d;
    });
  });

  // Add main visual, which defaults to nested items
  _.each(datasets, (data, di) => {
    datasets[di] = _.map(data, d => {
      // Main visual
      d.mainVisual =
        d.mainImageLocal ||
        (d.lists && d.lists[0].mainImageLocal
          ? d.lists[0].mainImageLocal
          : undefined) ||
        (d.items && d.items[0].mainImageLocal
          ? d.items[0].mainImageLocal
          : undefined) ||
        (d.groups && d.groups[0].mainImageLocal
          ? d.groups[0].mainImageLocal
          : undefined);
      d.mainVisualDescription =
        d.imageDescription ||
        (d.lists && d.lists[0].imageDescription
          ? d.lists[0].imageDescription
          : undefined) ||
        (d.items && d.items[0].imageDescription
          ? d.items[0].imageDescription
          : undefined) ||
        (d.groups && d.groups[0].imageDescription
          ? d.groups[0].imageDescription
          : undefined);

      return d;
    });
  });

  // Manually put together index page
  datasets.index = [
    {
      dataset: 'index',
      filename: 'index.html',
      basePath: '.',
      title: defaultData.content.title,
      groups: datasets.groups,
      siteSettings: defaultData.content,
      baseURL: defaultData.config.publish.production.url,
      mainVisual: 'assets/images/newtwincities.png'
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
      config: options.config
        ? JSON.parse(fs.readFileSync(options.config, 'utf-8'))
        : {},
      content: options.airtableContent
        ? parseAirtableContent(
          JSON.parse(fs.readFileSync(options.airtableContent, 'utf-8'))
        )
        : options.content
          ? JSON.parse(fs.readFileSync(options.content, 'utf-8'))
          : {},
      package: JSON.parse(fs.readFileSync(options.package, 'utf-8')),
      _: _,
      htmlEscape: htmlEscape,
      escapeQuotes: (input = '', singleQuote = false) => {
        return _.isString(input)
          ? singleQuote
            ? input.replace(/'/g, '\\\'')
            : input.replace(/"/g, '\\"')
          : input;
      },
      htmlRemove: (input = '') => {
        return _.isString(input) ? input.replace(/(<([^>]+)>)/gi, '') : '';
      },
      htmlAttribute: (input = '') => {
        return _.isString(input)
          ? htmlEscape(input.replace(/(<([^>]+)>)/gi, '')).replace(/"/g, '\\"')
          : '';
      }
    };

    // TODO: Somehow make this configuration?
    datasets = transfromData(datasets, defaultData);

    // We need groups on each page for navigation
    defaultData.groups = _.map(datasets.groups, m => {
      let n = JSON.parse(flatStringify(m));
      n.lists = n.lists ? _.map(m.lists, ['id', 'filename']) : [];
      n.items = n.items ? _.map(m.items, ['id', 'filename']) : [];
      return n;
    });

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
      let componentsPath = path.join(
        __dirname,
        '..',
        'app',
        'svelte-components'
      );
      let componentPath = path.join(componentsPath, di + '.html');
      let contentComponent;
      if (fs.existsSync(componentPath)) {
        delete require.cache[require.resolve(componentPath)];
        contentComponent = require(componentPath);
      }

      // Common components
      let commonComponents = {};
      ['header'].forEach(c => {
        let p = path.join(componentsPath, c + '.html');
        delete require.cache[require.resolve(p)];
        commonComponents[c] = require(p);
      });

      // Go through each data point
      _.each(data, d => {
        // Add some layout information
        d.layout = d.layout || {};
        d.layout.id = di;

        // Render HTML
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
                  contentComponent: contentComponent.render(
                    _.extend({}, defaultData, { data: d })
                  ).html,
                  commonComponents: _.mapValues(commonComponents, c => {
                    return c.render(_.extend({}, defaultData, { data: d }))
                      .html;
                  })
                })
              ).on('error', gutil.log)
            )
            .pipe(noopener.warn())
            .pipe(gulp.dest('build/'))
        );

        // Render JSON for client side rendering
        tasks.push(
          file(
            d.filename
              ? d.filename.replace('.html', '.json')
              : di + '/' + _.snakeCase(d.id) + '.json',
            flatStringify(d),
            {
              src: true
            }
          ).pipe(gulp.dest('build/'))
        );
      });
    });

    return tasks;
  };
}

// Parse settings (array of key and value)
function parseAirtableContent(input) {
  let parsed = {};
  if (input && input.settings) {
    _.each(input.settings, s => {
      parsed[s.name] = s.value;
    });
  }
  return parsed;
}

// A hackish thing to avoid circular JSON
function flatStringify(data) {
  let cache = [];
  return JSON.stringify(data, function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  });
}

// Export
module.exports = renderer;
