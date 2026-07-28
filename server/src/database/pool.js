import mysql from "mysql2/promise";

export function createDatabasePool(config) {
  return mysql.createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    connectionLimit: config.DB_CONNECTION_LIMIT,
    waitForConnections: true,
    queueLimit: 0,
    timezone: "Z",
    decimalNumbers: true,
  });
}

export async function checkDatabaseConnection(pool) {
  await pool.query("SELECT 1");
}
