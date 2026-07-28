import "dotenv/config";
import { createApp } from "./app.js";
import { parseEnvironment } from "./config/env.js";
import {
  checkDatabaseConnection,
  createDatabasePool,
} from "./database/pool.js";

const config = parseEnvironment(process.env);
const databasePool = createDatabasePool(config);
const app = createApp({ clientOrigin: config.CLIENT_ORIGIN });

async function startServer() {
  try {
    await checkDatabaseConnection(databasePool);

    app.listen(config.PORT, () => {
      console.log(`API e CampusLab Twin po punon në portën ${config.PORT}.`);
    });
  } catch (error) {
    console.error(
      "Serveri nuk mund të lidhet me bazën e të dhënave.",
      error.message,
    );
    await databasePool.end();
    process.exitCode = 1;
  }
}

await startServer();
