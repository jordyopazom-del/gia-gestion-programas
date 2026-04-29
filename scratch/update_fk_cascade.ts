import { sql } from "../src/lib/db";

async function migrate() {
  console.log("Actualizando restricciones de integridad...");
  try {
    // Actualizar gia_empam
    await sql`ALTER TABLE gia_empam DROP CONSTRAINT IF EXISTS gia_empam_rut_paciente_fkey`;
    await sql`ALTER TABLE gia_empam ADD CONSTRAINT gia_empam_rut_paciente_fkey FOREIGN KEY (rut_paciente) REFERENCES gia_pacientes(rut) ON UPDATE CASCADE ON DELETE CASCADE`;
    
    // Si hay otras tablas referenciando pacientes (como respiratorio), también actualizarlas
    try {
        await sql`ALTER TABLE gia_respiratorio DROP CONSTRAINT IF EXISTS gia_respiratorio_rut_paciente_fkey`;
        await sql`ALTER TABLE gia_respiratorio ADD CONSTRAINT gia_respiratorio_rut_paciente_fkey FOREIGN KEY (rut_paciente) REFERENCES gia_pacientes(rut) ON UPDATE CASCADE ON DELETE CASCADE`;
    } catch(e) {}

    console.log("✅ Restricciones actualizadas con ON UPDATE CASCADE y ON DELETE CASCADE.");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  }
}

migrate();
