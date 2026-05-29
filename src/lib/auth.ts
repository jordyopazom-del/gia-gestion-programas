import { cookies } from "next/headers";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Usar un secreto por defecto en desarrollo para no forzar la configuración inmediata
const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "desarrollo_local_secreto_cesfam_gia_123");

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("CRÍTICO: Falta la variable de entorno SESSION_SECRET en producción.");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(SECRET).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(text: string): string | null {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.createHash("sha256").update(SECRET).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("gia_auth_token")?.value;
  if (!token) return null;

  const rut = decrypt(token);
  if (!rut) return null;

  return { rut };
}
