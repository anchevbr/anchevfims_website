module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'anchevfilms',
      script: 'server.js',
      interpreter: 'node',
      interpreter_args: '--env-file-if-exists=.env',
      cwd: process.env.RELEASE_DIR || __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        HOST: '127.0.0.1',
        ...(process.env.SITE_URL ? { SITE_URL: process.env.SITE_URL } : {}),
        ...(process.env.SESSION_SECRET ? { SESSION_SECRET: process.env.SESSION_SECRET } : {}),
        ...(process.env.MFA_ENCRYPTION_KEY ? { MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY } : {}),
        ...(process.env.TRUST_PROXY ? { TRUST_PROXY: process.env.TRUST_PROXY } : {}),
        ...(process.env.DATA_DIR ? { DATA_DIR: process.env.DATA_DIR } : {}),
        ...(process.env.UPLOADS_DIR ? { UPLOADS_DIR: process.env.UPLOADS_DIR } : {}),
        RELEASE_VERSION: process.env.RELEASE_VERSION || 'manual'
      }
    }
  ]
};
