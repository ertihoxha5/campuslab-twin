import { createApp } from "./app.js";
import { parseEnvironment } from "./config/env.js";
import { loadEnvironmentFile } from "./config/load-environment.js";
import {
  checkDatabaseConnection,
  createDatabasePool,
} from "./database/pool.js";
import { createRegistrationService } from "./modules/university-registrations/service.js";
import { createAuthRepository } from "./modules/auth/repository.js";
import { createAuthService } from "./modules/auth/service.js";
import { createPlatformAuthRepository } from "./modules/platform-auth/repository.js";
import { createPlatformAuthService } from "./modules/platform-auth/service.js";
import { createRegistrationLogoStorage } from "./storage/registration-logo-storage.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const databasePool = createDatabasePool(config);
const registrationService = createRegistrationService({
  pool: databasePool,
  logoStorage: createRegistrationLogoStorage(),
});
const authService = createAuthService({
  repository: createAuthRepository(databasePool),
  accessSecret: config.JWT_ACCESS_SECRET,
  accessTokenMinutes: config.ACCESS_TOKEN_MINUTES,
  refreshTokenDays: config.REFRESH_TOKEN_DAYS,
});
const platformAuthService = createPlatformAuthService({
  repository: createPlatformAuthRepository(databasePool),
  accessSecret: config.JWT_ACCESS_SECRET,
  accessTokenMinutes: config.ACCESS_TOKEN_MINUTES,
  refreshTokenDays: config.REFRESH_TOKEN_DAYS,
});
const app = createApp({
  clientOrigin: config.CLIENT_ORIGIN,
  registrationService,
  authService,
  platformAuthService,
  secureCookies: config.NODE_ENV === "production",
});

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
