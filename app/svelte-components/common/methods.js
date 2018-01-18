/**
 * Common, shared methods for Svelte components.
 */

'use strict';

module.exports = {
  // Wrapper around set to call preventDefault
  eventSet: function(e, properties) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    this.set(properties);
  },

  // Geolocate user and set to "store"
  geolocate: function() {
    return new Promise((resolve, reject) => {
      let u = this.get('utils');
      if (u && u.hasGeolocate) {
        this.set({ isGeolocating: true });

        // Check if we have a location, use that, but still update
        let store = this.get('store');
        if (store && store.location && store.location.lat) {
          resolve(store.location);
        }

        // Geolocate
        u.geolocate((error, position) => {
          this.set({ isGeolocating: false });

          if (error) {
            return reject(error);
          }
          else if (position) {
            this.set({ store: { location: position } });
            resolve(position);
          }
        });
      }
    });
  },

  // Distance between two coordinates
  // http://www.geodatasource.com/developers/javascript
  distance: function(lat1, lng1, lat2, lng2, unit = 'miles') {
    let radlat1 = Math.PI * lat1 / 180;
    let radlat2 = Math.PI * lat2 / 180;
    let theta = lng1 - lng2;
    let radtheta = Math.PI * theta / 180;
    let dist =
      Math.sin(radlat1) * Math.sin(radlat2) +
      Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit === 'kilometers') {
      dist = dist * 1.609344;
    }
    if (unit === 'nautical') {
      dist = dist * 0.8684;
    }
    return dist;
  },

  // Go to an element
  goTo: function(id, parent, scrollToOptions) {
    let utils = this.get('utils');
    let el = document.querySelector(`[data-id=${id}]`);

    if (utils && el) {
      utils.goTo(el, parent, scrollToOptions);
    }
  },

  // A basic query router thing
  startQueryRouter: function(fields = [], defaults = {}, url = '') {
    let utils = this.get('utils');

    // Load initial values
    if (utils && utils.query) {
      fields.forEach(f => {
        if (utils.query[f]) {
          this.set({ [f]: utils.query[f] });
        }
      });
    }

    // Change state if data changes
    if (
      this.get('isBrowser') &&
      fields.length &&
      utils &&
      window &&
      window.history
    ) {
      fields.forEach(f => {
        this.observe(
          f,
          (n, o) => {
            if (n !== o) {
              let query = utils.query ? utils.deepClone(utils.query) : {};
              if (n) {
                query[f] = n;
              }
              else {
                delete query[f];
              }

              window.history.pushState(
                query,
                null,
                `${url}?${utils.queryString.stringify(query)}`
              );
            }
          },
          { init: false }
        );
      });
    }

    // Watch for popstate
    if (window && window.history && utils) {
      window.addEventListener('popstate', () => {
        utils.parseQuery();
        let found = {};

        fields.forEach(f => {
          if (utils.query && utils.query[f]) {
            found[f] = utils.query[f];
          }
          else if (defaults && defaults[f]) {
            found[f] = defaults[f];
          }
        });

        this.set(found);
      });
    }
  },

  // Yay ads
  yesToAds: function() {
    let data = this.get('data');

    if (
      !this.__servedAd &&
      data &&
      data.ad &&
      this.get('isBrowser') &&
      window &&
      window.googletag
    ) {
      window.googletag.cmd.push(() => {
        window.googletag.display(data.ad.id);
      });
      this.__servedAd = true;
    }
  }
};
