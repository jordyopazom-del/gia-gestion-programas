import { sql } from "../src/lib/db";

function calcularDV(rutNum: string): string {
  let t = parseInt(rutNum, 10);
  let m = 0, s = 1;
  for (; t; t = Math.floor(t / 10)) {
    s = (s + (t % 10) * (9 - m++ % 6)) % 11;
  }
  return s ? String(s - 1) : 'K';
}

async function run() {
  const pacientes = await sql`
    SELECT rut 
    FROM gia_pacientes 
    WHERE dv IS NULL OR dv = '' OR LENGTH(dv) > 1;
  `;
  
  console.log(`Encontrados ${pacientes.length} pacientes sin DV correcto. Reparando...`);
  let fixed = 0;
  
  for (const p of pacientes) {
    const correctDv = calcularDV(p.rut);
    await sql`
      UPDATE gia_pacientes 
      SET dv = ${correctDv}
      WHERE rut = ${p.rut};
    `;
    fixed++;
  }
  
  console.log(`¡Reparación completada! ${fixed} pacientes actualizados con su dígito verificador correcto.`);
  process.exit(0);
}
run();
