import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const migrationsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

function validateDatabaseName(databaseName) {
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(
      "DB_NAME mund të përmbajë vetëm shkronja, numra dhe nënvizime.",
    );
  }
}

function connectionOptions(config, database) {
  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ...(database ? { database } : {}),
    timezone: "Z",
    multipleStatements: true,
  };
}

async function ensureDatabase(config) {
  validateDatabaseName(config.DB_NAME);
  const connection = await mysql.createConnection(connectionOptions(config));

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      version VARCHAR(100) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_version (version)
    ) ENGINE=InnoDB
  `);
}

async function migrationFiles(suffix) {
  const entries = await fs.readdir(migrationsDirectory);
  return entries.filter((name) => name.endsWith(suffix)).sort();
}

function checksum(content) {
  return createHash("sha256").update(content).digest("hex");
}

export async function migrateUp(config) {
  await ensureDatabase(config);
  const connection = await mysql.createConnection(
    connectionOptions(config, config.DB_NAME),
  );

  try {
    await ensureMigrationsTable(connection);
    const [appliedRows] = await connection.execute(
      "SELECT version, checksum FROM schema_migrations",
    );
    const applied = new Map(
      appliedRows.map((row) => [row.version, row.checksum]),
    );
    const files = await migrationFiles(".up.sql");
    let appliedCount = 0;

    for (const file of files) {
      const version = file.replace(/\.up\.sql$/, "");
      const sql = await fs.readFile(
        path.join(migrationsDirectory, file),
        "utf8",
      );
      const fileChecksum = checksum(sql);

      if (applied.has(version)) {
        if (applied.get(version) !== fileChecksum) {
          throw new Error(
            `Migrimi ${version} është ndryshuar pasi është aplikuar.`,
          );
        }
        continue;
      }

      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)",
        [version, fileChecksum],
      );
      appliedCount += 1;
      console.log(`U aplikua migrimi: ${version}`);
    }

    if (appliedCount === 0) {
      console.log("Baza e të dhënave është e përditësuar.");
    }
  } finally {
    await connection.end();
  }
}

export async function migrateDown(config) {
  const connection = await mysql.createConnection(
    connectionOptions(config, config.DB_NAME),
  );

  try {
    await ensureMigrationsTable(connection);
    const [rows] = await connection.execute(
      "SELECT version FROM schema_migrations ORDER BY id DESC LIMIT 1",
    );

    if (rows.length === 0) {
      console.log("Nuk ka migrime për t'u kthyer.");
      return;
    }

    const version = rows[0].version;
    const file = path.join(migrationsDirectory, `${version}.down.sql`);
    const sql = await fs.readFile(file, "utf8");

    await connection.query(sql);
    await connection.execute(
      "DELETE FROM schema_migrations WHERE version = ?",
      [version],
    );
    console.log(`U kthye migrimi: ${version}`);
  } finally {
    await connection.end();
  }
}
