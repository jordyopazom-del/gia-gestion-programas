import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    const result = await sql`
      UPDATE gia_usuarios
      SET debe_cambiar_password = true
      WHERE rut = '18549222-2'
      RETURNING rut, nombre, debe_cambiar_password
    `;
    console.log("Resultado de actualización:", result);
    process.exit(0);
  } catch (error) {
    console.error("Error al actualizar:", error);
    process.exit(1);
  }
}

run();
