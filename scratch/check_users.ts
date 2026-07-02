import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const usuarios = await sql`
      SELECT rut, nombre, profesion, rol, debe_cambiar_password, pregunta_seguridad
      FROM gia_usuarios
      ORDER BY nombre ASC
    `;
    
    console.log("--- TODOS LOS USUARIOS ---");
    usuarios.forEach((u: any) => {
      console.log(`RUT: ${u.rut} | Nombre: ${u.nombre} | Rol: ${u.rol} | Debe Cambiar: ${u.debe_cambiar_password} | Pregunta: ${u.pregunta_seguridad ? 'SÍ' : 'NO'}`);
    });
    
    console.log("\n--- USUARIOS SIN PREGUNTA DE SEGURIDAD ---");
    const sinPregunta = usuarios.filter((u: any) => !u.pregunta_seguridad);
    sinPregunta.forEach((u: any) => {
      console.log(`RUT: ${u.rut} | Nombre: ${u.nombre} | Rol: ${u.rol} | Debe Cambiar: ${u.debe_cambiar_password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error consultando base de datos:", error);
    process.exit(1);
  }
}

run();
