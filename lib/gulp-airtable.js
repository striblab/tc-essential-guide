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
const PromisePool = require('es6-promise-pool');
const argv = require('yargs').argv;

// Markdown render links
let markedRenderer = new marked.Renderer();
markedRenderer.link = (href, title, text) => {
  // Fix link
  href = href.match(/^http/i) ? href : 'http://' + href;
  href = href.replace('www.www.', 'www.');
  title = !title ? '' : `title="${title}"`;
  let target = href && ~href.indexOf('startribune') ? '' : 'target="_blank"';
  return `<a ${target} rel="noopener" href="${href}" ${title}>${text}</a>`;
};

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

          // Filter where "No publish" is true
          all = _.filter(all, a => {
            return a && !a['No publish'];
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
                    altered[_.camelCase(k)] = marked(v, {
                      renderer: markedRenderer
                    });
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
                    //console.log(v);
                    let extension = _.last(v[0].type.split('/'))
                      .toLowerCase()
                      .replace('jpeg', 'jpg');
                    altered[_.camelCase(k) + 'Local'] = path.join(
                      options.imagePath,
                      altered.id + '.' + extension
                    );
                    images.push({
                      url: v[0].url,
                      local: altered[_.camelCase(k) + 'Local'],
                      meta: v[0]
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
  //return Promise.resolve([]);
  if (!_.isArray(images) || !images.length) {
    gutil.log('No images to download.');
    return Promise.resolve([]);
  }

  if (argv.image === false) {
    gutil.log('Not downloading images.  (--no-images)');
    return Promise.resolve([]);
  }

  // Get image
  const getImage = index => {
    console.log(images[index].url);
    return fetch(images[index].url)
      .then(function(response) {
        return response.buffer();
      })
      .then(function(buffer) {
        fs.writeFileSync(images[index].local, buffer);
      });
  };

  // Handle pool
  let imageIndex = -1;
  const pooler = () => {
    imageIndex++;

    // Check image id
    let handleImageId = !argv.imageId
      ? true
      : argv.imageId &&
        images[imageIndex] &&
        images[imageIndex].meta &&
        images[imageIndex].meta.id === argv.imageId
        ? true
        : false;

    if (images[imageIndex] && handleImageId) {
      return getImage(imageIndex);
    }
    else if (images[imageIndex]) {
      return new Promise(resolve => resolve());
    }

    return null;
  };

  // Pool
  const pool = new PromisePool(pooler, 1);

  gutil.log(`Downloading ${images.length} images.`);
  return pool.start();
}

// Export
module.exports = gulpFetch;
