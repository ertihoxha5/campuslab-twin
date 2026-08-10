import { query, withTransaction } from "../../database/query.js";

const selectSettings = `
  SELECT temperature_min_c AS temperatureMinC,
         temperature_max_c AS temperatureMaxC,
         humidity_min_percent AS humidityMinPercent,
         humidity_max_percent AS humidityMaxPercent,
         co2_max_ppm AS co2MaxPpm,
         smoke_max_percent AS smokeMaxPercent,
         maintenance_reminder_days AS maintenanceReminderDays,
         notify_alerts AS notifyAlerts,
         notify_maintenance AS notifyMaintenance,
         notify_energy AS notifyEnergy,
         notify_simulations AS notifySimulations,
         simulation_duration_minutes AS simulationDurationMinutes,
         simulation_tick_seconds AS simulationTickSeconds,
         updated_at AS updatedAt
    FROM university_preferences WHERE university_id = ?`;

export function createUniversitySettingsRepository(pool) {
  return {
    async get(universityId) {
      const rows = await query(pool, selectSettings, [universityId]);
      return rows[0] ?? null;
    },
    async update(input) {
      return withTransaction(pool, async (connection) => {
        await query(
          connection,
          `INSERT INTO university_preferences (
             university_id, temperature_min_c, temperature_max_c,
             humidity_min_percent, humidity_max_percent, co2_max_ppm,
             smoke_max_percent, maintenance_reminder_days,
             notify_alerts, notify_maintenance, notify_energy,
             notify_simulations, simulation_duration_minutes,
             simulation_tick_seconds, updated_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             temperature_min_c = VALUES(temperature_min_c),
             temperature_max_c = VALUES(temperature_max_c),
             humidity_min_percent = VALUES(humidity_min_percent),
             humidity_max_percent = VALUES(humidity_max_percent),
             co2_max_ppm = VALUES(co2_max_ppm),
             smoke_max_percent = VALUES(smoke_max_percent),
             maintenance_reminder_days = VALUES(maintenance_reminder_days),
             notify_alerts = VALUES(notify_alerts),
             notify_maintenance = VALUES(notify_maintenance),
             notify_energy = VALUES(notify_energy),
             notify_simulations = VALUES(notify_simulations),
             simulation_duration_minutes = VALUES(simulation_duration_minutes),
             simulation_tick_seconds = VALUES(simulation_tick_seconds),
             updated_by_user_id = VALUES(updated_by_user_id)`,
          [
            input.universityId,
            input.temperatureMinC,
            input.temperatureMaxC,
            input.humidityMinPercent,
            input.humidityMaxPercent,
            input.co2MaxPpm,
            input.smokeMaxPercent,
            input.maintenanceReminderDays,
            input.notifyAlerts,
            input.notifyMaintenance,
            input.notifyEnergy,
            input.notifySimulations,
            input.simulationDurationMinutes,
            input.simulationTickSeconds,
            input.userId,
          ],
        );
        await query(
          connection,
          `INSERT INTO activity_logs (university_id, user_id, action, entity_type,
             entity_id, description, metadata_json, ip_address)
           VALUES (?, ?, 'university.preferences.updated', 'university', ?, ?, ?, ?)`,
          [
            input.universityId,
            input.userId,
            input.universityId,
            "U përditësuan preferencat e universitetit.",
            JSON.stringify({
              ...input,
              universityId: undefined,
              userId: undefined,
              ipAddress: undefined,
            }),
            input.ipAddress,
          ],
        );
        const rows = await query(connection, selectSettings, [
          input.universityId,
        ]);
        return rows[0];
      });
    },
  };
}
