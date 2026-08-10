import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createUniversityRegistrationRouter } from "./modules/university-registrations/router.js";
import { createAuthRouter } from "./modules/auth/router.js";
import { createPlatformAuthRouter } from "./modules/platform-auth/router.js";
import { createFileRouter } from "./modules/files/router.js";
import { createPlatformRegistrationRouter } from "./modules/platform-registrations/router.js";
import { createPlatformUniversityRouter } from "./modules/platform-universities/router.js";
import { createPlatformStatisticsRouter } from "./modules/platform-statistics/router.js";
import { createPlatformSettingsRouter } from "./modules/platform-settings/router.js";
import { createPlatformActivityRouter } from "./modules/platform-activity/router.js";
import { createNotificationRouter } from "./modules/notifications/router.js";
import { createDashboardRouter } from "./modules/dashboard/router.js";
import { createLaboratoryRouter } from "./modules/laboratories/router.js";
import { createEquipmentRouter } from "./modules/equipment/router.js";
import { createSensorRouter } from "./modules/sensors/router.js";
import { createSimulatorRouter } from "./modules/simulator/router.js";
import { createAlertRouter } from "./modules/alerts/router.js";
import { createMaintenanceRouter } from "./modules/maintenance/router.js";
import { createEnergyRouter } from "./modules/energy/router.js";
import { createAnalyticsRouter } from "./modules/analytics/router.js";
import { createReportRouter } from "./modules/reports/router.js";
import { createUniversityUserRouter } from "./modules/university-users/router.js";
import { createRequestLogger } from "./middleware/request-logger.js";
import { success } from "./utils/api-response.js";

export function createApp({
  clientOrigin = "http://localhost:5173",
  logging = process.env.NODE_ENV !== "test",
  rateLimitEnabled = process.env.NODE_ENV !== "test",
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
  simulatorService,
  alertService,
  maintenanceService,
  maintenanceEvidenceService,
  energyService,
  analyticsService,
  reportService,
  universityUserService,
  platformRegistrationService,
  platformAuthentication,
  platformUniversityService,
  platformStatisticsRepository,
  platformSettingsService,
  platformActivityService,
  secureCookies = process.env.NODE_ENV === "production",
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(createRequestLogger({ enabled: logging }));
  app.use(helmet());
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: rateLimitEnabled ? 300 : Number.MAX_SAFE_INTEGER,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message:
            "Keni bërë shumë kërkesa. Ju lutemi provoni përsëri pas pak.",
        },
      },
    }),
  );

  app.get("/api/health", (_request, response) => {
    return success(response, {
      data: {
        service: "campuslab-twin-api",
        status: "healthy",
      },
    });
  });

  if (registrationService) {
    app.use(
      "/api/public",
      createUniversityRegistrationRouter({ registrationService }),
    );
  }

  if (authService) {
    app.use("/api/auth", createAuthRouter({ authService, secureCookies }));
  }

  if (platformAuthService) {
    app.use(
      "/api/platform/auth",
      createPlatformAuthRouter({ platformAuthService, secureCookies }),
    );
  }

  if (fileService && tenantAuthentication) {
    app.use(
      "/api/files",
      createFileRouter({
        fileService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (notificationService && tenantAuthentication) {
    app.use(
      "/api/notifications",
      createNotificationRouter({
        service: notificationService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (dashboardService && tenantAuthentication) {
    app.use(
      "/api/dashboard",
      createDashboardRouter({
        service: dashboardService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (laboratoryService && tenantAuthentication) {
    app.use(
      "/api/laboratories",
      createLaboratoryRouter({
        service: laboratoryService,
        zoneService: laboratoryZoneService,
        modelService: laboratoryModelService,
        authenticateTenant: tenantAuthentication,
        laboratoryAccessRepository,
      }),
    );
  }

  if (equipmentService && tenantAuthentication) {
    app.use(
      "/api/equipment",
      createEquipmentRouter({
        service: equipmentService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (sensorService && tenantAuthentication) {
    app.use(
      "/api/sensors",
      createSensorRouter({
        service: sensorService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (simulatorService && tenantAuthentication) {
    app.use(
      "/api/simulator",
      createSimulatorRouter({
        service: simulatorService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (alertService && tenantAuthentication) {
    app.use(
      "/api/alerts",
      createAlertRouter({
        service: alertService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (maintenanceService && tenantAuthentication) {
    app.use(
      "/api/maintenance",
      createMaintenanceRouter({
        service: maintenanceService,
        evidenceService: maintenanceEvidenceService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (energyService && tenantAuthentication) {
    app.use(
      "/api/energy",
      createEnergyRouter({
        service: energyService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (analyticsService && tenantAuthentication) {
    app.use(
      "/api/analytics",
      createAnalyticsRouter({
        service: analyticsService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (reportService && tenantAuthentication) {
    app.use(
      "/api/reports",
      createReportRouter({
        service: reportService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (universityUserService && tenantAuthentication) {
    app.use(
      "/api/university/users",
      createUniversityUserRouter({
        service: universityUserService,
        authenticateTenant: tenantAuthentication,
      }),
    );
  }

  if (platformRegistrationService && platformAuthentication) {
    app.use(
      "/api/platform/registration-requests",
      createPlatformRegistrationRouter({
        service: platformRegistrationService,
        authenticatePlatform: platformAuthentication,
      }),
    );
  }

  if (platformUniversityService && platformAuthentication) {
    app.use(
      "/api/platform/universities",
      createPlatformUniversityRouter({
        service: platformUniversityService,
        authenticatePlatform: platformAuthentication,
      }),
    );
  }

  if (platformStatisticsRepository && platformAuthentication) {
    app.use(
      "/api/platform/statistics",
      createPlatformStatisticsRouter({
        repository: platformStatisticsRepository,
        authenticatePlatform: platformAuthentication,
      }),
    );
  }

  if (platformSettingsService && platformAuthentication) {
    app.use(
      "/api/platform/settings",
      createPlatformSettingsRouter({
        service: platformSettingsService,
        authenticatePlatform: platformAuthentication,
      }),
    );
  }

  if (platformActivityService && platformAuthentication) {
    app.use(
      "/api/platform/activity",
      createPlatformActivityRouter({
        service: platformActivityService,
        authenticatePlatform: platformAuthentication,
      }),
    );
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
