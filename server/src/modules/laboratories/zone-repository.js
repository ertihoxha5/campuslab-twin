import { query, withTransaction } from "../../database/query.js";

const selectZone = `
  SELECT id, laboratory_id AS laboratoryId, name, code,
         zone_type AS zoneType, description,
         occupancy_limit AS occupancyLimit,
         position_json AS position, dimensions_json AS dimensions,
         environmental_thresholds_json AS environmentalThresholds,
         created_at AS createdAt, updated_at AS updatedAt
  FROM laboratory_zones
`;

export function createLaboratoryZoneRepository(pool) {
  return {
    async list({ universityId, laboratoryId }) {
      return query(
        pool,
        `${selectZone}
         WHERE university_id = ? AND laboratory_id = ?
         ORDER BY name, id`,
        [universityId, laboratoryId],
      );
    },

    async create({ universityId, laboratoryId, userId, ipAddress, zone }) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          `INSERT INTO laboratory_zones (
             university_id, laboratory_id, name, code, zone_type,
             description, occupancy_limit, position_json, dimensions_json,
             environmental_thresholds_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            universityId,
            laboratoryId,
            zone.name,
            zone.code,
            zone.zoneType,
            zone.description,
            zone.occupancyLimit,
            JSON.stringify(zone.position),
            JSON.stringify(zone.dimensions),
            zone.environmentalThresholds
              ? JSON.stringify(zone.environmentalThresholds)
              : null,
          ],
        );
        await insertZoneActivity(connection, {
          universityId,
          userId,
          laboratoryId,
          zoneId: result.insertId,
          action: "laboratory_zone.created",
          description: `U krijua zona ${zone.name}.`,
          code: zone.code,
          ipAddress,
        });
        return { id: String(result.insertId), laboratoryId, ...zone };
      });
    },

    async update({
      universityId,
      laboratoryId,
      zoneId,
      userId,
      ipAddress,
      zone,
    }) {
      return withTransaction(pool, async (connection) => {
        const result = await query(
          connection,
          `UPDATE laboratory_zones
           SET name = ?, code = ?, zone_type = ?, description = ?,
               occupancy_limit = ?, position_json = ?, dimensions_json = ?,
               environmental_thresholds_json = ?
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [
            zone.name,
            zone.code,
            zone.zoneType,
            zone.description,
            zone.occupancyLimit,
            JSON.stringify(zone.position),
            JSON.stringify(zone.dimensions),
            zone.environmentalThresholds
              ? JSON.stringify(zone.environmentalThresholds)
              : null,
            universityId,
            laboratoryId,
            zoneId,
          ],
        );
        if (!result.affectedRows) return null;
        await insertZoneActivity(connection, {
          universityId,
          userId,
          laboratoryId,
          zoneId,
          action: "laboratory_zone.updated",
          description: `U përditësua zona ${zone.name}.`,
          code: zone.code,
          ipAddress,
        });
        return { id: String(zoneId), laboratoryId, ...zone };
      });
    },

    async remove({ universityId, laboratoryId, zoneId, userId, ipAddress }) {
      return withTransaction(pool, async (connection) => {
        const rows = await query(
          connection,
          `SELECT id, name, code
           FROM laboratory_zones
           WHERE university_id = ? AND laboratory_id = ? AND id = ?
           FOR UPDATE`,
          [universityId, laboratoryId, zoneId],
        );
        const zone = rows[0];
        if (!zone) return null;
        await query(
          connection,
          `DELETE FROM laboratory_zones
           WHERE university_id = ? AND laboratory_id = ? AND id = ?`,
          [universityId, laboratoryId, zoneId],
        );
        await insertZoneActivity(connection, {
          universityId,
          userId,
          laboratoryId,
          zoneId,
          action: "laboratory_zone.deleted",
          description: `U fshi zona ${zone.name}.`,
          code: zone.code,
          ipAddress,
        });
        return { id: String(zone.id), name: zone.name };
      });
    },
  };
}

async function insertZoneActivity(
  connection,
  {
    universityId,
    userId,
    laboratoryId,
    zoneId,
    action,
    description,
    code,
    ipAddress,
  },
) {
  await query(
    connection,
    `INSERT INTO activity_logs (
       university_id, user_id, action, entity_type, entity_id,
       description, metadata_json, ip_address
     ) VALUES (?, ?, ?, 'laboratory_zone', ?, ?, ?, ?)`,
    [
      universityId,
      userId,
      action,
      zoneId,
      description,
      JSON.stringify({ laboratoryId, code }),
      ipAddress,
    ],
  );
}
