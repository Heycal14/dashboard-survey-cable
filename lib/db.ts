import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

export const pool =
  globalThis._pgPool ??
  new Pool({
    host: process.env.PGHOST || "192.168.9.68",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "user_test",
    password: process.env.PGPASSWORD || "user_test_pass",
    database: process.env.PGDATABASE || "lensa_one_db",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._pgPool = pool;
}
