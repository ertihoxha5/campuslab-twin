import bcrypt from "bcrypt";
import { query, withTransaction } from "../src/database/query.js";

const DEMO_WEBSITES = ["https://uni-prishtina.demo", "https://upt.demo"];

const roles = [
  ["university_admin", "Administratori i universitetit"],
  ["lab_manager", "Menaxheri i laboratorit"],
  ["technician", "Tekniku"],
  ["academic_staff", "Personeli akademik"],
  ["observer", "Vëzhguesi"],
];

const universityData = [
  {
    key: "up",
    name: "Universiteti Demonstrues i Prishtinës",
    acronym: "UDP",
    institutionType: "public",
    city: "Prishtinë",
    address: "Bulevardi i Dijes, Prishtinë",
    website: DEMO_WEBSITES[0],
    representative: "Arta Berisha",
    representativeEmail: "arta.berisha@uni-prishtina.demo",
    users: [
      {
        key: "admin",
        name: "Arta Berisha",
        email: "admin@uni-prishtina.demo",
        title: "Administratore e universitetit",
        role: "university_admin",
      },
      {
        key: "technician",
        name: "Luan Krasniqi",
        email: "teknik@uni-prishtina.demo",
        title: "Teknik laboratori",
        role: "technician",
      },
      {
        key: "manager",
        name: "Drita Gashi",
        email: "menaxher@uni-prishtina.demo",
        title: "Menaxhere e laboratorëve",
        role: "lab_manager",
      },
      {
        key: "academic",
        name: "Blerim Shala",
        email: "akademik@uni-prishtina.demo",
        title: "Personel akademik",
        role: "academic_staff",
      },
      {
        key: "observer",
        name: "Era Kelmendi",
        email: "vezhgues@uni-prishtina.demo",
        title: "Vëzhguese institucionale",
        role: "observer",
      },
    ],
    laboratories: [
      {
        key: "networks",
        name: "Laboratori i Rrjeteve Kompjuterike",
        code: "UDP-RRK-01",
        faculty: "Fakulteti i Inxhinierisë Elektrike dhe Kompjuterike",
        building: "Ndërtesa A",
        floor: "Kati 2",
        capacity: 28,
        zone: "Zona e stacioneve të punës",
        equipment: {
          name: "Serveri i virtualizimit",
          code: "UDP-SRV-01",
          type: "server",
          manufacturer: "Dell",
          model: "PowerEdge R740",
          serial: "UDP-DELL-R740-01",
          watts: 750,
          health: 91,
        },
        sensor: {
          name: "Sensori i temperaturës së raftit",
          code: "UDP-TEMP-01",
          type: "temperature",
          unit: "°C",
          warningMax: 27,
          criticalMax: 32,
          values: [23.4, 23.8, 24.1],
        },
      },
      {
        key: "electronics",
        name: "Laboratori i Elektronikës",
        code: "UDP-ELK-02",
        faculty: "Fakulteti i Inxhinierisë Elektrike dhe Kompjuterike",
        building: "Ndërtesa B",
        floor: "Kati 1",
        capacity: 22,
        zone: "Zona e osciloskopëve",
        equipment: {
          name: "Osciloskopi digjital",
          code: "UDP-OSC-02",
          type: "oscilloscope",
          manufacturer: "Tektronix",
          model: "TBS1102C",
          serial: "UDP-TEK-TBS-02",
          watts: 45,
          health: 96,
        },
        sensor: {
          name: "Sensori i fuqisë së pajisjeve",
          code: "UDP-PWR-02",
          type: "power",
          unit: "W",
          warningMax: 900,
          criticalMax: 1100,
          values: [410, 438, 421],
        },
      },
    ],
  },
  {
    key: "upt",
    name: "Universiteti Politeknik Demonstrues i Tiranës",
    acronym: "UPDT",
    institutionType: "public",
    city: "Tiranë",
    address: "Sheshi Nënë Tereza, Tiranë",
    website: DEMO_WEBSITES[1],
    representative: "Elira Hoxha",
    representativeEmail: "elira.hoxha@upt.demo",
    users: [
      {
        key: "admin",
        name: "Elira Hoxha",
        email: "admin@upt.demo",
        title: "Administratore e universitetit",
        role: "university_admin",
      },
      {
        key: "technician",
        name: "Gentian Dervishi",
        email: "teknik@upt.demo",
        title: "Teknik i sistemeve",
        role: "technician",
      },
      {
        key: "manager",
        name: "Mirela Kola",
        email: "menaxher@upt.demo",
        title: "Menaxhere e laboratorëve",
        role: "lab_manager",
      },
      {
        key: "academic",
        name: "Arben Leka",
        email: "akademik@upt.demo",
        title: "Personel akademik",
        role: "academic_staff",
      },
      {
        key: "observer",
        name: "Ina Duka",
        email: "vezhgues@upt.demo",
        title: "Vëzhguese institucionale",
        role: "observer",
      },
    ],
    laboratories: [
      {
        key: "automation",
        name: "Laboratori i Automatizimit Industrial",
        code: "UPDT-AUT-01",
        faculty: "Fakulteti i Inxhinierisë Mekanike",
        building: "Godina Qendrore",
        floor: "Kati përdhes",
        capacity: 18,
        zone: "Zona e kontrolluesve PLC",
        zoneType: "teaching",
        zonePosition: { x: -3.8, y: 0, z: -1.9 },
        zoneDimensions: { width: 3.2, height: 2.6, depth: 2.4 },
        zoneOccupancyLimit: 6,
        zoneThresholds: { temperatureMax: 28, co2Max: 1000 },
        additionalZones: [
          {
            key: "robotics",
            name: "Qeliza e robotikës",
            code: "UPDT-AUT-01-Z2",
            type: "research",
            description:
              "Zonë e kufizuar për krahun robotik dhe testet e lëvizjes.",
            occupancyLimit: 4,
            position: { x: 0, y: 0, z: -1.9 },
            dimensions: { width: 3.2, height: 2.8, depth: 2.4 },
            thresholds: { temperatureMax: 27, occupancyMax: 4 },
          },
          {
            key: "drives",
            name: "Zona e motorëve dhe inverterëve",
            code: "UPDT-AUT-01-Z3",
            type: "preparation",
            description:
              "Stacion për motorë elektrikë, inverterë dhe matje energjie.",
            occupancyLimit: 4,
            position: { x: 3.8, y: 0, z: -1.9 },
            dimensions: { width: 3.2, height: 2.6, depth: 2.4 },
            thresholds: { temperatureMax: 30, powerMaxWatts: 2500 },
          },
          {
            key: "safety",
            name: "Zona e sigurisë",
            code: "UPDT-AUT-01-Z4",
            type: "safety",
            description:
              "Dalja emergjente, pajisjet mbrojtëse dhe paneli i alarmit.",
            occupancyLimit: 3,
            position: { x: 4.8, y: 0, z: 2.6 },
            dimensions: { width: 2.2, height: 2.8, depth: 1.8 },
            thresholds: { smokeMax: 1, occupancyMax: 3 },
          },
        ],
        equipment: {
          name: "Paneli trajnues PLC",
          code: "UPDT-PLC-01",
          type: "automation_controller",
          manufacturer: "Siemens",
          model: "S7-1500",
          serial: "UPDT-SIE-S715-01",
          watts: 180,
          health: 87,
        },
        sensor: {
          name: "Sensori i CO₂ të laboratorit",
          code: "UPDT-CO2-01",
          type: "co2",
          unit: "ppm",
          warningMax: 1000,
          criticalMax: 1400,
          values: [612, 680, 745],
        },
      },
    ],
  },
];

