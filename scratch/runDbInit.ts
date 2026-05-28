import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  console.log("Iniciando inyección de estructura en PostgreSQL local...");
  // Importar dinámicamente para evitar hoisting
  const { initDatabase } = await import("../src/actions/dbInit");
  const res = await initDatabase();
  console.log("Resultado de migración:", res);
  process.exit(0);
}
run();
