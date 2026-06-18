import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { decrypt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gia_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, { status: 401 });
    }

    const rut = await decrypt(token);
    if (!rut) {
      return NextResponse.json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, { status: 401 });
    }

    const body = await req.json();
    const { nuevaPass, pregunta, respuesta } = body;

    if (!nuevaPass || !pregunta || !respuesta) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
    }

    const hashedPassword = hashPassword(nuevaPass);
    const respuestaLimpia = respuesta.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hashedRespuesta = hashPassword(respuestaLimpia);

    await sql`
      UPDATE gia_usuarios 
      SET 
        password = ${hashedPassword}, 
        pregunta_seguridad = ${pregunta},
        respuesta_seguridad = ${hashedRespuesta},
        debe_cambiar_password = FALSE 
      WHERE rut = ${rut}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API cambiar-password] ERROR:", error?.message);
    return NextResponse.json({ error: `Error interno: ${error?.message || "desconocido"}` }, { status: 500 });
  }
}
