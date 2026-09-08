const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

async function run() {
  try {
    const pacientes = await sql`
      SELECT p.rut
      FROM gia_pacientes p
      WHERE p.sexo = 'FEMENINO' 
        AND p.estado = 'ACTIVO'
        AND p.histerectomizada = false
      LIMIT 10
    `;

    console.log(`Encontradas ${pacientes.length} pacientes.`);
    const hoy = new Date().toISOString().split('T')[0];

    for (const p of pacientes) {
      await sql`
        INSERT INTO gia_mujer_pap (
          rut_paciente, fecha_pap, resultado, tipo_examen, 
          adecuacion_muestra, periodicidad_meses
        ) VALUES (
          ${p.rut}, ${hoy}, 'PENDIENTE', 'PAP', 
          'SATISFACTORIA', 36
        )
      `;
    }

    console.log("Exitoso");
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}

run();
