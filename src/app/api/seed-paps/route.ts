import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const pacientes = await sql`
      SELECT p.rut
      FROM gia_pacientes p
      WHERE p.sexo = 'FEMENINO' 
        AND p.estado = 'ACTIVO'
        AND p.histerectomizada = false
      LIMIT 10
    `;

    const hoy = new Date().toISOString().split('T')[0];
    let insertados = 0;

    for (const p of pacientes) {
      // Solo inserta si no tiene uno pendiente ya
      const existente = await sql`SELECT id FROM gia_mujer_pap WHERE rut_paciente = ${p.rut} AND resultado = 'PENDIENTE'`;
      if (existente.length === 0) {
        await sql`
          INSERT INTO gia_mujer_pap (
            rut_paciente, fecha_pap, resultado, tipo_examen, 
            adecuacion_muestra, periodicidad_meses
          ) VALUES (
            ${p.rut}, ${hoy}, 'PENDIENTE', 'PAP', 
            'SATISFACTORIA', 36
          )
        `;
        insertados++;
      }
    }

    return NextResponse.json({ success: true, message: `Se insertaron ${insertados} PAPs pendientes exitosamente para prueba.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
