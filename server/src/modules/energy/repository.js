import { query } from "../../database/query.js";

const bucketExpressions = {
  hourly: "DATE_FORMAT(point_at, '%Y-%m-%d %H:00:00')",
  daily: "DATE_FORMAT(point_at, '%Y-%m-%d')",
  weekly:
    "DATE_FORMAT(DATE_SUB(point_at, INTERVAL WEEKDAY(point_at) DAY), '%Y-%m-%d')",
  monthly: "DATE_FORMAT(point_at, '%Y-%m-01')",
};

const accessibleLaboratories = `
  accessible_laboratories AS (
    SELECT laboratory.id
    FROM laboratories laboratory
    WHERE laboratory.university_id = ?
      AND laboratory.deleted_at IS NULL
      AND (? IS NULL OR laboratory.id = ?)
      AND (? = 0 OR EXISTS (
        SELECT 1 FROM user_laboratory_assignments assignment
        WHERE assignment.university_id = laboratory.university_id
          AND assignment.laboratory_id = laboratory.id
          AND assignment.user_id = ?
      ))
  )`;

const energyPoints = `
  energy_points AS (
    SELECT reading.laboratory_id, reading.equipment_id,
           reading.recorded_at AS point_at,
           reading.power_watts AS average_power_watts,
           reading.power_watts AS peak_power_watts,
           reading.energy_kwh, reading.source, 1 AS samples,
           'raw' AS storage_level
    FROM energy_readings reading
    INNER JOIN accessible_laboratories laboratory
      ON laboratory.id = reading.laboratory_id
    WHERE reading.university_id = ?
      AND reading.recorded_at >= ? AND reading.recorded_at < ?
      AND (? IS NULL OR reading.equipment_id = ?)
    UNION ALL
    SELECT aggregate.laboratory_id, aggregate.equipment_id,
           aggregate.bucket_start AS point_at,
           aggregate.average_power_watts,
           aggregate.maximum_power_watts AS peak_power_watts,
           aggregate.total_energy_kwh AS energy_kwh,
           aggregate.source, aggregate.sample_count AS samples,
           'aggregate' AS storage_level
    FROM energy_reading_aggregates aggregate
    INNER JOIN accessible_laboratories laboratory
      ON laboratory.id = aggregate.laboratory_id
    WHERE aggregate.university_id = ?
      AND aggregate.bucket_start >= ? AND aggregate.bucket_start < ?
      AND (? IS NULL OR aggregate.equipment_id = ?)
  )`;

function accessParameters(input) {
  return [
    input.universityId,
    input.laboratoryId ?? null,
    input.laboratoryId ?? null,
    input.restrictToAssignments ? 1 : 0,
    input.userId,
  ];
}

function pointParameters(input, startAt, endAt) {
  return [
    input.universityId,
    startAt,
    endAt,
    input.equipmentId ?? null,
    input.equipmentId ?? null,
    input.universityId,
    startAt,
    endAt,
    input.equipmentId ?? null,
    input.equipmentId ?? null,
  ];
}

export function createEnergyRepository(pool) {
  return {
    async overview(input) {
      const bucket = bucketExpressions[input.interval] ?? bucketExpressions.hourly;
      const currentParameters = accessParameters(input);
      const periodParameters = [
        ...accessParameters(input),
        ...pointParameters(input, input.startAt, input.endAt),
      ];
      const previousParameters = [
        ...accessParameters(input),
        ...pointParameters(input, input.previousStartAt, input.startAt),
      ];
      const [currentRows, trend, summaryRows, previousRows, consumers, provenance] =
        await Promise.all([
          query(
            pool,
            `WITH ${accessibleLaboratories}, latest AS (
               SELECT reading.equipment_id, reading.power_watts,
                      reading.recorded_at,
                      ROW_NUMBER() OVER (
                        PARTITION BY reading.equipment_id
                        ORDER BY reading.recorded_at DESC, reading.id DESC
                      ) AS rowNumber
               FROM energy_readings reading
               INNER JOIN accessible_laboratories laboratory
                 ON laboratory.id = reading.laboratory_id
               WHERE reading.university_id = ?
                 AND (? IS NULL OR reading.equipment_id = ?)
             )
             SELECT COALESCE(SUM(power_watts), 0) AS powerWatts,
                    MAX(recorded_at) AS recordedAt
             FROM latest WHERE rowNumber = 1`,
            [
              ...currentParameters,
              input.universityId,
              input.equipmentId ?? null,
              input.equipmentId ?? null,
            ],
          ),
          query(
            pool,
            `WITH ${accessibleLaboratories}, ${energyPoints}
             SELECT ${bucket} AS bucketStart,
                    SUM(energy_kwh) AS energyKwh,
                    AVG(average_power_watts) AS averagePowerWatts,
                    MAX(peak_power_watts) AS peakPowerWatts
             FROM energy_points
             GROUP BY ${bucket}
             ORDER BY bucketStart`,
            periodParameters,
          ),
          query(
            pool,
            `WITH ${accessibleLaboratories}, ${energyPoints}
             SELECT COALESCE(SUM(energy_kwh), 0) AS totalEnergyKwh,
                    COALESCE(MAX(peak_power_watts), 0) AS peakPowerWatts,
                    COALESCE(SUM(average_power_watts * samples) /
                      NULLIF(SUM(samples), 0), 0) AS averagePowerWatts
             FROM energy_points`,
            periodParameters,
          ),
          query(
            pool,
            `WITH ${accessibleLaboratories}, ${energyPoints}
             SELECT COALESCE(SUM(energy_kwh), 0) AS totalEnergyKwh
             FROM energy_points`,
            previousParameters,
          ),
          query(
            pool,
            `WITH ${accessibleLaboratories}, ${energyPoints}
             SELECT point.equipment_id AS equipmentId,
                    equipment.name AS equipmentName,
                    point.laboratory_id AS laboratoryId,
                    laboratory.name AS laboratoryName,
                    SUM(point.energy_kwh) AS energyKwh
             FROM energy_points point
             INNER JOIN equipment
               ON equipment.id = point.equipment_id
              AND equipment.university_id = ?
             INNER JOIN laboratories laboratory
               ON laboratory.id = point.laboratory_id
              AND laboratory.university_id = ?
             WHERE point.equipment_id IS NOT NULL
             GROUP BY point.equipment_id, equipment.name,
                      point.laboratory_id, laboratory.name
             ORDER BY energyKwh DESC, point.equipment_id
             LIMIT 10`,
            [...periodParameters, input.universityId, input.universityId],
          ),
          query(
            pool,
            `WITH ${accessibleLaboratories}, ${energyPoints}
             SELECT source, storage_level AS storageLevel,
                    SUM(energy_kwh) AS energyKwh, SUM(samples) AS samples
             FROM energy_points
             GROUP BY source, storage_level
             ORDER BY source, storage_level`,
            periodParameters,
          ),
        ]);

      return {
        current: currentRows[0],
        trend,
        summary: summaryRows[0],
        previous: previousRows[0],
        largestConsumers: consumers,
        provenance,
      };
    },
  };
}
