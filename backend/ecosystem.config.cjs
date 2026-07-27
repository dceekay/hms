module.exports = {
  apps: [
    {
      name: "mds-hms-api",
      cwd: __dirname,
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
