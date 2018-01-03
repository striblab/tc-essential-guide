/**
 * Pull out configuration for gulp-repsonse plugin
 * so that we can reference in the application
 */

module.exports = () => {
  let widths = ['300', '600', '900', '1200', '2000'];
  let sizes = [];
  widths.forEach(w => {
    sizes.push({
      width: w,
      rename: { suffix: '-' + w + 'px' }
    });
    sizes.push({
      width: w,
      rename: { suffix: '-' + w + 'px', extname: '.webp' },
      format: 'webp'
    });
  });

  // Add original
  sizes.push({
    rename: { suffix: '-original' }
  });

  return {
    widths: widths,
    sizes: {
      '*': sizes
    },
    options: {
      quality: 75,
      progressive: true,
      withMetadata: false,
      withoutEnlargement: false,
      errorOnEnlargement: false
    }
  };
};
