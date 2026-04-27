module.exports = {
  apps: [
    {
      name: "heatmap",
      cwd: "/var/www/heatmap-tracker/server",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        // Comma-separated list of allowed origins (your landing pages):
        // ALLOWED_ORIGINS: "https://site1.com,https://site2.com"
      }
    }
  ]
};
