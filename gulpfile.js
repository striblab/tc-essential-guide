/**
 * Task running and building through Gulp.
 * http://gulpjs.com/
 *
 * Overall, use config files (like .babelrc) to manage
 * options for processes.  This will allow moving away from
 * Gulp more easily if desired.
 */
'use strict';

// Dependencies
const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const _ = require('lodash');
const rename = require('gulp-rename');
const eslint = require('gulp-eslint');
const stylelint = require('gulp-stylelint');
const sass = require('gulp-sass');
const htmlhint = require('gulp-htmlhint');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const a11y = require('gulp-a11y');
const responsive = require('gulp-responsive');
const ejs = require('gulp-ejs');
const imagemin = require('gulp-imagemin');
const gutil = require('gulp-util');
const gulpEach = require('gulp-each');
const runSequence = require('run-sequence');
const browserSync = require('browser-sync').create();
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const argv = require('yargs').argv;
const webpackConfig = require('./webpack.config.js');
const del = require('del');
const swprecache = require('sw-precache');
const gulpContent = require('./lib/gulp-content.js');
const gulpPublish = require('./lib/gulp-publish.js');
const ffmpeg = require('./lib/gulp-ffmpeg.js');
const jest = require('./lib/gulp-jest.js');
const layouts = require('./lib/gulp-layouts.js');
const airtable = require('./lib/gulp-airtable.js');
const responsiveConfig = require('./lib/gulp-responsive.js');
const config = exists('config.custom.json')
  ? require('./config.custom.json')
  : require('./config.json');

require('dotenv').load({ silent: true });

// Process laytouts/templates.  Components get rendered server-side
// for better performance and SEO
gulp.task(
  'html',
  layouts(gulp, {
    data: 'sources/guide-data.json',
    airtableContent: 'sources/guide-settings.json',
    //content: 'content.json',
    config: 'config.json',
    package: 'package.json'
  })
);

// Get guide data from Airtable
gulp.task(
  'source:content',
  airtable(gulp, {
    base: 'appdVGBfh1z13BSwv',
    apiKey: process.env.AIRTABLE_API_KEY,
    tables: ['Groups', 'Lists', 'Items'],
    images: ['lists.mainImage', 'items.mainImage'],
    imagePath: 'assets/images/airtable',
    markdown: ['lists.byline', 'lists.description', 'items.description'],
    outputPath: 'sources/guide-data.json'
  })
);
gulp.task(
  'source:settings',
  airtable(gulp, {
    base: 'appdVGBfh1z13BSwv',
    apiKey: process.env.AIRTABLE_API_KEY,
    tables: ['Settings'],
    outputPath: 'sources/guide-settings.json'
  })
);
gulp.task('source:data', ['source:content', 'source:settings']);

// Lint HTML (happens after HTML build process).  The "stylish" version
// is more succinct but its less helpful to find issues.
gulp.task('html:lint', ['html'], () => {
  return gulp
    .src('build/*.html')
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(htmlhint.reporter('htmlhint-stylish'))
    .pipe(a11y())
    .pipe(a11y.reporter());
});
gulp.task('html:lint:details', ['html'], () => {
  return gulp
    .src('build/*.html')
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(htmlhint.reporter())
    .pipe(a11y())
    .pipe(a11y.reporter());
});

// Wrapper for data and html
gulp.task('html:data', done => {
  runSequence('source:data', 'html:lint:details', done);
});

// Content tasks
gulp.task('content', gulpContent.getContent(gulp, config));
gulp.task('content:create', gulpContent.createSheet(gulp, config));
gulp.task('content:open', gulpContent.openContent(gulp, config));
gulp.task('content:owner', gulpContent.share(gulp, config, 'owner'));
gulp.task('content:share', gulpContent.share(gulp, config, 'writer'));

