const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          "crypto": require.resolve("crypto-browserify"),
          "stream": require.resolve("stream-browserify"),
          "assert": require.resolve("assert"),
          "https": require.resolve("https-browserify"),
          "os": require.resolve("os-browserify"),
          "url": require.resolve("url"),
          "zlib": false,
          "http": false,
          "net": false,
          "fs": false,
          "tls": false,
          "child_process": false,
        }
      },
      plugins: [
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ]
    }
  }
};
