// src/app/api/sso/route.ts
// Receptor SSO — Procesa tokens de la Intranet (cesfamfutrono.net)

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encrypt } from "@/lib/auth";
import { sql } from "@/lib/db";

// Firebase Admin SDK
import admin from "firebase-admin";

// Forzar Node.js runtime (firebase-admin no es compatible con Edge)
export const runtime = "nodejs";

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminDb = admin.firestore();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nonce = searchParams.get("sso_nonce");

  if (!nonce) {
    return redirect("/login");
  }

  try {
    // 1. Leer el token de Firestore
    const doc = await adminDb.collection("sso_tokens").doc(nonce).get();

    if (!doc.exists) {
      return redirect("/login?error=invalid_token");
    }

    const data = doc.data()!;

    // 2. Verificar expiración (60 segundos)
    const now = new Date();
    const expiresAt = data.expiresAt.toDate();

    if (now > expiresAt) {
      await adminDb.collection("sso_tokens").doc(nonce).delete();
      return redirect("/login?error=token_expired");
    }

    // 3. Eliminar nonce inmediatamente (un solo uso)
    await adminDb.collection("sso_tokens").doc(nonce).delete();

    // 4. Buscar usuario local por email
    const email = data.email;
    const result = await sql`
      SELECT rut, nombre, email, rol FROM gia_usuarios WHERE LOWER(email) = ${email.toLowerCase()}
    `;

    if (result.length === 0) {
      return redirect("/login?error=user_not_registered");
    }

    const user = result[0];

    // 5. Verificar que no esté inactivo
    if (user.rol === "INACTIVO") {
      return redirect("/login?error=user_not_registered");
    }

    // 6. Crear sesión (encrypt firma el RUT con HMAC-SHA256)
    const session = await encrypt(user.rut);

    // 7. Setear cookie de sesión
    const cookieStore = await cookies();
    cookieStore.set("gia_auth_token", session, {
      httpOnly: true,
      sameSite: "lax", // OBLIGATORIO: "strict" rompe SSO cross-site
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 horas de turno
      path: "/",
    });

    // 8. Redirigir al dashboard
    return redirect("/dashboard");

  } catch (error: any) {
    // CRÍTICO: Relanzar excepciones NEXT_REDIRECT
    // redirect() de Next.js lanza esta excepción internamente.
    // Si no se relanza, el catch la trata como error genérico.
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("[SSO] Error al procesar nonce:", error);
    return redirect("/login?error=sso_failed");
  }
}
