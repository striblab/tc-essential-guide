# Essential Twin Cities Guide.

All the best places to go to when you are in the Twin Cities (for the Super Bowl).

## Development

### Meta tag and "SEO" testing

See the following resources to test attributes.

- [Google structured data](https://search.google.com/structured-data/testing-tool)
- [Facebook/Open Graph testing](https://developers.facebook.com/tools/debug/)
- [Twitter testing](https://cards-dev.twitter.com/validator)

### Install

The following are global prerequisites and may already be installed.

1. (on Mac) Install [homebrew](http://brew.sh/).
1. Install [Node.js](https://nodejs.org/en/).
   - (on Mac) `brew install node`
1. Install [Gulp](http://gulpjs.com/): `npm install gulp -g`
1. Set the following environment variables:
   - `AIRTABLE_API_KEY`: The [Airtable](https://airtable.com/api) API key used to get data from the spreadsheets.

The following should be performed for initial and each code update:

1. Install Node dependencies: `npm install`

### Local

To run a local web server that will auto-reload with [Browsersync](https://browsersync.io/), watch for file changes and re-build: `gulp develop`

### Directories and files

- `config.json`: Non-content config for application.
  - Use this to add non-local JS or CSS assets, such as from a CDN.
  - This can be overridden with a `config.custom.json` if there is a need to add configuration that should not be put into revision history.
- `content.json`: See _Content and copy_. This file is used to hold content values, such as a site-wide title or description.
- `templates/`: Holds HTML templates. Any files in here will get run through [EJS](http://www.embeddedjs.com/) templating and passed values from `config.json`, `content.json`, `package.json`, and data from the Airtable data source.
  - `templates/layout.*.ejs.html`: These are the files that get rendered with the data described above and correlate to a file or set of files rendered in the build.
  - `templates/_*.ejs.html`: These are includes used to help separate out and reuse parts.
- `styles/`: Styles in [SASS](http://sass-lang.com/) syntax.
  - `styles/index.scss`: Main point of entry for styles.
  - `styles/_*.scss`: Any includes should be prefixed with an underscore.
- `app/`: Where JS logic goes. This supports ES6+ JS syntax with [Babel](https://babeljs.io/) and gets compiled with [Webpack](https://webpack.js.org/).
  - `app/index.js`: Main entry point of application.
  - `app/svelte-components/*`: [Svelte](https://svelte.technology/guide) components. These get rendered in the template/layout process as well as brought in on the client side.
- `assets/`: Various media files. This gets copied directly to build.
- `sources/`: Directory is for all non-data source material, such as wireframes or original images. Note that if there are materials that should not be made public, consider using Dropbox and make a note in this file about how to access.
- `lib/`: Modules used in building or other non-data tasks.
- `tests/`: Tests for app; see Testing section below.
- The rest of the files are for building or meta-information about the project.

### Content and copy

The majority of content is managed in this Airtable. Use the following command to get new data from the Airtable, saved as `sources/guide-data.json`:

    gulp source:data

Note that the `gulp develop` process does not automatically download new data as it would be slow to run every time, which means you will have to manually run the above command.

### Dependencies and modules

Depending on what libraries or dependencies you need to include there are a few different ways to get those into the project.

- **JS**
  - Include it with `npm`.
    - For instance: `npm install --save awesome-lib`
    - This can then be included in the application, with something like:
      ```js
      import awesome from "awesome-lib";
      awesome.radical();
      ```
  - For dependencies that are very common and are available through a trusted CDN, you can include it in `config.json`. Consider using the [StribLab static libs CDN](https://github.com/striblab/static-libs).
    - For instance:
      ```js
      "js": {
        "globals": [
          "https://cdnjs.cloudflare.com/ajax/libs/pym/1.1.2/pym.v1.min.js"
        ]
      }
      ```
    - In your application, make sure to add a comment like the following so that linters will know that the dependency is already loaded.
      ```js
      /* global Pym */
      ```
    - **IMPORTANT** Make sure to always use a specific version from a CDN; do not use _latest_ or something similar.
    - For testing, these need to be available and should be added to `tests/global.js`
  - For local modules that you have written yourself, you can use the ES6 module syntax.
    - For instance, say you have created a `utils.js` module file, just use a relative path to include it:
      ```js
      import utilsFn from "./utils.js";
      let utils = utilsFn({});
      ```
- **CSS**
  - Include it with `npm`.
    - For instance: `npm install --save normalize-scss`
    - This can then be included in the application, with something like:
      ```css
      @import "normalize-scss/sass/_normalize.scss";
      ```
  - For dependencies that are very common and are available through a trusted CDN, you can include it in `config.json`. Consider using the [StribLab static libs CDN](https://github.com/striblab/static-libs).
    - For instance:
      ```js
      "css": {
        "globals": [
          "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"
        ]
      }
      ```
    - **IMPORTANT** Make sure to always use a specific version from a CDN; do not use _latest_ or something similar.

### Testing

Testing is run via [Jest](https://facebook.github.io/jest/). Fast, unit and higher level testing will happen on build. You can run these test manually with `gulp js:test` or `npm test`.

Acceptance testing (i.e. high level quality assurance) is done separately as running headless Chrome takes more than a couple seconds. You will need a new version of Chrome or Chrome Canary installed, then run `js:test:acceptance`.

_NOTE_: Acceptance test will fail until [this fix](https://github.com/GoogleChrome/lighthouse/issues/2618) is published.

_TODO_: Some basic automated, cross-browser testing would be very beneficial. Unfortunately things like Browserstack are very expensive, and managing our own servers to do this would be very expensive time-wise as well.

#### Embed testing

A manual test page is provided for looking at the piece embeded in another page.

1. Assumes you are running the development server with `gulp develop`
1. Run a local server for the test directory, such as `cd tests && python -m SimpleHTTPServer` or `http-server ./tests/`
1. In a browser, go to [http://localhost:8080/manual/embed.html](http://localhost:8080/manual/embed.html).

### Build

All parts are compiled into the `build/` folder. The default complete build can be done with `gulp` or `gulp build`

## Publish and deploy

Deployment is setup for AWS S3. Set the following environment variables; they can be set in a [.env](https://www.npmjs.com/package/dotenv) file as well. For further reading on setting up access, see [Configureing the JS-SDK](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- OR `AWS_DEFAULT_PROFILE`
- OR `AWS_CONFIG_FILE`

To deploy, run `gulp deploy`. This will build and publish to the location configured as `default` (see _Configuration_ below).

To deploy to the `production` location, for instance, simply use that flag like: `gulp deploy --production`

A handy command is to use `gulp publish:open` to open the URL to that project.

### Configuration

Publishing is configured in the `config.json` file. The `publish` property can have the following keys: `default`, `testing`, `staging`, and `production`. It is suggested to use default in place of the `staging` as the default gets used when no flag is specified (see below). Each key should correspond to an object with `bucket`, `path`, and `url`. **IMPORTANT**: The `url` should be a fully qualified URL that ends with a `/`. This URL will get inserted into some meta tags on the page by default. For example:

```js
{
  "publish": {
    "default": {
      "bucket": "static.startribune.com",
      "path": "news/projects-staging/all/super-bowl-guide/",
      "url": "http://static.startribune.com/news/projects-staging/all/super-bowl-guide/"
    },
    "production": {
      "bucket": "static.startribune.com",
      "path": "news/projects/all/super-bowl-guide/",
      "url": "http://static.startribune.com/news/projects/all/super-bowl-guide/"
    }
  }
}
```

Using the flags `--testing`, `--staging`, or `--production` will switch context for any relevant `publish` or `deploy` commands. Note that if the flag is not configured, the `default` will be used.

### Publishing token

The publishing function, uses a token that helps ensure a name collision with another project doesn't overwrite files unwittingly. The `publishToken` in `config.json` is used as an identifier. This gets deployed to S3 and then checked whenever publishing happens again. The `gulp publish` (run via `gulp deploy`) will automatically create this token if it doesn't exist.

If you see an error message that states that the tokens do not match, make sure that the location you are publishing to doesn't have a different project at it, or converse with teammates or administrators about the issue.

### Styles and practices

Having a consistent style for code and similar aspects makes collaboration easier. Though there is nothing that enforces these things, intentionally so, spending some time to adhere to these styles will be beneficial in the long run.

- **JS**: Javascript is linted with [ESLint](http://eslint.org/) and defined in `.eslintrc`.
  - The defined style extends from [eslint:recommended](https://github.com/eslint/eslint/blob/master/conf/eslint.json) but is more focal about single quotes for strings and using semicolons.
  - Install the following ESLint plugins for [Atom](https://atom.io/packages/linter-eslint), [Sublime Text](https://github.com/roadhump/SublimeLinter-eslint), or [others](http://eslint.org/docs/user-guide/integrations).
- **Styles**: SASS (and CSS) is linted with [stylelint](https://stylelint.io/) and defined in `.styleintrc`.
  - The defined style extends from [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard) with a couple additions to how colors are defined.
  - Install the following stylelint plugins for [Atom](https://atom.io/packages/linter-stylelint), [Sublime Text](https://github.com/kungfusheep/SublimeLinter-contrib-stylelint), or [others](https://stylelint.io/user-guide/complementary-tools/).

Other good practices that are not encompassed with linters.

- **General**
  - Comment as much as possible without being overly redundant.
- **JS**
  - Use small modules as much as possible.
- **Styles**
  - Use `class`es instead of `id`s for HTML elements, specifically for styling and JS.
  - Use relative units such as `rem`, `em`, `vh`, `vw`, or `%`, instead of absolute values such as `px`. This helps accessibility as well as designing for different screen sizes.
    - Overall, use `rem` for "component" level styling, such as a form, and then use `em` for styling inside components.

## License

Code is licensed under the MIT license included here. Content (such as images, video, audio, copy) can only be reused with express permission by Star Tribune.

## Generated

Generated by [Star Tribune StribLab generator](https://github.com/striblab/generator-striblab).
