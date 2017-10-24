/**
 * Get data from airtable
 */

// Dependencies
const fs = require('fs');
const Airtable = require('airtable');
const _ = require('lodash');
const gutil = require('gulp-util');
const marked = require('marked');

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
          _.each(options.tables, (t, ti) => {
            data[_.camelCase(t)] = _.map(results[ti], r => {
              // Make field names camelcalse
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
              });

              return altered;
            });
          });

          // Write data
          fs.writeFile(options.outputPath, JSON.stringify(data), done);
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

// Export
module.exports = gulpFetch;
