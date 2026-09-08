const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

async function run() {
  const paps = await sql`SELECT id, rut_paciente, fecha_pap, resultado, numero_nomina, fecha_envio_nomina FROM gia_mujer_pap WHERE fecha_pap = CURRENT_DATE AND (resultado = 'PENDIENTE' OR numero_nomina IS NOT NULL)`;
  console.log(JSON.stringify(paps, null, 2));
  process.exit(0);
}
run();
