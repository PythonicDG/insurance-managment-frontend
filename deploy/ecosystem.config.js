const path = require("node:path");

const repository = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "insurance-frontend",
      cwd: repository,
      script: path.join(repository, "node_modules", "next", "dist", "bin", "next"),
      args: ["start", "--hostname", "127.0.0.1", "--port", "3000"],
      interpreter: process.execPath,
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      kill_timeout: 10000,
      time: true,
      env: { NODE_ENV: "production" },
    },
  ],
};
