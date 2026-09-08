import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    // Borra SOLO los registros creados HOY con resultado PENDIENTE
    const deleteQuery = await sql`
      DELETE FROM gia_mujer_pap
      WHERE fecha_pap = CURRENT_DATE 
        AND resultado = 'PENDIENTE'
      RETURNING id, rut_paciente, numero_nomina
    `;

    return NextResponse.json({ 
      success: true, 
      message: `Se eliminaron de raíz ${deleteQuery.length} exámenes de prueba.`,
      eliminados: deleteQuery
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
