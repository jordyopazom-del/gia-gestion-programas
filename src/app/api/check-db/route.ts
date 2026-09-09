import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const count = await sql`SELECT COUNT(*) as total FROM gia_infantil`;
    const recientes = await sql`
      SELECT i.id, i.rut_paciente, i.dsm_resultado, i.estado_nutricional, i.dsm_detalle, i.fecha_registro, i.profesional_rut
      FROM gia_infantil i
      ORDER BY i.fecha_registro DESC
      LIMIT 5
    `;
    return NextResponse.json({ total_registros: count.rows[0].total, ultimos_5: recientes.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