// Lint JS
gulp.task('js:lint', () => {
  return gulp
    .src(['app/**/*.js', 'gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format());
});

// Lint styles/css
gulp.task('styles:lint', () => {
  return gulp.src(['styles/**/*.scss']).pipe(
    stylelint({
      failAfterError: false,
      reporters: [{ formatter: 'string', console: true }]
    })
  );
});

// Compile styles
gulp.task('styles', ['styles:lint'], () => {
  return gulp
    .src('styles/index.scss')
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: 'compressed',
        includePaths: [path.join(__dirname, 'node_modules')]
      }).on('error', sass.logError)
    )
    .pipe(
      autoprefixer({
        // browsers: See browserlist file
        cascade: false
      })
    )
    .pipe(
      rename(path => {
        path.basename =
          path.basename === 'index' ? 'styles.bundle' : path.basename;
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/'));
});

// Build JS
gulp.task('js', ['js:lint', 'js:test'], () => {
  // Use the webpack.config.js to manage locations and options.
  return gulp
    .src('app/index.js')
    .pipe(webpackStream(webpackConfig, webpack))
    .pipe(gulp.dest('build'));
});

// Assets copy
gulp.task('assets', () => {
  let pkg = require('./package.json');
  let settings = exists('sources/guide-settings.json')
    ? require('./sources/guide-settings.json')
    : {};
  let config = exists('config.custom.json')
    ? require('./config.custom.json')
    : require('./config.json');
  config = _.extend(config, layouts.parseAirtableContent(settings));

  // Copy a couple files to root for more global support
  gulp.src(['./assets/images/favicons/favicon.ico']).pipe(gulp.dest('build'));
  gulp
    .src(['./assets/images/favicons/manifest.json'])
    .pipe(
      ejs({
        content: config,
        pkg: pkg
      })
    )
    .pipe(gulp.dest('build'));

  return gulp.src('assets/**/*').pipe(gulp.dest('build/assets'));
});

// Optimize images
gulp.task('assets:imagemin', () => {
  return gulp
    .src('build/assets/images/**/*')
    .pipe(imagemin())
    .pipe(gulp.dest('build/assets/images/'));
});

// Responsive images and video.  These are expensive tasks.
gulp.task('assets:responsive:airtable', () => {
  return gulp
    .src(['assets/images/airtable/**/*.{jpg,png}'])
    .pipe(
      responsive(
        responsiveConfig(responsive).sizes,
        responsiveConfig(responsive).options
      )
    )
    .pipe(gulp.dest('build/assets/images/airtable'));
});
gulp.task('assets:responsive:images', () => {
  return gulp
    .src(['assets/images/responsive/**/*.{jpg,png}'])
    .pipe(
      responsive(
        responsiveConfig(responsive).sizes,
        responsiveConfig(responsive).options
      )
    )
    .pipe(gulp.dest('build/assets/images/responsive'));
});

// Image sizes: '300', '600', '900', '1200', '2000'
gulp.task('assets:responsive:videos', () => {
  const webm = width =>
    `-c:v libvpx -qmin 0 -qmax 25 -crf 4 -b:v 1M -an -vf scale=${width}:-2 -f webm`.split(
      ' '
    );
  const mp4 = width =>
    `-c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 3.0 -crf 22 -vf scale=${width}:-2 -an -movflags +faststart -threads 0 -f mp4`.split(
      ' '
    );

  return gulp
    .src(['assets/videos/**/*.mp4'])
    .pipe(
      ffmpeg([
        webm('2000'),
        webm('1200'),
        webm('900'),
        webm('300'),
        mp4('2000'),
        mp4('1200'),
        mp4('900'),
        mp4('300')
      ])
    )
    .pipe(gulp.dest('build/assets/videos/'));
});
gulp.task('assets:responsive', [
  'assets:responsive:images',
  'assets:responsive:airtable',
  'assets:responsive:videos'
]);

// Clean build
gulp.task('clean', () => {
  return del(['build/**/*']);
});

// Testing, manully using jest module because
gulp.task(
  'js:test',
  jest('js:test', {
    rootDir: __dirname,
    testMatch: ['**/*.test.js'],
    testPathIgnorePatterns: ['acceptance'],
    setupFiles: ['./tests/globals.js']
  })
);
gulp.task(
  'js:test:acceptance',
  jest('js:test:acceptance', {
    rootDir: __dirname,
    // Not sure why full path is needed
    testMatch: [path.join(__dirname, 'tests/acceptance/*.test.js')]
  })
);

// Web server for development.  Do build first to ensure something is there.
gulp.task('server', ['build'], () => {
  return browserSync.init({
    port: 3000,
    server: './build/',
    files: './build/**/*',
    https: argv.https
  });
});

// Watch for building
gulp.task('watch', () => {
  gulp.watch(['styles/**/*.scss'], ['styles']);
  gulp.watch(
    [
      'templates/**/*',
      'sources/**/*.json',
      'config.*json',
      'package.json',
      'content.json',
      'app/svelte-components/**/*'
    ],
    ['html']
  );
  gulp.watch(['app/**/*', 'config.json'], ['js']);
  gulp.watch(['assets/**/*'], ['assets']);
  gulp.watch(['config.*json'], ['publish:build-config']);
});

// Make precache service worker file
gulp.task('sw:precache', done => {
  let pkg = require('./package.json');
  let location = 'build';
  let handleFetch = argv.deploying || argv.production ? true : false;
  gutil.log(`sw:precache handling fetch: ${handleFetch}`);

  let config = {
    cacheId: pkg.name,
    // False for dev so that caching wont get in the way,
    // but this means that Chrome/Android won't think
    // the site has offline capabilities, FYI
    handleFetch: argv.deploying || argv.production ? true : false,
    logger: gutil.log,
    // Note that sw-precache will use cache version, unless specified
    // here.  But, each time this is run, hashes are created, so,
    // in theory this is just in the hands of http caching.
    // But, to me a little conservative, we exclude certain files
    //
    // About service worker caching:
    // https://stackoverflow.com/questions/38843970/service-worker-javascript-update-frequency-every-24-hours
    runtimeCaching: [
      {
        urlPattern: /^(.*\.html|.*sw-precache-service-worker\.js.*)$/,
        handler: 'networkFirst'
      },
      // Some external resources
      {
        urlPattern: /^https:\/\/cdn\.polyfill\.io\/.*$/,
        handler: 'networkFirst',
        options: {
          cache: {
            name: pkg.name + '-polyfill-api'
          }
        }
      },
      {
        urlPattern: /^https:\/\/maps.googleapis.com\/.*\.js(.*|$)/,
        handler: 'networkFirst',
        options: {
          cache: {
            name: pkg.name + '-google-maps-api'
          }
        }
      }
      // Does not seem to work
      // {
      //   urlPattern: /^https:\/\/maps.googleapis.com\/maps\/vt\?.*/,
      //   handler: 'networkFirst',
      //   options: {
      //     cache: {
      //       maxEntries: 100,
      //       name: pkg.name + '-google-maps-tiles'
      //     }
      //   }
      // }
    ],
    // Ignore the view pages
    ignoreUrlParametersMatching: [/^utm_/, /^view$/],
    staticFileGlobs: [
      location + '/**/*.{js,json,html,css,svg,ico,ttf,eot,woff}',
      location + '/assets/images/favicons/**/*.*',
      location + '/assets/images/icons/**/*.*',
      // Default offline image
      location + '/assets/images/airtable/**/*-600*jpg',
      // All homepage images
      location + '/assets/images/responsive/**/*-*px.jpg'
    ],
    stripPrefix: location + '/'
    //verbose: true
  };

  swprecache.write(
    path.join(__dirname, location, 'sw-precache-service-worker.js'),
    config,
    done
  );
});

// Mostly for FB, create a list of HTML files for
// re-scraping
gulp.task('html:list', () => {
  console.error();
  let count = 1;

  return gulp.src('build/**/*.html').pipe(
    gulpEach((contents, file, done) => {
      console.error(
        count % 50 === 0
          ? '\n'
          : '' +
              config.publish.production.url +
              file.path.replace(file.base, '')
      );

      count++;
      done();
    })
  );
});

// Publishing
gulp.task(
  'publish',
  ['publish:token', 'publish:confirm'],
  gulpPublish.publish(gulp)
);
gulp.task('publish:token', gulpPublish.createToken(gulp));
gulp.task('publish:build-config', gulpPublish.buildConfig(gulp));
gulp.task('publish:confirm', gulpPublish.confirmToken(gulp));
gulp.task('publish:open', gulpPublish.openURL(gulp));

// Short build and full build
gulp.task('build', done => {
  runSequence(
    'source:data',
    'assets',
    ['html:lint:details', 'styles', 'js'],
    'sw:precache',
    done
  );
});
gulp.task('build:full', done => {
  runSequence(
    'source:data',
    ['assets', 'assets:responsive'],
    'assets:imagemin',
    ['html:lint:details', 'styles', 'js'],
    'sw:precache',
    done
  );
});
gulp.task('default', ['build:full']);

// Deploy (build and publish)
gulp.task('deploy', done => {
  argv.deploying = true;
  return runSequence('clean', 'build:full', 'publish', done);
});
gulp.task('deploy:open', ['publish:open']);

// Server and watching (development)
gulp.task('develop', ['server', 'watch']);

// Check file/fir exists
function exists(file) {
  return fs.existsSync(path.join(__dirname, file));
}
