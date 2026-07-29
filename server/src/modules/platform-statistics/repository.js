import { query } from "../../database/query.js";

export function createPlatformStatisticsRepository(pool) {
  return {
    async summary() {
      const rows = await query(
        pool,
        `SELECT
           (SELECT COUNT(*) FROM university_registration_requests
             WHERE status = 'pending') AS pendingRegistrations,
           (SELECT COUNT(*) FROM university_registration_requests
             WHERE status = 'approved') AS approvedRegistrations,
           (SELECT COUNT(*) FROM university_registration_requests
             WHERE status = 'rejected') AS rejectedRegistrations,
           (SELECT COUNT(*) FROM universities
             WHERE status = 'active') AS activeUniversities,
           (SELECT COUNT(*) FROM universities
             WHERE status = 'suspended') AS suspendedUniversities,
           (SELECT COUNT(*) FROM universities
             WHERE institution_type = 'public') AS publicUniversities,
           (SELECT COUNT(*) FROM universities
             WHERE institution_type = 'private') AS privateUniversities,
           (SELECT COUNT(*) FROM users
             WHERE status = 'active' AND deleted_at IS NULL) AS activeUsers,
           (SELECT COUNT(*) FROM laboratories
             WHERE status <> 'archived' AND deleted_at IS NULL) AS laboratories`,
      );
      const summary = rows[0] ?? {};
      return Object.fromEntries(
        Object.entries(summary).map(([key, value]) => [key, Number(value)]),
      );
    },
  };
}
