import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://app:app@localhost:5432/appdb";

export const pool = new Pool({
  connectionString,
  max: 10,
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.debug("db query", { text, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
}
