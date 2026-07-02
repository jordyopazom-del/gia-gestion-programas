import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const total = await sql`SELECT COUNT(*)::int as count FROM gia_pacientes`;
    const activosOficiales = await sql`
      SELECT COUNT(*)::int as count 
      FROM gia_pacientes 
      WHERE estado = 'ACTIVO' AND estado_registro = 'OFICIAL'
    `;
    const egresados = await sql`
      SELECT COUNT(*)::int as count 
      FROM gia_pacientes 
      WHERE estado = 'EGRESADO'
    `;
    const provisorios = await sql`
      SELECT COUNT(*)::int as count 
      FROM gia_pacientes 
      WHERE estado_registro = 'PROVISORIO'
    `;
    
    console.log("DESGLOSE DE PACIENTES EN LA BD:");
    console.log(`- Total de filas en la tabla (gia_pacientes): ${total[0].count}`);
    console.log(`- Activos y Oficiales (Vigentes): ${activosOficiales[0].count}`);
    console.log(`- Egresados (Fallecidos/Trasladados): ${egresados[0].count}`);
    console.log(`- Provisorios (Pendientes de validar): ${provisorios[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    process.exit(1);
  }
}

run();
