import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const deleteQuery = await sql`
      DELETE FROM gia_mujer_embarazos
      RETURNING id, rut
    `;

    return NextResponse.json({ 
      success: true, 
      message: `Se eliminaron de raíz ${deleteQuery.length} registros de embarazo.`,
      eliminados: deleteQuery
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
