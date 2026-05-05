import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  try {
    const rutNum = 8385524;
    const res = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${rutNum}`;
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err);
  }
  await sql.end();
}
run();
