import { sql } from "../src/lib/db";
async function run() {
  const result = await sql`
    SELECT rut, dv, nombre_completo, sector 
    FROM gia_pacientes 
    WHERE dv IS NULL OR dv = '' OR LENGTH(dv) > 1
    LIMIT 20;
  `;
  const count = await sql`
    SELECT COUNT(*) as total
    FROM gia_pacientes 
    WHERE dv IS NULL OR dv = '' OR LENGTH(dv) > 1;
  `;
  console.log("Total patients with bad DV:", count[0].total);
  if (result.length > 0) {
    console.log("Examples:");
    console.table(result);
  }
  process.exit(0);
}
run();
