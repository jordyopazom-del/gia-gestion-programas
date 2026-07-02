import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const pacientes = await sql`
      SELECT rut, dv, nombre_completo, sector, estado_registro 
      FROM gia_pacientes 
      LIMIT 5
    `;
    console.log("PACIENTES EXISTENTES EN BD:");
    pacientes.forEach((p: any) => {
      console.log(`RUT: ${p.rut} | DV: ${p.dv} | Nombre: ${p.nombre_completo} | Sector: ${p.sector} | Registro: ${p.estado_registro}`);
    });
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
