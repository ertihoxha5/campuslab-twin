export const permissions = Object.freeze({
  PLATFORM_UNIVERSITIES_REVIEW: "platform.universities.review",
  PLATFORM_STATISTICS_VIEW: "platform.statistics.view",
  UNIVERSITY_PROFILE_MANAGE: "university.profile.manage",
  UNIVERSITY_USERS_MANAGE: "university.users.manage",
  LABORATORIES_CREATE: "laboratories.create",
  LABORATORIES_MANAGE: "laboratories.manage",
  LABORATORIES_VIEW: "laboratories.view",
  ASSETS_MANAGE: "assets.manage",
  ASSETS_MAINTAIN: "assets.maintain",
  MONITORING_VIEW: "monitoring.view",
  ALERTS_RESPOND: "alerts.respond",
  ALERTS_REPORT: "alerts.report",
  MAINTENANCE_MANAGE: "maintenance.manage",
  MAINTENANCE_ASSIGNED: "maintenance.assigned",
  SIMULATIONS_RUN: "simulations.run",
  REPORTS_GENERATE: "reports.generate",
  REPORTS_VIEW: "reports.view",
});

const universityAdministratorPermissions = [
  permissions.UNIVERSITY_PROFILE_MANAGE,
  permissions.UNIVERSITY_USERS_MANAGE,
  permissions.LABORATORIES_CREATE,
  permissions.LABORATORIES_MANAGE,
  permissions.LABORATORIES_VIEW,
  permissions.ASSETS_MANAGE,
  permissions.ASSETS_MAINTAIN,
  permissions.MONITORING_VIEW,
  permissions.ALERTS_RESPOND,
  permissions.MAINTENANCE_MANAGE,
  permissions.MAINTENANCE_ASSIGNED,
  permissions.SIMULATIONS_RUN,
  permissions.REPORTS_GENERATE,
  permissions.REPORTS_VIEW,
];

export const rolePermissions = Object.freeze({
  platform_admin: Object.freeze([
    permissions.PLATFORM_UNIVERSITIES_REVIEW,
    permissions.PLATFORM_STATISTICS_VIEW,
  ]),
  university_admin: Object.freeze(universityAdministratorPermissions),
  lab_manager: Object.freeze([
    permissions.LABORATORIES_MANAGE,
    permissions.LABORATORIES_VIEW,
    permissions.ASSETS_MANAGE,
    permissions.ASSETS_MAINTAIN,
    permissions.MONITORING_VIEW,
    permissions.ALERTS_RESPOND,
    permissions.MAINTENANCE_MANAGE,
    permissions.MAINTENANCE_ASSIGNED,
    permissions.SIMULATIONS_RUN,
    permissions.REPORTS_GENERATE,
    permissions.REPORTS_VIEW,
  ]),
  technician: Object.freeze([
    permissions.LABORATORIES_VIEW,
    permissions.ASSETS_MAINTAIN,
    permissions.MONITORING_VIEW,
    permissions.ALERTS_RESPOND,
    permissions.MAINTENANCE_ASSIGNED,
    permissions.REPORTS_VIEW,
  ]),
  academic_staff: Object.freeze([
    permissions.LABORATORIES_VIEW,
    permissions.MONITORING_VIEW,
    permissions.ALERTS_REPORT,
    permissions.SIMULATIONS_RUN,
    permissions.REPORTS_GENERATE,
    permissions.REPORTS_VIEW,
  ]),
  observer: Object.freeze([
    permissions.LABORATORIES_VIEW,
    permissions.MONITORING_VIEW,
    permissions.REPORTS_VIEW,
  ]),
});

export function permissionsForRoles(roles) {
  return [
    ...new Set(roles.flatMap((role) => rolePermissions[role] ?? [])),
  ].sort();
}
