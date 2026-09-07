const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'gia_mujer_embarazos'`;
    console.log("Columnas en gia_mujer_embarazos:");
    res.forEach(r => console.log(r.column_name));
    
    // Y probemos insertar algo a ver el error
    // const err = await sql`INSERT...`
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
