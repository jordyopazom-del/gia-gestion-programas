import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// Global scope para reutilización en modo desarrollo (previene saturación de conexiones)
const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

export const sql = globalForPostgres.sql || postgres(connectionString);

if (process.env.NODE_ENV !== "production") globalForPostgres.sql = sql;
