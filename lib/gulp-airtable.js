/**
 * Get data from airtable
 */

// Dependencies
const fs = require('fs-extra');
const path = require('path');
const Airtable = require('airtable');
const _ = require('lodash');
const gutil = require('gulp-util');
const marked = require('marked');
const fetch = require('node-fetch');

// Fetch all data from a table
function fetchAll(base, table) {
  return new Promise((resolve, reject) => {
    let all = [];

    base(table)
      .select({})
      .eachPage(
        (records, next) => {
          all = all.concat(
            _.map(records, r => {
              // Attach Airtable row ID to fields
              r.fields = r.fields || {};
              r.fields.airtableID = r.id;
              return r.fields;
            })
          );
          next();
        },
        error => {
          if (error) {
            return reject(error);
          }

          // Filter empty rows
          all = _.filter(all, a => {
            return a && !_.isEmpty(a);
          });

          resolve(all);
        }
      );
  });
}

// Gulp task
function gulpFetch(gulp, options = {}) {
  return done => {
    if (!options.apiKey) {
      return done(
        new gutil.PluginError(
          'airtable',
          'apiKey option not given to airtable task.'
        )
      );
    }
    if (!options.base) {
      return done(
        new gutil.PluginError(
          'airtable',
          'base option not given to airtable task.'
        )
      );
    }
    if (!options.outputPath) {
      return done(
        new gutil.PluginError(
          'airtable',
          'outputPath option not given to airtable task.'
        )
      );
    }

    // Make image path if needed
    if (options.imagePath) {
      fs.mkdirsSync(options.imagePath);
    }

    // Create connection object
    let base = new Airtable({ apiKey: options.apiKey }).base(options.base);

    if (options.tables) {
      Promise.all(
        _.map(options.tables, t => {
          gutil.log('airtable', 'Fetching ' + t);
          return fetchAll(base, t);
        })
      )
        .then(results => {
          // Put back together
          let data = {};
          let images = [];

          _.each(options.tables, (t, ti) => {
            data[_.camelCase(t)] = _.orderBy(
              _.map(results[ti], r => {
                // Make field names camelcase
                let altered = {};
                _.each(r, (v, k) => {
                  altered[_.camelCase(k)] = v;

                  // Handle any markdown
                  if (
                    v &&
                    options.markdown &&
                    ~options.markdown.indexOf(
                      _.camelCase(t) + '.' + _.camelCase(k)
                    )
                  ) {
                    altered[_.camelCase(k)] = marked(v);
                  }

                  // Get any images to download
                  if (
                    v &&
                    v[0] &&
                    options.imagePath &&
                    options.images &&
                    ~options.images.indexOf(
                      _.camelCase(t) + '.' + _.camelCase(k)
                    )
                  ) {
                    let extension = _.last(v[0].type.split('/'))
                      .toLowerCase()
                      .replace('jpeg', 'jpg');
                    altered[_.camelCase(k) + 'Local'] = path.join(
                      options.imagePath,
                      altered.id + '.' + extension
                    );
                    images.push({
                      url: v[0].url,
                      local: altered[_.camelCase(k) + 'Local']
                    });
                  }
                });

                return altered;
              }),
              ['order', 'name', 'title']
            );
          });

          // Get images
          getImages(images)
            .then(() => {
              // Write data
              fs.writeFile(options.outputPath, JSON.stringify(data), done);
            })
            .catch(done);
        })
        .catch(error => {
          done(new gutil.PluginError('airtable', error, { showStack: true }));
        });
    }
    else {
      gutil.log(gutil.colors.yellow('No bases provided to Airtable task.'));
      done();
    }
  };
}

// Download airtable image
function getImages(images = []) {
  if (!_.isArray(images) || !images.length) {
    gutil.log('No images to download.');
    return Promise.resolve([]);
  }

  gutil.log(`Downloading ${images.length} images.`);
  return Promise.all(
    _.map(images, i => {
      return fetch(i.url)
        .then(function(response) {
          return response.buffer();
        })
        .then(function(buffer) {
          fs.writeFileSync(i.local, buffer);
        });
    })
  );
}

// Export
module.exports = gulpFetch;
