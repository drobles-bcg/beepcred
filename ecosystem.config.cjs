module.exports = {
  apps: [
    {
      name: 'beepcred',
      cwd: __dirname,
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
    },
  ],
};
