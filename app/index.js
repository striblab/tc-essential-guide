/**
 * Main JS file for project.
 */

// Define globals that are added through the config.json file, here like this:
/* global $ */
'use strict';

// Dependencies
import utilsFn from './utils.js';

// Since we can't do dynamic imports
import Header from './svelte-components/header.html';
import Groups from './svelte-components/groups.html';
import Index from './svelte-components/index.html';
import Lists from './svelte-components/lists.html';
import Items from './svelte-components/items.html';
let components = {
  Header,
  Groups,
  Index,
  Lists,
  Items
};

// Setup utils function
utilsFn({});

// Create components.  Get page data.
let dataFile = $('body').attr('data-page-data');
if (dataFile) {
  window
    .fetch(dataFile)
    .then(response => response.json())
    .then(data => {
      // Make components
      $('[data-component]').each((e, el) => {
        let c = $(el).attr('data-component');
        new components[c]({
          hydrated: true,
          target: el,
          data: { data: data }
        });
      });
    })
    .catch(console.error);
}
