export async function query(executor, sql, parameters = []) {
  const [rows] = await executor.execute(sql, parameters);
  return rows;
}

export async function withTransaction(pool, operation) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
