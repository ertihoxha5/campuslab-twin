# Referenca REST API

Base URL lokale është `http://localhost:3000`. Të gjitha përgjigjet JSON përdorin
njërën nga format:

```json
{ "success": true, "data": {}, "meta": {} }
```

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} }
}
```

Klienti dërgon cookie-t me `credentials: "include"`. `Tenant` nënkupton sesion
universiteti; `Platform` nënkupton sesion të administratorit të platformës.
Parametrat `:id` nuk autorizojnë vetë burimin: serveri kontrollon gjithmonë
tenant-in, permission-in dhe, kur kërkohet, caktimin në laborator.

## Bruno collection

Collection-i i ekzekutueshëm gjendet te [`bruno/`](../bruno/README.md). Ai
përmban environment lokal, cookie-based login, teste për endpoint-et kryesore,
kontrolle pozitive/negative për rolet dhe testin `404` të izolimit cross-tenant.
Hapni dosjen `bruno/` në Bruno Desktop dhe zgjidhni environment-in `local`.

## Sistem dhe regjistrim publik

| Metoda | Endpoint-i                             | Qasja  | Qëllimi                                       |
| ------ | -------------------------------------- | ------ | --------------------------------------------- |
| GET    | `/api/health`                          | Publik | Gjendja e API-së                              |
| POST   | `/api/public/university-registrations` | Publik | Kërkesë multipart për regjistrim universiteti |

## Autentikimi tenant

| Metoda | Endpoint-i                  | Qëllimi                                      |
| ------ | --------------------------- | -------------------------------------------- |
| POST   | `/api/auth/login`           | Hyrje dhe vendosje e access/refresh cookies  |
| POST   | `/api/auth/refresh`         | Rrotullim i refresh token-it                 |
| POST   | `/api/auth/session`         | Rikthim i sigurt i sesionit ose `user: null` |
| GET    | `/api/auth/me`              | Përdoruesi aktual                            |
| POST   | `/api/auth/logout`          | Revokim dhe pastrim cookies                  |
| POST   | `/api/auth/forgot-password` | Kërkesë rikuperimi me përgjigje jo-zbuluese  |
| POST   | `/api/auth/reset-password`  | Ndryshim me token njëpërdorimësh             |

## Autentikimi i platformës

| Metoda | Endpoint-i                   | Qëllimi                             |
| ------ | ---------------------------- | ----------------------------------- |
| POST   | `/api/platform/auth/login`   | Hyrje në administrimin e platformës |
| POST   | `/api/platform/auth/refresh` | Rrotullim i token-it të platformës  |
| POST   | `/api/platform/auth/session` | Rikthim i sesionit të platformës    |
| GET    | `/api/platform/auth/me`      | Administratori aktual               |
| POST   | `/api/platform/auth/logout`  | Revokim i sesionit të platformës    |

## Administrimi i platformës

| Metoda | Endpoint-i                                                | Permission-i                   | Qëllimi                     |
| ------ | --------------------------------------------------------- | ------------------------------ | --------------------------- |
| GET    | `/api/platform/registration-requests`                     | `platform.universities.review` | Lista e kërkesave           |
| GET    | `/api/platform/registration-requests/:requestId`          | `platform.universities.review` | Detajet e kërkesës          |
| PATCH  | `/api/platform/registration-requests/:requestId/decision` | `platform.universities.review` | Miratim ose refuzim         |
| GET    | `/api/platform/universities`                              | `platform.universities.review` | Lista e universiteteve      |
| PATCH  | `/api/platform/universities/:universityId/status`         | `platform.universities.review` | Aktivizim ose pezullim      |
| GET    | `/api/platform/statistics/summary`                        | `platform.statistics.view`     | Agregatet e platformës      |
| GET    | `/api/platform/settings`                                  | `platform.settings.manage`     | Politikat e regjistrimit    |
| PUT    | `/api/platform/settings`                                  | `platform.settings.manage`     | Përditësim politikash       |
| POST   | `/api/platform/settings/email-exceptions`                 | `platform.settings.manage`     | Përjashtim domain-i testues |
| DELETE | `/api/platform/settings/email-exceptions/:exceptionId`    | `platform.settings.manage`     | Heqje përjashtimi           |
| GET    | `/api/platform/activity`                                  | `platform.audit.view`          | Historiku i auditit         |

## Dashboard, njoftime dhe skedarë

| Metoda | Endpoint-i                                | Permission-i      | Qëllimi                                     |
| ------ | ----------------------------------------- | ----------------- | ------------------------------------------- |
| GET    | `/api/dashboard/summary`                  | `monitoring.view` | Përmbledhja operative dhe trendi energjetik |
| GET    | `/api/notifications`                      | Tenant            | Njoftimet e përdoruesit                     |
| PATCH  | `/api/notifications/:notificationId/read` | Tenant            | Shënon një njoftim si të lexuar             |
| PATCH  | `/api/notifications/read-all`             | Tenant            | Shënon të gjitha si të lexuara              |
| GET    | `/api/files/:fileId`                      | Tenant + pronësi  | Shkarkim skedari privat                     |

## Laboratorët dhe zonat 3D

| Metoda | Endpoint-i                                      | Permission-i          | Qëllimi                               |
| ------ | ----------------------------------------------- | --------------------- | ------------------------------------- |
| GET    | `/api/laboratories`                             | `laboratories.view`   | Listë, kërkim, filtrim dhe pagination |
| POST   | `/api/laboratories`                             | `laboratories.create` | Krijim laboratori                     |
| GET    | `/api/laboratories/archived`                    | `laboratories.create` | Lista e arkivit                       |
| GET    | `/api/laboratories/responsible-users`           | `laboratories.manage` | Kandidatët përgjegjës                 |
| PATCH  | `/api/laboratories/:laboratoryId/restore`       | `laboratories.create` | Rikthim nga arkivi                    |
| GET    | `/api/laboratories/:laboratoryId`               | `laboratories.view`   | Detajet dhe metadata e modelit        |
| PUT    | `/api/laboratories/:laboratoryId`               | `laboratories.manage` | Përditësim laboratori                 |
| DELETE | `/api/laboratories/:laboratoryId`               | `laboratories.create` | Arkivim logjik                        |
| POST   | `/api/laboratories/:laboratoryId/model`         | `laboratories.manage` | Upload JPG/PNG/WebP/GLB/GLTF          |
| GET    | `/api/laboratories/:laboratoryId/model`         | `laboratories.view`   | Hapje e modelit privat                |
| DELETE | `/api/laboratories/:laboratoryId/model`         | `laboratories.manage` | Heqje modeli                          |
| GET    | `/api/laboratories/:laboratoryId/zones`         | `laboratories.view`   | Zonat e skenës 3D                     |
| POST   | `/api/laboratories/:laboratoryId/zones`         | `laboratories.manage` | Krijim zone                           |
| PUT    | `/api/laboratories/:laboratoryId/zones/:zoneId` | `laboratories.manage` | Përditësim zone                       |
| DELETE | `/api/laboratories/:laboratoryId/zones/:zoneId` | `laboratories.manage` | Fshirje zone                          |

## Pajisjet dhe sensorët

| Metoda | Endpoint-i                            | Permission-i        | Qëllimi                        |
| ------ | ------------------------------------- | ------------------- | ------------------------------ |
| GET    | `/api/equipment`                      | `laboratories.view` | Lista e pajisjeve              |
| POST   | `/api/equipment`                      | `assets.manage`     | Krijim pajisjeje               |
| GET    | `/api/equipment/options`              | `assets.manage`     | Relacionet për formular        |
| GET    | `/api/equipment/:equipmentId`         | `laboratories.view` | Detajet e pajisjes             |
| PUT    | `/api/equipment/:equipmentId`         | `assets.manage`     | Përditësim pajisjeje           |
| DELETE | `/api/equipment/:equipmentId`         | `assets.manage`     | Arkivim pajisjeje              |
| GET    | `/api/sensors`                        | `laboratories.view` | Lista e sensorëve              |
| GET    | `/api/sensors/options`                | `assets.manage`     | Relacionet për formular        |
| POST   | `/api/sensors`                        | `assets.manage`     | Krijim sensori dhe vendosje 3D |
| GET    | `/api/sensors/:sensorId`              | `laboratories.view` | Detajet dhe pragjet            |
| PUT    | `/api/sensors/:sensorId`              | `assets.manage`     | Përditësim sensori             |
| DELETE | `/api/sensors/:sensorId`              | `assets.manage`     | Arkivim sensori                |
| GET    | `/api/sensors/:sensorId/calibrations` | `laboratories.view` | Historiku i kalibrimit         |
| POST   | `/api/sensors/:sensorId/calibrations` | `assets.manage`     | Regjistrim kalibrimi           |

## Monitorimi, energjia dhe analitika

| Metoda | Endpoint-i                    | Permission-i                | Qëllimi                                    |
| ------ | ----------------------------- | --------------------------- | ------------------------------------------ |
| GET    | `/api/alerts`                 | `monitoring.view`           | Lista e alarmeve aktive/historike          |
| GET    | `/api/alerts/:alertId`        | `monitoring.view`           | Detajet dhe historiku                      |
| PATCH  | `/api/alerts/:alertId/status` | `alerts.respond`            | Kalimi në statusin pasues                  |
| GET    | `/api/energy/overview`        | `monitoring.view`           | Konsumi, kostoja dhe provenance            |
| GET    | `/api/energy/settings`        | `university.profile.manage` | Tarifa dhe valuta                          |
| PUT    | `/api/energy/settings`        | `university.profile.manage` | Përditësim tarife                          |
| GET    | `/api/analytics/history`      | `reports.view`              | Seri kohore e agreguar, maksimumi 400 pika |

## Simulimet

Të gjitha endpoint-et kërkojnë `simulations.run`.

| Metoda | Endpoint-i                                              | Qëllimi                          |
| ------ | ------------------------------------------------------- | -------------------------------- |
| GET    | `/api/simulator/laboratories/:laboratoryId/status`      | Gjendja aktuale                  |
| GET    | `/api/simulator/laboratories/:laboratoryId/scenarios`   | Katalogu i skenarëve             |
| GET    | `/api/simulator/laboratories/:laboratoryId/runs`        | Historiku i ekzekutimeve         |
| GET    | `/api/simulator/laboratories/:laboratoryId/runs/:runId` | Timeline i pandryshueshëm        |
| POST   | `/api/simulator/laboratories/:laboratoryId/preview`     | Preview determinist pa persistim |
| POST   | `/api/simulator/laboratories/:laboratoryId/start`       | Nis simulim ose skenar           |
| POST   | `/api/simulator/laboratories/:laboratoryId/pause`       | Pezullim                         |
| POST   | `/api/simulator/laboratories/:laboratoryId/resume`      | Rifillim                         |
| POST   | `/api/simulator/laboratories/:laboratoryId/stop`        | Ndalim                           |
| POST   | `/api/simulator/laboratories/:laboratoryId/reset`       | Rikthim i baseline-it            |

## Mirëmbajtja

| Metoda | Endpoint-i                          | Permission-i           | Qëllimi                         |
| ------ | ----------------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/maintenance`                  | `maintenance.assigned` | Lista sipas rolit/caktimit      |
| POST   | `/api/maintenance`                  | `maintenance.manage`   | Planifikim detyre               |
| GET    | `/api/maintenance/options`          | `maintenance.manage`   | Pajisje dhe teknikë të vlefshëm |
| GET    | `/api/maintenance/:taskId`          | `maintenance.assigned` | Detaje dhe histori              |
| PATCH  | `/api/maintenance/:taskId/status`   | `maintenance.assigned` | Kalim statusi dhe checklist     |
| GET    | `/api/maintenance/:taskId/evidence` | `maintenance.assigned` | Lista e evidencave              |
| POST   | `/api/maintenance/:taskId/evidence` | `maintenance.assigned` | Upload evidence multipart       |

