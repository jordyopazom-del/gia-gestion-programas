import crypto from "crypto";

// Retorna el hash en formato: "scrypt:salt:hash"
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    // Para soportar contraseñas antiguas o en texto plano si las hubiera
    if (!storedHash.startsWith("scrypt:")) {
      return password === storedHash;
    }

    const [algo, salt, key] = storedHash.split(":");
    if (algo !== "scrypt" || !salt || !key) return false;
    
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}
