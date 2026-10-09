import { sql } from "@/lib/db";

// Límite de intentos fallidos por RUT (no por IP: todo el CESFAM sale por la misma IP pública).
export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;

export type TipoIntento = "login" | "reset";

let tablaLista = false;

async function asegurarTabla() {
  if (tablaLista) return;
  await sql`
    CREATE TABLE IF NOT EXISTS gia_intentos_acceso (
      clave TEXT NOT NULL,
      tipo TEXT NOT NULL,
      intentos INT NOT NULL DEFAULT 0,
      ultimo_intento TIMESTAMPTZ NOT NULL DEFAULT now(),
      bloqueado_hasta TIMESTAMPTZ,
      PRIMARY KEY (clave, tipo)
    )
  `;
  tablaLista = true;
}

// Devuelve los minutos que faltan para que termine el bloqueo (0 si no está bloqueado).
export async function minutosDeBloqueo(clave: string, tipo: TipoIntento): Promise<number> {
  await asegurarTabla();
  const res = await sql`
    SELECT CEIL(EXTRACT(EPOCH FROM (bloqueado_hasta - now())) / 60)::int AS minutos
    FROM gia_intentos_acceso
    WHERE clave = ${clave} AND tipo = ${tipo} AND bloqueado_hasta > now()
  `;
  return res.length > 0 ? Number(res[0].minutos) : 0;
}

// Suma un intento fallido. Si pasaron más de MINUTOS_BLOQUEO desde el último, la cuenta parte de cero.
export async function registrarFallo(clave: string, tipo: TipoIntento): Promise<{ restantes: number; bloqueado: boolean }> {
  await asegurarTabla();
  const nuevo = sql`(CASE
    WHEN gia_intentos_acceso.ultimo_intento < now() - make_interval(mins => ${MINUTOS_BLOQUEO})
    THEN 1 ELSE gia_intentos_acceso.intentos + 1 END)`;
  const res = await sql`
    INSERT INTO gia_intentos_acceso (clave, tipo, intentos, ultimo_intento)
    VALUES (${clave}, ${tipo}, 1, now())
    ON CONFLICT (clave, tipo) DO UPDATE SET
      intentos = ${nuevo},
      ultimo_intento = now(),
      bloqueado_hasta = CASE WHEN ${nuevo} >= ${MAX_INTENTOS}
        THEN now() + make_interval(mins => ${MINUTOS_BLOQUEO}) ELSE NULL END
    RETURNING intentos, bloqueado_hasta IS NOT NULL AS bloqueado
  `;
  const intentos = Number(res[0].intentos);
  return { restantes: Math.max(MAX_INTENTOS - intentos, 0), bloqueado: Boolean(res[0].bloqueado) };
}

export async function limpiarIntentos(clave: string, tipo: TipoIntento) {
  await asegurarTabla();
  await sql`DELETE FROM gia_intentos_acceso WHERE clave = ${clave} AND tipo = ${tipo}`;
}

export function mensajeBloqueo(minutos: number) {
  return `Demasiados intentos fallidos. Acceso bloqueado por ${minutos} min. Intente más tarde o contacte al Administrador.`;
}

export function mensajeFallo(restantes: number, bloqueado: boolean, base: string) {
  if (bloqueado) return mensajeBloqueo(MINUTOS_BLOQUEO);
  return `${base}. Le quedan ${restantes} intentos antes de bloquear el acceso por ${MINUTOS_BLOQUEO} minutos.`;
}
