import { sql } from "../src/lib/db";
async function run() {
  const result = await sql`
    SELECT count(*) as total 
    FROM gia_pacientes p
    WHERE p.estado = 'ACTIVO'
      AND p.fecha_nacimiento IS NOT NULL
      AND DATE_PART('year', AGE(CURRENT_DATE, p.fecha_nacimiento::DATE)) >= 15
  `;
  const conEcicep = await sql`
    SELECT count(DISTINCT e.rut_paciente) as total 
    FROM gia_pacientes p
    JOIN gia_ecicep e ON p.rut = e.rut_paciente
    WHERE p.estado = 'ACTIVO'
      AND p.fecha_nacimiento IS NOT NULL
      AND DATE_PART('year', AGE(CURRENT_DATE, p.fecha_nacimiento::DATE)) >= 15
  `;
  console.log("Total >= 15:", result[0].total);
  console.log("Con ECICEP:", conEcicep[0].total);
  process.exit(0);
}
run();
