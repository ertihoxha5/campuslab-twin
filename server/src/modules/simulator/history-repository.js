import { query } from "../../database/query.js";

const maintenanceLock = "campuslab_reading_history_maintenance";

export function createReadingHistoryRepository(pool) {
  return {
    async aggregateAndPrune({ cutoff, intervalMinutes }) {
      const connection = await pool.getConnection();
      const interval = Math.max(
        5,
        Math.min(1440, Math.trunc(Number(intervalMinutes)) || 60),
      );
      let lockAcquired = false;

      try {
        const locks = await query(connection, "SELECT GET_LOCK(?, 0) AS acquired", [
          maintenanceLock,
        ]);
        lockAcquired = Number(locks[0]?.acquired) === 1;
        if (!lockAcquired) return { skipped: true };

        await connection.beginTransaction();
        const sensorResult = await query(
          connection,
          `INSERT INTO sensor_reading_aggregates (
             university_id, laboratory_id, sensor_id, bucket_start,
             interval_minutes, source, minimum_value, maximum_value,
             average_value, sample_count
           )
           SELECT university_id, laboratory_id, sensor_id,
                  FROM_UNIXTIME(
                    FLOOR(UNIX_TIMESTAMP(recorded_at) / (${interval} * 60)) * (${interval} * 60)
                  ),
                  ${interval}, source, MIN(value), MAX(value), AVG(value), COUNT(*)
           FROM sensor_readings
           WHERE recorded_at < ?
           GROUP BY university_id, laboratory_id, sensor_id,
                    FROM_UNIXTIME(
                      FLOOR(UNIX_TIMESTAMP(recorded_at) / (${interval} * 60)) * (${interval} * 60)
                    ), source
           ON DUPLICATE KEY UPDATE
             minimum_value = VALUES(minimum_value),
             maximum_value = VALUES(maximum_value),
             average_value = VALUES(average_value),
             sample_count = VALUES(sample_count),
             updated_at = CURRENT_TIMESTAMP(3)`,
          [cutoff],
        );
        const energyResult = await query(
          connection,
          `INSERT INTO energy_reading_aggregates (
             university_id, laboratory_id, equipment_id, bucket_start,
             interval_minutes, source, minimum_power_watts,
             maximum_power_watts, average_power_watts, total_energy_kwh,
             sample_count
           )
           SELECT university_id, laboratory_id, equipment_id,
                  FROM_UNIXTIME(
                    FLOOR(UNIX_TIMESTAMP(recorded_at) / (${interval} * 60)) * (${interval} * 60)
                  ),
                  ${interval}, source, MIN(power_watts), MAX(power_watts),
                  AVG(power_watts), SUM(energy_kwh), COUNT(*)
           FROM energy_readings
           WHERE recorded_at < ?
           GROUP BY university_id, laboratory_id, equipment_id,
                    FROM_UNIXTIME(
                      FLOOR(UNIX_TIMESTAMP(recorded_at) / (${interval} * 60)) * (${interval} * 60)
                    ), source
           ON DUPLICATE KEY UPDATE
             minimum_power_watts = VALUES(minimum_power_watts),
             maximum_power_watts = VALUES(maximum_power_watts),
             average_power_watts = VALUES(average_power_watts),
             total_energy_kwh = VALUES(total_energy_kwh),
             sample_count = VALUES(sample_count),
             updated_at = CURRENT_TIMESTAMP(3)`,
          [cutoff],
        );
        const deletedSensors = await query(
          connection,
          "DELETE FROM sensor_readings WHERE recorded_at < ?",
          [cutoff],
        );
        const deletedEnergy = await query(
          connection,
          "DELETE FROM energy_readings WHERE recorded_at < ?",
          [cutoff],
        );
        await connection.commit();

        return {
          skipped: false,
          sensorAggregateChanges: Number(sensorResult.affectedRows ?? 0),
          energyAggregateChanges: Number(energyResult.affectedRows ?? 0),
          deletedSensorReadings: Number(deletedSensors.affectedRows ?? 0),
          deletedEnergyReadings: Number(deletedEnergy.affectedRows ?? 0),
        };
      } catch (error) {
        try {
          await connection.rollback();
        } catch {
          // Preserve the original maintenance error.
        }
        throw error;
      } finally {
        if (lockAcquired) {
          try {
            await query(connection, "SELECT RELEASE_LOCK(?)", [maintenanceLock]);
          } catch {
            // The connection release below also releases a named lock.
          }
        }
        connection.release();
      }
    },
  };
}
