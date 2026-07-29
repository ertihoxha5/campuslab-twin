import { createServer } from "node:http";
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
import { createTenantAuthentication } from "./middleware/authenticate-tenant.js";
import { createFileRepository } from "./modules/files/repository.js";
import { createFileService } from "./modules/files/service.js";
import { createLaboratoryAccessRepository } from "./authorization/laboratory-access-repository.js";
import { createRealtimeServer } from "./realtime/create-realtime-server.js";
import { createPlatformAuthentication } from "./middleware/authenticate-platform.js";
import { createPlatformRegistrationRepository } from "./modules/platform-registrations/repository.js";
import { createPlatformRegistrationService } from "./modules/platform-registrations/service.js";
import { createPlatformUniversityRepository } from "./modules/platform-universities/repository.js";
import { createPlatformUniversityService } from "./modules/platform-universities/service.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const databasePool = createDatabasePool(config);
const registrationService = createRegistrationService({
  pool: databasePool,
  logoStorage: createRegistrationLogoStorage(),
});
const authRepository = createAuthRepository(databasePool);
const authService = createAuthService({
  repository: authRepository,
  accessSecret: config.JWT_ACCESS_SECRET,
  accessTokenMinutes: config.ACCESS_TOKEN_MINUTES,
  refreshTokenDays: config.REFRESH_TOKEN_DAYS,
});
const platformAuthRepository = createPlatformAuthRepository(databasePool);
const platformAuthService = createPlatformAuthService({
  repository: platformAuthRepository,
  accessSecret: config.JWT_ACCESS_SECRET,
  accessTokenMinutes: config.ACCESS_TOKEN_MINUTES,
  refreshTokenDays: config.REFRESH_TOKEN_DAYS,
});
const platformAuthentication = createPlatformAuthentication({
  platformAuthRepository,
  accessSecret: config.JWT_ACCESS_SECRET,
});
const platformRegistrationService = createPlatformRegistrationService({
  repository: createPlatformRegistrationRepository(databasePool),
});
const platformUniversityService = createPlatformUniversityService({
  repository: createPlatformUniversityRepository(databasePool),
});
const tenantAuthentication = createTenantAuthentication({
  authRepository,
  accessSecret: config.JWT_ACCESS_SECRET,
});
const laboratoryAccessRepository =
  createLaboratoryAccessRepository(databasePool);
const fileService = createFileService({
  repository: createFileRepository(databasePool),
});
const app = createApp({
  clientOrigin: config.CLIENT_ORIGIN,
  registrationService,
  authService,
  platformAuthService,
  fileService,
  tenantAuthentication,
  platformRegistrationService,
  platformAuthentication,
  platformUniversityService,
  secureCookies: config.NODE_ENV === "production",
});
const httpServer = createServer(app);
createRealtimeServer(httpServer, {
  clientOrigin: config.CLIENT_ORIGIN,
  authRepository,
  accessSecret: config.JWT_ACCESS_SECRET,
  laboratoryAccessRepository,
});

async function startServer() {
  try {
    await checkDatabaseConnection(databasePool);

    httpServer.listen(config.PORT, () => {
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
