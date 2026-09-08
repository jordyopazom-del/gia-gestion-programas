import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS numero_nomina VARCHAR(50)`;
    await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS fecha_envio_nomina DATE`;
    return NextResponse.json({ success: true, message: "Migración nómina exitosa" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
