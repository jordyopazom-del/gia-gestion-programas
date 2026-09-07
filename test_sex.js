const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  const res = await sql`SELECT sexo, COUNT(*) FROM gia_pacientes GROUP BY sexo`;
  console.log(res);
  process.exit(0);
}
run();
