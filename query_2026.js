require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  const result = await sql`
    SELECT p.rut, p.dv, p.nombre_completo, e.fecha_atencion, e.resultado_efam
    FROM gia_empam e
    JOIN gia_pacientes p ON e.rut_paciente = p.rut
    WHERE extract(year from e.fecha_atencion) = 2026
    ORDER BY e.fecha_atencion DESC;
  `;
  console.log(`Encontrados: ${result.length} pacientes con fecha en 2026\n`);
  result.forEach(r => {
    console.log(`- RUT: ${r.rut}-${r.dv} | Nombre: ${r.nombre_completo} | Fecha: ${r.fecha_atencion.toISOString().split('T')[0]}`);
  });
  process.exit(0);
}
run();
