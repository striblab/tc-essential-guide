/**
 * Handle interaction observing, specifically, given a list of items,
 * finding the top one
 */

/* global window, document, _ */
'use strict';

class Observer {
  constructor(options = {}) {
    options.attribute = options.attribute || 'data-id';
    options.visibleThreshold = options.visibleThreshold || 0.85;
    options.onObserve = options.onObserve || function() {};
    options.root = options.root || document.querySelector('document');
    options.forceItem =
      options.forceItem === false || options.forceItem
        ? options.forceItem
        : false;
    this.options = options;

    // Don't do anything if not in browser
    if (!window || !window.IntersectionObserver) {
      return;
    }

    // Make observer
    this.observer = new IntersectionObserver(_.bind(this.onObserve, this), {
      root: _.isElement(this.options.root)
        ? this.options.root
        : document.querySelector(this.options.root),
      threshold: _.map(_.range(0, 25), i => i * 4 / 100)
    });

    // Add elements
    if (_.isArrayLike(this.options.elements)) {
      this.options.elements.forEach(e => {
        this.observer.observe(e);
      });
    }
    else if (_.isElement(this.options.element)) {
      this.observer.observe(this.options.element);
    }
  }

  onObserve(entries) {
    // We only want to highlight one element at a time, so
    // order by the top and which one is most in view.
    let sorted = _.orderBy(
      entries,
      ['intersectionRatio', e => e.boundingClientRect.y],
      ['desc', 'asc']
    );
    if (
      sorted[0].intersectionRatio >= this.options.visibleThreshold ||
      this.options.forceItem
    ) {
      sorted[0].inView = true;
    }

    this.options.onObserve(
      sorted[0].inView
        ? sorted[0].target.getAttribute(this.options.attribute)
        : undefined,
      sorted[0].inView ? sorted[0] : undefined,
      sorted
    );
  }
}

// Export a generator for the class.
module.exports = options => {
  return new Observer(options);
};
