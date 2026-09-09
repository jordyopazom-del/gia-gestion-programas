const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.vercel.local', 'utf8');
const match = env.match(/POSTGRES_URL="([^"]+)"/);
if (!match) throw new Error("POSTGRES_URL not found");
const url = match[1];

const pool = new Pool({
  connectionString: url,
});

pool.query(`
  SELECT i.id, i.rut_paciente, p.nombre_completo, i.dsm_resultado, i.estado_nutricional, i.dsm_detalle, i.fecha_registro, i.profesional_rut
  FROM gia_infantil i
  LEFT JOIN gia_pacientes_nomina p ON i.rut_paciente = p.rut
  ORDER BY i.fecha_registro DESC
  LIMIT 5
`, (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(res.rows, null, 2));
  }
  pool.end();
});
