module.exports = {
  apps: [
    {
      name: 'anchevfilms',
      script: 'server.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      cwd: '/var/www/anchevfilms',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SITE_URL: 'https://anchevfilms.com',
        ADMIN_SECRET_HASH: process.env.ADMIN_SECRET_HASH
      }
    }
  ]
};
