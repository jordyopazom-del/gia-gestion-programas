import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log("Iniciando limpieza de registros importados incorrectamente...");
    
    // Eliminar registros provisorios creados por el script de importación anterior
    const result = await sql`
      DELETE FROM gia_pacientes 
      WHERE estado_registro = 'PROVISORIO' 
        AND (rut LIKE '%-%' OR sector = 'SIN SECTOR')
      RETURNING rut
    `;
    
    console.log(`Se eliminaron ${result.length} registros erróneos.`);
    process.exit(0);
  } catch (error) {
    console.error("Error al limpiar registros:", error);
    process.exit(1);
  }
}

run();
