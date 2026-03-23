#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { startServer } from "./server.js";

const config = loadConfig();
startServer(config).catch((err) => {
  console.error("[bitbucket-mcp] Fatal error:", err);
  process.exit(1);
});