async function insertAndGetId(connection, sql, parameters) {
  const result = await query(connection, sql, parameters);
  return result.insertId;
}

async function seedRoles(connection) {
  for (const [code, name] of roles) {
    await query(
      connection,
      `INSERT INTO roles (code, name_sq)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name_sq = VALUES(name_sq)`,
      [code, name],
    );
  }

  const rows = await query(
    connection,
    "SELECT id, code FROM roles WHERE code IN (?, ?, ?, ?, ?)",
    roles.map(([code]) => code),
  );
  return new Map(rows.map((role) => [role.code, role.id]));
}

async function seedPlatformAdmin(connection, passwordHash) {
  await query(
    connection,
    `INSERT INTO platform_admins (full_name, email, password_hash)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
    ["Administratori i Platformës", "admin@campuslab.demo", passwordHash],
  );
}

async function seedUniversity(connection, university, passwordHash, roleIds) {
  const universityId = await insertAndGetId(
    connection,
    `INSERT INTO universities (
       name, acronym, institution_type, status, city, address,
       official_website, description, representative_name,
       representative_email, approved_at
     ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    [
      university.name,
      university.acronym,
      university.institutionType,
      university.city,
      university.address,
      university.website,
      `Universitet demonstrues për verifikimin e izolimit të të dhënave të ${university.city}.`,
      university.representative,
      university.representativeEmail,
      "2026-01-10 09:00:00.000",
    ],
  );

  const userIds = new Map();

  for (const user of university.users) {
    const userId = await insertAndGetId(
      connection,
      `INSERT INTO users (
         university_id, full_name, email, password_hash, job_title, status
       ) VALUES (?, ?, ?, ?, ?, 'active')`,
      [universityId, user.name, user.email, passwordHash, user.title],
    );
    userIds.set(user.key, userId);

    await query(
      connection,
      `INSERT INTO user_roles (university_id, user_id, role_id)
       VALUES (?, ?, ?)`,
      [universityId, userId, roleIds.get(user.role)],
    );
  }

  for (const [
    laboratoryIndex,
    laboratory,
  ] of university.laboratories.entries()) {
    const laboratoryId = await insertAndGetId(
      connection,
      `INSERT INTO laboratories (
         university_id, name, code, faculty, building, floor, capacity,
         responsible_user_id, description, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        universityId,
        laboratory.name,
        laboratory.code,
        laboratory.faculty,
        laboratory.building,
        laboratory.floor,
        laboratory.capacity,
        userIds.get("admin"),
        `Hapësirë demonstruese për ${laboratory.name.toLowerCase()}.`,
      ],
    );

    for (const userId of userIds.values()) {
      await query(
        connection,
        `INSERT INTO user_laboratory_assignments (
           university_id, user_id, laboratory_id
         ) VALUES (?, ?, ?)`,
        [universityId, userId, laboratoryId],
      );
    }

    const zoneId = await insertAndGetId(
      connection,
      `INSERT INTO laboratory_zones (
         university_id, laboratory_id, name, code, zone_type, description,
         occupancy_limit, position_json, dimensions_json,
         environmental_thresholds_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        universityId,
        laboratoryId,
        laboratory.zone,
        `${laboratory.code}-Z1`,
        laboratory.zoneType ?? "general",
        "Zonë funksionale e laboratorit demonstrues.",
        laboratory.zoneOccupancyLimit ?? laboratory.capacity,
        JSON.stringify(laboratory.zonePosition ?? { x: 0, y: 0, z: 0 }),
        JSON.stringify(
          laboratory.zoneDimensions ?? { width: 8, height: 3, depth: 6 },
        ),
        JSON.stringify(laboratory.zoneThresholds ?? {}),
      ],
    );

    for (const zone of laboratory.additionalZones ?? []) {
      await insertAndGetId(
        connection,
        `INSERT INTO laboratory_zones (
           university_id, laboratory_id, name, code, zone_type, description,
           occupancy_limit, position_json, dimensions_json,
           environmental_thresholds_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          universityId,
          laboratoryId,
          zone.name,
          zone.code,
          zone.type,
          zone.description,
          zone.occupancyLimit,
          JSON.stringify(zone.position),
          JSON.stringify(zone.dimensions),
          JSON.stringify(zone.thresholds),
        ],
      );
    }

    const equipmentId = await insertAndGetId(
      connection,
      `INSERT INTO equipment (
         university_id, laboratory_id, zone_id, responsible_user_id,
         name, code, type, manufacturer, model, serial_number, status,
         energy_rating_watts, health_score, object_3d_reference
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        universityId,
        laboratoryId,
        zoneId,
        userIds.get("technician"),
        laboratory.equipment.name,
        laboratory.equipment.code,
        laboratory.equipment.type,
        laboratory.equipment.manufacturer,
        laboratory.equipment.model,
        laboratory.equipment.serial,
        laboratory.equipment.watts,
        laboratory.equipment.health,
        `equipment/${laboratory.equipment.code}`,
      ],
    );

    const sensorId = await insertAndGetId(
      connection,
      `INSERT INTO sensors (
         university_id, laboratory_id, zone_id, equipment_id, name, code,
         sensor_type, unit, status, sampling_interval_seconds,
         warning_max, critical_max, position_x, position_y, position_z
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online', 60, ?, ?, ?, ?, ?)`,
      [
        universityId,
        laboratoryId,
        zoneId,
        equipmentId,
        laboratory.sensor.name,
        laboratory.sensor.code,
        laboratory.sensor.type,
        laboratory.sensor.unit,
        laboratory.sensor.warningMax,
        laboratory.sensor.criticalMax,
        1.5 + laboratoryIndex,
        1.2,
        -0.8,
      ],
    );

    for (const [readingIndex, value] of laboratory.sensor.values.entries()) {
      await query(
        connection,
        `INSERT INTO sensor_readings (
           university_id, laboratory_id, sensor_id, value, recorded_at, source
         ) VALUES (?, ?, ?, ?, ?, 'simulated')`,
        [
          universityId,
          laboratoryId,
          sensorId,
          value,
          `2026-01-15 10:0${readingIndex}:00.000`,
        ],
      );
    }

    await query(
      connection,
      `INSERT INTO energy_readings (
         university_id, laboratory_id, equipment_id, power_watts,
         energy_kwh, recorded_at, source
       ) VALUES (?, ?, ?, ?, ?, ?, 'simulated')`,
      [
        universityId,
        laboratoryId,
        equipmentId,
        laboratory.equipment.watts * 0.68,
        laboratory.equipment.watts * 0.00068,
        "2026-01-15 10:02:00.000",
      ],
    );

    const alertId = await insertAndGetId(
      connection,
      `INSERT INTO alerts (
         university_id, laboratory_id, sensor_id, equipment_id,
         assigned_user_id, category, severity, title, description,
         status, source, deduplication_key
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'simulated', ?)`,
      [
        universityId,
        laboratoryId,
        sensorId,
        equipmentId,
        userIds.get("technician"),
        "monitoring",
        laboratoryIndex === 0 ? "warning" : "info",
        `Kontroll i nevojshëm në ${laboratory.name}`,
        "Alarm demonstrues i krijuar nga të dhënat e simuluara.",
        laboratoryIndex === 0 ? "new" : "acknowledged",
        `${university.key}:${laboratory.key}:demo-alert`,
      ],
    );

    const maintenanceId = await insertAndGetId(
      connection,
      `INSERT INTO maintenance_tasks (
         university_id, laboratory_id, equipment_id, assigned_user_id,
         type, priority, title, description, status, checklist_json,
         scheduled_at, due_at, created_by_user_id
       ) VALUES (?, ?, ?, ?, 'preventive', 'medium', ?, ?, 'planned', ?, ?, ?, ?)`,
      [
        universityId,
        laboratoryId,
        equipmentId,
        userIds.get("technician"),
        `Kontrolli periodik: ${laboratory.equipment.name}`,
        "Mirëmbajtje parandaluese demonstruese.",
        JSON.stringify([
          { label: "Kontrollo furnizimin", completed: false },
          { label: "Pastro pajisjen", completed: false },
        ]),
        "2026-02-01 09:00:00.000",
        "2026-02-03 17:00:00.000",
        userIds.get("admin"),
      ],
    );

    await query(
      connection,
      `INSERT INTO maintenance_updates (
         university_id, maintenance_task_id, user_id, status, notes
       ) VALUES (?, ?, ?, 'planned', ?)`,
      [
        universityId,
        maintenanceId,
        userIds.get("technician"),
        "Detyra u planifikua dhe pret kontrollin teknik.",
      ],
    );

    const scenarioId = await insertAndGetId(
      connection,
      `INSERT INTO simulation_scenarios (
         university_id, laboratory_id, name, scenario_type, description,
         configuration_json, seed_value, status, created_by_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        universityId,
        laboratoryId,
        `Skenari demonstrues — ${laboratory.name}`,
        laboratory.sensor.type === "co2"
          ? "ventilation_failure"
          : "temperature_rise",
        "Skenar i riprodhueshëm me të dhëna të simuluara.",
        JSON.stringify({ durationMinutes: 15, intensity: "medium" }),
        universityId * 1000 + laboratoryIndex,
        userIds.get("admin"),
      ],
    );

    await query(
      connection,
      `INSERT INTO simulation_runs (
         university_id, laboratory_id, scenario_id, started_by_user_id,
         status, seed_value, input_json, result_json, started_at, ended_at
       ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
      [
        universityId,
        laboratoryId,
        scenarioId,
        userIds.get("admin"),
        universityId * 1000 + laboratoryIndex,
        JSON.stringify({ source: "demo" }),
        JSON.stringify({ outcome: "completed", alertsCreated: 1 }),
        "2026-01-15 10:00:00.000",
        "2026-01-15 10:15:00.000",
      ],
    );

    await query(
      connection,
      `INSERT INTO reports (
         university_id, laboratory_id, generated_by_user_id, report_type,
         title, period_start, period_end, parameters_json, status
       ) VALUES (?, ?, ?, 'laboratory', ?, ?, ?, ?, 'ready')`,
      [
        universityId,
        laboratoryId,
        userIds.get("admin"),
        `Raporti demonstrues — ${laboratory.name}`,
        "2026-01-01 00:00:00.000",
        "2026-01-31 23:59:59.999",
        JSON.stringify({ simulatedData: true }),
      ],
    );

    await query(
      connection,
      `INSERT INTO notifications (
         university_id, user_id, alert_id, type, title, message
       ) VALUES (?, ?, ?, 'alert', ?, ?)`,
      [
        universityId,
        userIds.get("admin"),
        alertId,
        "Njoftim demonstrues",
        `Është regjistruar një alarm në ${laboratory.name}.`,
      ],
    );

    await query(
      connection,
      `INSERT INTO activity_logs (
         university_id, user_id, action, entity_type, entity_id,
         description, metadata_json
       ) VALUES (?, ?, 'demo_seeded', 'laboratory', ?, ?, ?)`,
      [
        universityId,
        userIds.get("admin"),
        laboratoryId,
        `U përgatit laboratori demonstrues ${laboratory.name}.`,
        JSON.stringify({ simulatedData: true }),
      ],
    );
  }
}

export async function seedDemoData(pool, { password }) {
  if (!password || password.length < 12) {
    throw new Error(
      "Fjalëkalimi demonstrues duhet të ketë të paktën 12 karaktere.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return withTransaction(pool, async (connection) => {
    const roleIds = await seedRoles(connection);
    await seedPlatformAdmin(connection, passwordHash);

    const existing = await query(
      connection,
      "SELECT official_website FROM universities WHERE official_website IN (?, ?)",
      DEMO_WEBSITES,
    );

    if (existing.length === DEMO_WEBSITES.length) {
      return { skipped: true };
    }

    if (existing.length > 0) {
      throw new Error(
        "Të dhënat demonstruese janë të paplota. Riktheni bazën dhe provoni përsëri.",
      );
    }

    for (const university of universityData) {
      await seedUniversity(connection, university, passwordHash, roleIds);
    }

    return { skipped: false };
  });
}
