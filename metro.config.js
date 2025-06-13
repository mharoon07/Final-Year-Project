const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Increase Metro's memory limit and timeout
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Increase timeout for large bundles (120 seconds)
      res.setTimeout(120000);
      return middleware(req, res, next);
    };
  },
};

// Optimize transformer settings
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Inline requires to reduce bundle size
    },
  }),
  minifierConfig: {
    // Minify the bundle to reduce size
    keep_classnames: false,
    keep_fnames: false,
    mangle: true,
    output: {
      comments: false,
      beautify: false,
    },
  },
};

// Reduce the number of workers to lower memory usage
config.maxWorkers = 2;

// Disable cache to avoid corrupted bundles
config.cacheStores = [];

// Ensure support for large bundles
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx', 'cjs'], // Add support for additional file extensions if needed
};

module.exports = config;