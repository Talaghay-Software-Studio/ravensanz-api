module.exports = {
  apps: [{
    name: 'ravensanz',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    // Restart app if it uses too much CPU or memory
    max_restarts: 10,
    min_uptime: '10s',
    // Error log file path
    error_file: 'logs/err.log',
    // Output log file path
    out_file: 'logs/out.log',
    // Time between automatic restarts
    restart_delay: 4000,
    // Scheduled restart every 6 hours
    cron_restart: '0 */6 * * *'
  }]
} 