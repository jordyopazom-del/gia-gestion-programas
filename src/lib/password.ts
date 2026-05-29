import crypto from "crypto";

const ITERATIONS = 10000;
const KEYLEN = 64;
const DIGEST = "sha256";

// Retorna el hash en formato: "pbkdf2:salt:hash"
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash) return false;

    // Soporte para hashes pbkdf2 (nuevo formato)
    if (storedHash.startsWith("pbkdf2:")) {
      const [, salt, key] = storedHash.split(":");
      if (!salt || !key) return false;
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    }

    // Soporte para hashes scrypt (formato legado)
    if (storedHash.startsWith("scrypt:")) {
      const [, salt, key] = storedHash.split(":");
      if (!salt || !key) return false;
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    }

    // Si no coincide con ningún hash seguro, la contraseña no es válida
    return false;
  } catch (e) {
    return false;
  }
}
