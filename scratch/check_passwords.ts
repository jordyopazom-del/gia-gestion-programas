import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { verifyPassword } from '../src/lib/password';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const usuarios = await sql`
      SELECT rut, nombre, password, debe_cambiar_password, pregunta_seguridad
      FROM gia_usuarios
      ORDER BY nombre ASC
    `;
    
    let totalUsuarios = usuarios.length;
    let conDefault = 0;
    let conPropia = 0;
    
    console.log("--- ANÁLISIS DE CONTRASEÑAS ---");
    for (const u of usuarios) {
      const esDefault = verifyPassword("cesfam123", u.password);
      if (esDefault) {
        conDefault++;
      } else {
        conPropia++;
      }
      console.log(`Nombre: ${u.nombre.padEnd(40)} | Clave Provisoria: ${esDefault ? 'SÍ' : 'NO '} | Debe Cambiar: ${u.debe_cambiar_password} | Pregunta: ${u.pregunta_seguridad ? 'SÍ' : 'NO'}`);
    }
    
    console.log(`\nResumen:`);
    console.log(`- Total Usuarios en BD: ${totalUsuarios}`);
    console.log(`- Usuarios con clave provisoria 'cesfam123': ${conDefault}`);
    console.log(`- Usuarios con clave propia/distinta: ${conPropia}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error analizando contraseñas:", error);
    process.exit(1);
  }
}

run();
