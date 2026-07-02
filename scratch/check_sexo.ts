import { sql } from "../src/lib/db";

async function run() {
  try {
    const res = await sql`
      SELECT estado, COUNT(*) as count 
      FROM gia_pacientes 
      WHERE sexo = 'FEMENINO'
      GROUP BY estado
    `;
    console.log("Distribución de estado en pacientes femeninos:", res);

    const checkLimit = await sql`
      SELECT rut, nombre_completo, estado, sexo 
      FROM gia_pacientes 
      WHERE sexo = 'FEMENINO' 
      LIMIT 5
    `;
    console.log("Ejemplos de pacientes femeninos:", checkLimit);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();
