import { sql } from "../src/lib/db";

async function run() {
  try {
    const rut = "18549222";
    console.log(`Eliminando registros ECICEP para el RUT: ${rut}...`);
    
    const result = await sql`
      DELETE FROM gia_ecicep 
      WHERE rut_paciente = ${rut}
      RETURNING *;
    `;
    
    console.log(`Registros eliminados: ${result.length}`);
    console.log(result);
  } catch (e: any) {
    console.error("ERROR EN LA QUERY:", e.message);
  }
  process.exit(0);
}

run();
