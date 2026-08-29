module.exports = {
  apps: [
    {
      name: 'hari-pushp-backend',
      script: './server.js',
      cwd: '/var/www/hms.haripushphostel.in/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 9000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9000
      },
      error_file: '/var/log/pm2/hari-pushp-error.log',
      out_file: '/var/log/pm2/hari-pushp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
