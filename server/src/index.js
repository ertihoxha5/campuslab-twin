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
import { createPlatformStatisticsRepository } from "./modules/platform-statistics/repository.js";
import { createPlatformSettingsRepository } from "./modules/platform-settings/repository.js";
import { createPlatformSettingsService } from "./modules/platform-settings/service.js";
import { createPlatformActivityRepository } from "./modules/platform-activity/repository.js";
import { createPlatformActivityService } from "./modules/platform-activity/service.js";
import { createNotificationRepository } from "./modules/notifications/repository.js";
import { createNotificationService } from "./modules/notifications/service.js";
import { createDashboardRepository } from "./modules/dashboard/repository.js";
import { createDashboardService } from "./modules/dashboard/service.js";
import { createLaboratoryRepository } from "./modules/laboratories/repository.js";
import { createLaboratoryService } from "./modules/laboratories/service.js";
import { createLaboratoryZoneRepository } from "./modules/laboratories/zone-repository.js";
import { createLaboratoryZoneService } from "./modules/laboratories/zone-service.js";
import { createLaboratoryModelRepository } from "./modules/laboratories/model-repository.js";
import { createLaboratoryModelService } from "./modules/laboratories/model-service.js";
import { createLaboratoryModelStorage } from "./storage/laboratory-model-storage.js";
import { createEquipmentRepository } from "./modules/equipment/repository.js";
import { createEquipmentService } from "./modules/equipment/service.js";
import { createSensorRepository } from "./modules/sensors/repository.js";
import { createSensorService } from "./modules/sensors/service.js";

loadEnvironmentFile();

const config = parseEnvironment(process.env);
const databasePool = createDatabasePool(config);
const platformSettingsRepository =
  createPlatformSettingsRepository(databasePool);
const registrationService = createRegistrationService({
  pool: databasePool,
  logoStorage: createRegistrationLogoStorage(),
  registrationPolicyProvider: () =>
    platformSettingsRepository.getRegistrationPolicy(),
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
const platformStatisticsRepository =
  createPlatformStatisticsRepository(databasePool);
const platformSettingsService = createPlatformSettingsService({
  repository: platformSettingsRepository,
});
const platformActivityService = createPlatformActivityService({
  repository: createPlatformActivityRepository(databasePool),
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
const notificationService = createNotificationService({
  repository: createNotificationRepository(databasePool),
});
const dashboardService = createDashboardService({
  repository: createDashboardRepository(databasePool),
});
const laboratoryService = createLaboratoryService({
  repository: createLaboratoryRepository(databasePool),
});
const laboratoryZoneService = createLaboratoryZoneService({
  repository: createLaboratoryZoneRepository(databasePool),
});
const laboratoryModelService = createLaboratoryModelService({
  repository: createLaboratoryModelRepository(databasePool),
  storage: createLaboratoryModelStorage(),
});
const equipmentService = createEquipmentService({
  repository: createEquipmentRepository(databasePool),
});
const sensorService = createSensorService({
  repository: createSensorRepository(databasePool),
});
const app = createApp({
  clientOrigin: config.CLIENT_ORIGIN,
  registrationService,
  authService,
  platformAuthService,
  fileService,
  tenantAuthentication,
  notificationService,
  dashboardService,
  laboratoryService,
  laboratoryZoneService,
  laboratoryModelService,
  laboratoryAccessRepository,
  equipmentService,
  sensorService,
  platformRegistrationService,
  platformAuthentication,
  platformUniversityService,
  platformStatisticsRepository,
  platformSettingsService,
  platformActivityService,
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
