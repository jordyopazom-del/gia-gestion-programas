import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sql`
      ALTER TABLE gia_infantil
      ADD COLUMN IF NOT EXISTS prox_control_medico VARCHAR(7),
      ADD COLUMN IF NOT EXISTS prox_control_enfermera VARCHAR(7),
      ADD COLUMN IF NOT EXISTS prox_control_nutri VARCHAR(7),
      ADD COLUMN IF NOT EXISTS prox_control_dental VARCHAR(7);
    `;
    return NextResponse.json({ success: true, message: "Campos de próximos controles agregados correctamente." });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
