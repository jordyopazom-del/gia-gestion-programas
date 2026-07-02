import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const sin = await sql`SELECT * FROM gia_pacientes WHERE sector = 'SIN SECTOR'`;
  const gen = await sql`SELECT * FROM gia_pacientes WHERE sector = 'SECTOR GENERAL'`;
  console.log("SIN SECTOR:", sin.length);
  console.log("SECTOR GENERAL:", gen.length);
  process.exit(0);
}
run();
