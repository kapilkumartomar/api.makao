const webpack = require('webpack');
const path = require('path');
const { merge } = require('webpack-merge');
const dummyExportFunc = require('./src/util/scripts/pushNotificationDataDownload');

const baseConfig = {
  mode: 'production',
  entry: './src/util/scripts/pushNotificationScript.ts',
  output: {
    path: path.resolve(__dirname, 'public/scripts'),
    filename: 'pushNotificationScript.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

// Merge the base configuration with the fetched data
module.exports = dummyExportFunc().then((PUSH_DATA) => {
  const config = merge(baseConfig, {
    plugins: [
      new webpack.DefinePlugin({
        PUSH_DATA: JSON.stringify(PUSH_DATA),
      }),
    ],
  });

  return config;
});
