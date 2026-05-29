import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "desarrollo_local_secreto_cesfam_gia_123");

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("CRÍTICO: Falta la variable de entorno SESSION_SECRET en producción.");
}

// Convertir un ArrayBuffer a formato hexadecimal sin usar dependencias de Node
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Obtener clave criptográfica HMAC a partir del SESSION_SECRET
async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Firmar el RUT usando HMAC-SHA256 (Compatible con Edge Runtime)
export async function encrypt(rut: string): Promise<string> {
  const base64Rut = btoa(rut);
  const encoder = new TextEncoder();
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Rut));
  const hexSignature = bufToHex(signatureBuffer);
  return `${base64Rut}.${hexSignature}`;
}

// Validar y descifrar la cookie
export async function decrypt(token: string): Promise<string | null> {
  try {
    const [base64Rut, hexSignature] = token.split(".");
    if (!base64Rut || !hexSignature) return null;

    const encoder = new TextEncoder();
    const key = await getHmacKey();
    
    // Volver a calcular la firma para validar que no haya sido alterada
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(base64Rut));
    const expectedSignature = bufToHex(signatureBuffer);

    if (hexSignature === expectedSignature) {
      return atob(base64Rut);
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("gia_auth_token")?.value;
  if (!token) return null;

  const rut = await decrypt(token);
  if (!rut) return null;

  return { rut };
}
