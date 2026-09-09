const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT id, rut_paciente, nombre_completo, dsm_resultado, estado_nutricional, dsm_detalle, fecha_registro FROM gia_infantil ORDER BY id DESC LIMIT 5', (err, res) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
});
