import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function migrarSectores() {
  console.log('🚀 Iniciando actualización de sectores...');

  try {
    const res = await sql`
      UPDATE gia_pacientes 
      SET sector = 'SIN SECTOR' 
      WHERE sector = 'SECTOR GENERAL'
      RETURNING rut
    `;
    
    console.log(`✅ ${res.length} pacientes actualizados a "SIN SECTOR".`);
  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await sql.end();
  }
}

migrarSectores();
