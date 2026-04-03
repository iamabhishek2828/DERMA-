// craco.config.js
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util/"),
        "zlib": require.resolve("browserify-zlib"),
        "url": require.resolve("url/"),
        "assert": require.resolve("assert/")
      };

      // Suppress source map warnings from MediaPipe
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules\/@mediapipe\/tasks-vision/,
          message: /Failed to parse source map/,
        },
      ];

      // Disable source map loading for MediaPipe packages
      webpackConfig.module.rules.push({
        test: /node_modules\/@mediapipe.*\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        exclude: /node_modules\/@mediapipe/
      });

      return webpackConfig;
    },
  },
};
