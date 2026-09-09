import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await sql`SELECT COUNT(*) as total FROM gia_infantil`;
    const recientes = await sql`
      SELECT id, rut_paciente, dsm_resultado, estado_nutricional, fecha_registro, profesional_rut
      FROM gia_infantil
      ORDER BY fecha_registro DESC
      LIMIT 5
    `;
    return NextResponse.json({ 
      total_registros: Number(count.rows[0].total), 
      ultimos_5: recientes.rows 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
