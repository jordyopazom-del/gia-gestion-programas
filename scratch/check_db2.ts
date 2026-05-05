import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const pacientes = await sql`SELECT rut, dv, nombre_completo FROM gia_pacientes LIMIT 5`;
  console.log('Pacientes de muestra:', pacientes);
  await sql.end();
}
run();
