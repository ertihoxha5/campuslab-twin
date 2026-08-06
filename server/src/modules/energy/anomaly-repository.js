import { query } from "../../database/query.js";

export function createEnergyAnomalyRepository(pool) {
  return {
    async generateAnomalyNotifications({ thresholdMultiplier, lookbackMinutes }) {
      const result = await query(
        pool,
        `INSERT INTO notifications (
           university_id, user_id, type, deduplication_key, title, message
         )
         WITH latest_readings AS (
           SELECT reading.university_id, reading.laboratory_id,
                  reading.equipment_id, reading.power_watts,
                  reading.recorded_at,
                  ROW_NUMBER() OVER (
                    PARTITION BY reading.university_id, reading.equipment_id
                    ORDER BY reading.recorded_at DESC, reading.id DESC
                  ) AS rowNumber
           FROM energy_readings reading
           WHERE reading.equipment_id IS NOT NULL
             AND reading.recorded_at >= DATE_SUB(
               UTC_TIMESTAMP(3), INTERVAL ? MINUTE
             )
         ),
         abnormal AS (
           SELECT latest.university_id, latest.laboratory_id,
                  latest.equipment_id, latest.power_watts,
                  latest.recorded_at, equipment.name AS equipment_name,
                  equipment.energy_rating_watts, equipment.responsible_user_id
           FROM latest_readings latest
           INNER JOIN equipment
             ON equipment.id = latest.equipment_id
            AND equipment.university_id = latest.university_id
            AND equipment.deleted_at IS NULL
           WHERE latest.rowNumber = 1
             AND equipment.energy_rating_watts IS NOT NULL
             AND equipment.energy_rating_watts > 0
             AND latest.power_watts > equipment.energy_rating_watts * ?
         ),
         recipients AS (
           SELECT abnormal.university_id, abnormal.equipment_id,
                  abnormal.responsible_user_id AS user_id
           FROM abnormal
           INNER JOIN users responsible
             ON responsible.id = abnormal.responsible_user_id
            AND responsible.university_id = abnormal.university_id
            AND responsible.status = 'active'
            AND responsible.deleted_at IS NULL
           WHERE abnormal.responsible_user_id IS NOT NULL
           UNION
           SELECT abnormal.university_id, abnormal.equipment_id, user.id
           FROM abnormal
           INNER JOIN users user
             ON user.university_id = abnormal.university_id
            AND user.status = 'active' AND user.deleted_at IS NULL
           INNER JOIN user_roles user_role
             ON user_role.user_id = user.id
            AND user_role.university_id = user.university_id
           INNER JOIN roles role
             ON role.id = user_role.role_id AND role.code = 'university_admin'
           UNION
           SELECT abnormal.university_id, abnormal.equipment_id, user.id
           FROM abnormal
           INNER JOIN user_laboratory_assignments assignment
             ON assignment.university_id = abnormal.university_id
            AND assignment.laboratory_id = abnormal.laboratory_id
           INNER JOIN users user
             ON user.id = assignment.user_id
            AND user.university_id = assignment.university_id
            AND user.status = 'active' AND user.deleted_at IS NULL
           INNER JOIN user_roles user_role
             ON user_role.user_id = user.id
            AND user_role.university_id = user.university_id
           INNER JOIN roles role
             ON role.id = user_role.role_id AND role.code = 'lab_manager'
         )
         SELECT abnormal.university_id, recipient.user_id,
                'energy_abnormal',
                CONCAT('energy:', abnormal.equipment_id, ':abnormal:',
                       DATE_FORMAT(abnormal.recorded_at, '%Y%m%d%H')),
                'Konsum jonormal i energjisë',
                CONCAT('Pajisja ', abnormal.equipment_name, ' po konsumon ',
                       ROUND(abnormal.power_watts, 0), ' W, mbi fuqinë nominale ',
                       ROUND(abnormal.energy_rating_watts, 0), ' W.')
         FROM abnormal
         INNER JOIN recipients recipient
           ON recipient.university_id = abnormal.university_id
          AND recipient.equipment_id = abnormal.equipment_id
         ON DUPLICATE KEY UPDATE
           deduplication_key = VALUES(deduplication_key)`,
        [lookbackMinutes, thresholdMultiplier],
      );
      return { affected: Number(result.affectedRows ?? 0) };
    },
  };
}
