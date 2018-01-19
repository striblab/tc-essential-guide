/**
 * Add to home screen is handled differently on platforms, on iOS, there
 * is no API of sorts, so we point to the action for that
 */

/* global $ */
'use strict';

module.exports = (utils, diff, hideAfter = 15000, delayShow = 3000) => {
  if (!utils) {
    return;
  }
  else if (utils.query && utils.query.homescreen) {
    // Keep going
  }
  else if (!utils.checkIOS()) {
    return;
  }
  else if (
    window.navigator &&
    'standalone' in window.navigator &&
    window.navigator.standalone
  ) {
    // Check that we are not in "web app" standalone
    return;
  }

  // Since we don't want to do this unless we can track how
  // often it happens, then we need to check storage capabilities
  if (!utils.checkLocalStorage()) {
    return;
  }

  // Check last time
  let lastTime = window.localStorage.getItem('ios-homescreen-seen');
  lastTime = lastTime ? parseInt(lastTime, 10) : 0;

  // Current time
  let now = new Date().getTime();

  // Default difference (3 days)
  diff = diff || 1000 * 60 * 60 * 24 * 3;

  // Check differenence
  if (
    !lastTime ||
    now - lastTime > diff ||
    (utils.query && utils.query.homescreen)
  ) {
    setTimeout(() => {
      let $note = $('.ios-homescreen');

      // Save new time
      window.localStorage.setItem('ios-homescreen-seen', now);

      // Show
      $note.addClass('show');

      // Allow to close
      $note.find('.close').on('click', e => {
        e.preventDefault();
        $note.removeClass('show');
      });

      // Hide after a certain amount of time
      setTimeout(() => {
        $note.removeClass('show');
      }, hideAfter);
    }, delayShow || 0);
  }
};
