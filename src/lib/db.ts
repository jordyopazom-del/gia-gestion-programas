import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL");
}

// Global scope para reutilización en modo desarrollo (previene saturación de conexiones)
const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

// Opciones de configuración del pool optimizadas para Serverless (Vercel)
const options: postgres.Options<{}> = {
  // En producción limitamos a 2 conexiones concurrentes por instancia temporal de Vercel
  max: process.env.NODE_ENV === "production" ? 2 : 10,
  // Cerrar conexiones inactivas a los 10 segundos para liberar el servidor
  idle_timeout: 10,
  connect_timeout: 10,
};

export const sql = globalForPostgres.sql || postgres(connectionString, options);

if (process.env.NODE_ENV !== "production") globalForPostgres.sql = sql;
