/**
 * Common, shared methods for Svelte components.
 */

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
  }
};
