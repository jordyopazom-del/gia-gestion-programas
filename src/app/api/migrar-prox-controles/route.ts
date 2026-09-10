import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sql`
      ALTER TABLE gia_infantil
      ADD COLUMN IF NOT EXISTS prox_control_medico VARCHAR(15),
      ADD COLUMN IF NOT EXISTS prox_control_enfermera VARCHAR(15),
      ADD COLUMN IF NOT EXISTS prox_control_nutri VARCHAR(15),
      ADD COLUMN IF NOT EXISTS prox_control_dental VARCHAR(15);
    `;

    // Si ya existían como VARCHAR(7), ampliarlas a VARCHAR(15)
    await sql`
      ALTER TABLE gia_infantil
      ALTER COLUMN prox_control_medico TYPE VARCHAR(15),
      ALTER COLUMN prox_control_enfermera TYPE VARCHAR(15),
      ALTER COLUMN prox_control_nutri TYPE VARCHAR(15),
      ALTER COLUMN prox_control_dental TYPE VARCHAR(15);
    `;

    // Asegurar columna en_sala_estimulacion
    await sql`
      ALTER TABLE gia_infantil
      ADD COLUMN IF NOT EXISTS en_sala_estimulacion BOOLEAN DEFAULT FALSE;
    `;

    return NextResponse.json({ success: true, message: "Campos ampliados y verificados exitosamente." });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
