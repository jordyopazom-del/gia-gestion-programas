import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const byNum = await sql`SELECT rut, dv, nombre_completo FROM gia_pacientes WHERE rut = '6398924'`;
  console.log('byNum:', byNum);
  const byName = await sql`SELECT rut, dv, nombre_completo FROM gia_pacientes WHERE nombre_completo ILIKE '%LUIS GUSTAVO FERNANDEZ%'`;
  console.log('byName:', byName);
  const byName2 = await sql`SELECT rut, dv, nombre_completo FROM gia_pacientes WHERE nombre_completo ILIKE '%MARIA INES JARA%'`;
  console.log('byName2:', byName2);
  await sql.end();
}
run();
