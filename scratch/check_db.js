const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function check() {
  try {
    const result = await sql`
      SELECT id, rut_paciente, nombre_completo, dsm_resultado, estado_nutricional, dsm_detalle, prox_control_medico, prox_control_enfermera 
      FROM gia_infantil 
      ORDER BY id DESC 
      LIMIT 5
    `;
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.error(e);
  }
}
check();
