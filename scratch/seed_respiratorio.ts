import { sql } from "../src/lib/db";

async function seed() {
  console.log("Inyectando población de prueba para Respiratorio...");

  const pacientes = [
    { rut: "11111111", dv: "1", nombre: "JUAN PEREZ SOTO", sector: "SECTOR 1", fecha_nac: "1955-05-10", tel: "+56912345678" },
    { rut: "22222222", dv: "2", nombre: "MARIA GONZALEZ LARA", sector: "SECTOR 2", fecha_nac: "1960-08-15", tel: "+56987654321" },
    { rut: "33333333", dv: "3", nombre: "PEDRO TAPIA RUIZ", sector: "NONTUELA", fecha_nac: "1948-03-20", tel: "" },
    { rut: "44444444", dv: "4", nombre: "ANA MORALES VERA", sector: "LLIFEN", fecha_nac: "1975-12-01", tel: "+56955544433" },
    { rut: "55555555", dv: "5", nombre: "CARLOS ITURRA DIAZ", sector: "SECTOR 1", fecha_nac: "1982-01-25", tel: "+56911122233" }
  ];

  for (const p of pacientes) {
    await sql`
      INSERT INTO gia_pacientes (rut, dv, nombre_completo, sector, fecha_nacimiento, telefono, estado)
      VALUES (${p.rut}, ${p.dv}, ${p.nombre}, ${p.sector}, ${p.fecha_nac}, ${p.tel}, 'ACTIVO')
      ON CONFLICT (rut) DO NOTHING
    `;
  }

  // Registros Respiratorios
  const hoy = new Date();
  const hace5Meses = new Date(); hace5Meses.setMonth(hoy.getMonth() - 5);
  const hace13Meses = new Date(); hace13Meses.setFullYear(hoy.getFullYear() - 1); hace13Meses.setMonth(hace13Meses.getMonth() - 1);
  const hace1Mes = new Date(); hace1Mes.setMonth(hoy.getMonth() - 1);

  const atenciones = [
    { rut: "11111111", diag: "ASMA MODERADA", ctrl: "CONTROLADO", fecha: hace1Mes, kine: hace1Mes, espiro: hace1Mes, inas: false },
    { rut: "22222222", diag: "EPOC TIPO B", ctrl: "PARCIALMENTE CONTROLADO", fecha: hace5Meses, kine: hace5Meses, espiro: hace13Meses, inas: false },
    { rut: "33333333", diag: "ASMA SEVERA", ctrl: "NO CONTROLADO", fecha: hace1Mes, kine: hace1Mes, espiro: null, inas: true },
    { rut: "44444444", diag: "SBOR", ctrl: "CONTROLADO", fecha: hoy, kine: hoy, espiro: null, inas: false }
  ];

  for (const a of atenciones) {
    await sql`
      INSERT INTO gia_respiratorio (rut_paciente, diagnostico, nivel_control, fecha_atencion, cita_kine, cita_espiro, es_inasistente)
      VALUES (${a.rut}, ${a.diag}, ${a.ctrl}, ${a.fecha}, ${a.kine}, ${a.espiro}, ${a.inas})
    `;
  }

  console.log("✅ Población de prueba inyectada con éxito.");
}

seed().catch(console.error);
