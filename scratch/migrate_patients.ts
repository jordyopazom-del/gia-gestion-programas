import { sql } from "../src/lib/db";

async function migrate() {
  console.log("Iniciando migración...");
  try {
    await sql`ALTER TABLE gia_pacientes ADD COLUMN IF NOT EXISTS estado_registro TEXT DEFAULT 'OFICIAL'`;
    console.log("✅ Columna estado_registro añadida con éxito.");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  }
}

migrate();
