/**
 * Store/state component to use in other components
 */

// Define globals
/* global $, _ */
'use strict';

// Dependencies
import { Store } from 'svelte/store.js';
import methods from './svelte-components/common/methods.js';

// Create custom class for methods
class AppStore extends Store {
  constructor() {
    super(...arguments);

    // Setup offline
    this.offlineWatching();

    // Once utils are add
    this.observe('utils', () => {
      this.trackVisits();
    });

    // Referrer
    this.set({
      sameReferrer:
        document.referrer &&
        window.location &&
        window.location.hostname &&
        !!~document.referrer.indexOf(window.location.hostname)
    });
  }

  // Watch offline events, be conservative
  offlineWatching() {
    if (window.navigator) {
      if (_.isBoolean(window.navigator.onLine)) {
        this.set({ offline: !window.navigator.onLine });
        $('body').toggleClass('offline', !window.navigator.onLine);
      }

      window.addEventListener('load', () => {
        window.addEventListener('online', () => {
          this.set({ offline: false });
          $('body').toggleClass('offline', false);
        });
        window.addEventListener('offline', () => {
          this.set({ offline: true });
          $('body').toggleClass('offline', true);
        });
      });
    }
  }

  // Track visits to alter interface
  trackVisits() {
    let utils = this.get('utils');
    let visits = this.get('visits');

    // Don't need to do more than once.
    if (!utils || visits) {
      return;
    }

    if (utils && utils.checkLocalStorage()) {
      let visitCount = window.localStorage.getItem('tc-guide-visit-count');
      visitCount = visitCount ? parseInt(visitCount, 10) : 0;
      visitCount = visitCount + 1;
      visits = {};

      // Arbitrary points
      if (visitCount > 2) {
        visits.repeat = true;
      }
      else if (visitCount > 50) {
        visitCount = 0;
      }

      // Add to store
      visits.count = visitCount;
      this.set({ visits: visits });

      // Save
      window.localStorage.setItem('tc-guide-visit-count', visitCount);
    }
  }

  // Geolocate user
  geolocate() {
    return _.bind(methods.geolocate, this)(...arguments);
  }
}

// Create our store
let store = new AppStore({
  error: false,
  errorMessage: null,
  location: null,
  offline: false,
  isBrowser: typeof window !== 'undefined' && !!window
});

// Debug
if (window) {
  window.__store = store;
}

module.exports = store;
