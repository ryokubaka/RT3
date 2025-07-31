module.exports = {
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    },
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.API_URL || 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
    allowedHosts: 'all',
    host: '0.0.0.0',
    port: 3000,
  },
}; 