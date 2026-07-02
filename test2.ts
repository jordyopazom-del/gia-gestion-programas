import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const sin = await sql`SELECT rut, estado, estado_registro FROM gia_pacientes WHERE sector = 'SIN SECTOR'`;
  console.log("PACIENTES SIN SECTOR:", sin);
  process.exit(0);
}
run();