## Raportet

| Metoda | Endpoint-i                        | Permission-i       | Qëllimi               |
| ------ | --------------------------------- | ------------------ | --------------------- |
| GET    | `/api/reports`                    | `reports.view`     | Historiku i raporteve |
| POST   | `/api/reports`                    | `reports.generate` | Gjenerim PDF ose CSV  |
| GET    | `/api/reports/:reportId/download` | `reports.view`     | Shkarkim privat       |

## Universiteti, përdoruesit dhe llogaria

| Metoda | Endpoint-i                             | Permission-i                | Qëllimi                     |
| ------ | -------------------------------------- | --------------------------- | --------------------------- |
| GET    | `/api/university/users`                | `university.users.manage`   | Lista e përdoruesve         |
| GET    | `/api/university/users/options`        | `university.users.manage`   | Rolet dhe laboratorët       |
| GET    | `/api/university/users/:userId`        | `university.users.manage`   | Profili dhe aktiviteti      |
| POST   | `/api/university/users`                | `university.users.manage`   | Krijim përdoruesi           |
| PUT    | `/api/university/users/:userId`        | `university.users.manage`   | Përditësim rolesh/caktimesh |
| PATCH  | `/api/university/users/:userId/status` | `university.users.manage`   | Aktivizim/çaktivizim        |
| GET    | `/api/university/profile`              | `university.profile.manage` | Profili institucional       |
| PUT    | `/api/university/profile`              | `university.profile.manage` | Përditësim profili          |
| POST   | `/api/university/profile/logo`         | `university.profile.manage` | Upload logoje               |
| GET    | `/api/university/settings`             | `university.profile.manage` | Preferencat operative       |
| PUT    | `/api/university/settings`             | `university.profile.manage` | Përditësim preferencash     |
| GET    | `/api/account`                         | Tenant                      | Profili personal            |
| PUT    | `/api/account`                         | Tenant                      | Përditësim profili personal |
| PUT    | `/api/account/password`                | Tenant                      | Ndryshim fjalëkalimi        |
