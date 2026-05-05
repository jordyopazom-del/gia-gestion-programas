import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const pacientes = await sql`SELECT rut, dv, nombre_completo FROM gia_pacientes WHERE rut IN ('8385524', '8182321')`;
  console.log('Pacientes:', pacientes);
  const empams = await sql`SELECT id, rut_paciente, fecha_atencion, resultado_efam FROM gia_empam WHERE rut_paciente IN ('8385524', '8182321')`;
  console.log('Empams:', empams);
  await sql.end();
}
run();
