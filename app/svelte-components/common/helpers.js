/**
 * Common/share helpers for Svelte components
 *
 * Note that computed methods can't be variables and have to be
 * defined in the component, but we want to share some, so
 * we make them helpers.
 */

module.exports = {
  // Create image srcset.
  srcset: function(basePath, imagePath, extension) {
    let p = basePath + '/' + imagePath;

    return ['300', '600', '900', '1200', '2000']
      .map(w => {
        return `${p
          .replace(/\.([a-z]+$)/i, '-' + w + 'px.$1')
          .replace(/\.([a-z]+$)/i, extension ? '.' + extension : '.$1')} ${w}w`;
      })
      .join(', ');
  },

  // Escape HTML, specifically for fields where we sometimes want HTML {{{ }}}
  // and sometimes don't.
  escapeHTML: function(input) {
    return input ? input.replace(/(<([^>]+)>)/gi, '') : '';
  },

  // Does data have a full byline or not
  fullByline: function(data) {
    return data && data.byline && ~data.byline.indexOf('•');
  },

  // URL for directions via Google.  TODO: Is there a way to specify
  // the position and a name?
  // https://developers.google.com/maps/documentation/urls/guide#directions-action
  directionsURL: function(data, store) {
    let location =
      store && store.location && store.location.position
        ? store.location.position.lat + ',' + store.location.position.lng
        : undefined;
    return `https://www.google.com/maps/dir/?api=1${
      location ? '&origin=' + encodeURIComponent(location) : ''
    }&destination=${encodeURIComponent(data.latitude)},${encodeURIComponent(
      data.longitude
    )}`;
  },

  // URL for facebook link
  facebookURL: function(data) {
    if (!data) {
      return '';
    }

    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      data.baseURL
    )}`;
  },

  // URL for twitter link
  twitterURL: function(data, content) {
    if (!data && !content) {
      return '';
    }

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      data.twitterShare || content.twitterShare
    )}&url=${encodeURIComponent(data.baseURL)}&via=${encodeURIComponent(
      content.twitterAccount
    )}`;
  },

  // URL for email link
  emailURL: function(data, content) {
    if (!data && !content) {
      return '';
    }

    return `mailto:RECIPIENT?subject=${encodeURIComponent(
      data.emailShare || content.emailShare
    )}&body=${encodeURIComponent(data.baseURL)}`;
  },

  phoneURL: function(phone) {
    return phone ? `tel:${phone.replace(/[^0-9]+/g, '')}` : '';
  },

  urlLink: function(url) {
    return url ? (url.match(/^http/i) ? url : `http://${url}`) : '';
  },

  urlText: function(url) {
    return url
      ? url
        .replace(/^https?:\/\//i, '')
        .replace(/www\./i, '')
        .replace(/\/$/, '')
      : '';
  }
};
