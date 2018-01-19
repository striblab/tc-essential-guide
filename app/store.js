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
