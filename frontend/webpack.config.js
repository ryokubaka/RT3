const path = require('path');

module.exports = {
  devServer: {
    historyApiFallback: true,
    hot: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost',
        secure: false,
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://localhost',
        secure: false,
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'https://localhost',
        secure: false,
        changeOrigin: true,
      },
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Add any custom middleware here
      return middlewares;
    },
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
    hot: true,
    compress: true,
    client: {
      overlay: false,
      progress: true,
    },
    static: {
      directory: 'public',
    },
    devMiddleware: {
      writeToDisk: false,
    },
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  // Add optimization settings
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  output: {
    publicPath: '/',
  },
}; 