import { createApp } from "./app.js";
import { config, databaseConfigured } from "./config.js";
import { startWorker } from "./services/worker.js";
const server = createApp().listen(config.PORT, () =>
  console.info(
    `Relay API listening on port ${config.PORT}. ${databaseConfigured ? "Live storage configured." : "Preview mode: live storage is not configured."}`,
  ),
);
const stopWorker = databaseConfigured ? startWorker() : () => {};
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopWorker();
    server.close(() => process.exit(0));
  });
