const postgres = require('postgres');
const sql = postgres('postgresql://postgres:NcmpOjPIgaXyqPgHmhkARYDkKQzneHAq@shortline.proxy.rlwy.net:18107/railway', { ssl: 'require' });
async function run() {
  try {
    await sql`ALTER TABLE gia_mujer_embarazos ADD COLUMN IF NOT EXISTS profesional_rut VARCHAR(20);`;
    console.log("Migration successful");
  } catch (e) {
    console.error(e);
  } finally {
    sql.end();
  }
}
run();
