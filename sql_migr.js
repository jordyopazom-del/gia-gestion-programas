const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE gia_mujer_embarazos ADD COLUMN alto_riesgo_obstetrico BOOLEAN DEFAULT false;`;
    console.log("Columna agregada");
  } catch (e) {
    if (e.code === '42701') console.log("La columna ya existe");
    else console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
