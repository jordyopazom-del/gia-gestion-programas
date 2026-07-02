import { sql } from "../src/lib/db";

async function run() {
  try {
    const result = await sql`
      WITH UltimoPap AS (
        SELECT rut_paciente, fecha_pap, resultado, tipo_examen, adecuacion_muestra,
               motivo_insatisfactoria, fecha_resultado, derivado_upc, fecha_derivacion_upc,
               ROW_NUMBER() OVER(PARTITION BY rut_paciente ORDER BY fecha_pap DESC) as rn
        FROM gia_mujer_pap
      )
      SELECT 
        p.rut, p.dv, p.nombre_completo, TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, p.sector, p.telefono, p.direccion,
        p.estado, p.motivo_egreso, p.fecha_egreso, p.es_pad,
        p.histerectomizada, TO_CHAR(p.fecha_histerectomia, 'YYYY-MM-DD') as fecha_histerectomia, p.causa_histerectomia,
        TO_CHAR(pap.fecha_pap, 'YYYY-MM-DD') as ultima_fecha_pap,
        pap.resultado as ultimo_resultado_pap,
        pap.tipo_examen as ultimo_tipo_examen,
        pap.adecuacion_muestra as ultima_adecuacion_muestra,
        pap.motivo_insatisfactoria as ultimo_motivo_insatisfactoria,
        TO_CHAR(pap.fecha_resultado, 'YYYY-MM-DD') as ultima_fecha_resultado,
        pap.derivado_upc as ultimo_derivado_upc,
        TO_CHAR(pap.fecha_derivacion_upc, 'YYYY-MM-DD') as ultima_fecha_derivacion_upc
      FROM gia_pacientes p
      LEFT JOIN UltimoPap pap ON p.rut = pap.rut_paciente AND pap.rn = 1
      WHERE p.sexo = 'FEMENINO'
      ORDER BY p.nombre_completo ASC
      LIMIT 1
    `;
    console.log("Resultado exitoso:", result);
  } catch (e: any) {
    console.error("ERROR EN LA QUERY:", e.message);
  }
  process.exit(0);
}

run();
