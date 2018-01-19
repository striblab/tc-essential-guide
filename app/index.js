/**
 * Main JS file for project.
 */

// Define globals
/* global $ */
'use strict';

// Dependencies
import utilsFn from './utils.js';
import iosHomescreen from './ios-homescreen.js';
import store from './store.js';

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
let utils = utilsFn({
  useView: false
});

// Attach to store
store.set({ utils: utils });

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
          data: {
            data: data,
            content: window.__startribune
              ? window.__startribune.contentSettings
              : {},
            groups: window.__startribune ? window.__startribune.groups : {},
            utils: utils
          },
          store: store
        });
      });

      // Handle ios homescreen, only when same referrer, or been on the site
      // a few times
      let visits = store.get('visits') ? store.get('visits').count : 0;
      if (
        data &&
        data.dataset &&
        data.dataset === 'index' &&
        (store.get('sameReferrer') || visits > 3)
      ) {
        iosHomescreen(utils);
      }
    })
    .catch(console.error);
}

// Some general handling of spacing for fixed items
function adjustFixedElements() {
  let $header = $('.project-header');
  let $mNav = $('.minor-navigation');

  // Header
  $('.has-header').each((i, el) => {
    $(el).css('padding-top', $header.outerHeight());
  });
  $('.adjust-header').each((i, el) => {
    $(el).css('top', $header.outerHeight());
  });

  // Minor nav
  $('.has-minor-navigation').each((i, el) => {
    $(el).css('padding-top', $mNav.outerHeight());
  });
}
$(document).ready(adjustFixedElements);
