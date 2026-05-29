"use server";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getCurrentUser } from "@/actions/userActions";

export async function initDatabase() {
  try {
    // Validar si la base de datos ya está inicializada (si existe la tabla gia_usuarios con registros)
    let totalUsuarios = 0;
    try {
      const res = await sql`SELECT COUNT(*)::int as count FROM gia_usuarios`;
      totalUsuarios = res[0].count;
    } catch (err: any) {
      // Si la tabla no existe (error 42P01 o text match), se asume que no hay usuarios creados
      if (err.message?.includes("does not exist") || err.code === "42P01") {
        totalUsuarios = 0;
      } else {
        throw err;
      }
    }

    if (totalUsuarios > 0) {
      // Si ya existen usuarios creados, requerir privilegios de ADMINISTRADOR de forma obligatoria
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.rol !== "ADMINISTRADOR") {
        return { success: false, error: "No autorizado. Se requieren privilegios de Administrador para re-ejecutar la inyección base." };
      }
    }
    await sql`
      CREATE TABLE IF NOT EXISTS gia_usuarios (
        rut TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        profesion TEXT,
        rol TEXT DEFAULT 'CLINICO',
        password TEXT NOT NULL,
        accesos TEXT[] DEFAULT ARRAY[]::TEXT[]
      )
    `;

    // Asegurar que la columna accesos exista (por si la tabla ya existía antes)
    try {
      await sql`ALTER TABLE gia_usuarios ADD COLUMN IF NOT EXISTS accesos TEXT[] DEFAULT ARRAY[]::TEXT[]`;
    } catch (e) {
      console.log("Columna accesos ya existe o error al crearla");
    }

    // 2. Tabla del Padrón Maestro de Pacientes
    await sql`
      CREATE TABLE IF NOT EXISTS gia_pacientes (
        rut TEXT PRIMARY KEY,
        dv TEXT,
        nombre_completo TEXT,
        fecha_nacimiento DATE,
        sector TEXT,
        telefono TEXT,
        direccion TEXT,
        sexo TEXT,
        es_pad BOOLEAN DEFAULT FALSE,
        estado TEXT DEFAULT 'ACTIVO',
        estado_registro TEXT DEFAULT 'OFICIAL', -- OFICIAL o PROVISORIO
        motivo_egreso TEXT,
        fecha_egreso TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Asegurar que la columna es_pad exista (por si la tabla ya existía antes)
    try {
      await sql`ALTER TABLE gia_pacientes ADD COLUMN IF NOT EXISTS es_pad BOOLEAN DEFAULT FALSE`;
    } catch (e) {
      console.log("Columna es_pad ya existe o error al crearla");
    }

    // 3. Tabla de Programa Adulto Mayor (EMPAM)
    await sql`
      CREATE TABLE IF NOT EXISTS gia_empam (
        id SERIAL PRIMARY KEY,
        rut_paciente TEXT REFERENCES gia_pacientes(rut),
        fecha_atencion DATE NOT NULL,
        resultado_efam TEXT,
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        data_clinica JSONB,
        motivo_egreso TEXT DEFAULT 'ACTIVO',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 4. Tabla de Programa Respiratorio (ERA/IRA)
    await sql`
      CREATE TABLE IF NOT EXISTS gia_respiratorio (
        id SERIAL PRIMARY KEY,
        rut_paciente TEXT REFERENCES gia_pacientes(rut),
        fecha_atencion DATE NOT NULL DEFAULT CURRENT_DATE,
        tipo_atencion TEXT, -- INGRESO, CONTROL, REINGRESO
        diagnostico TEXT,
        nivel_control TEXT,
        cita_medico DATE,
        cita_kine DATE,
        cita_espiro DATE,
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        es_pad BOOLEAN DEFAULT FALSE,
        es_inasistente BOOLEAN DEFAULT FALSE,
        observaciones TEXT,
        data_clinica JSONB, -- Para labels de último control y otros datos extendidos
        motivo_egreso TEXT DEFAULT 'ACTIVO',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Tabla de Solicitudes de Acceso
    await sql`
      CREATE TABLE IF NOT EXISTS gia_solicitudes_acceso (
        id SERIAL PRIMARY KEY,
        rut TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        profesion TEXT NOT NULL,
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'PENDIENTE'
      )
    `;

    // 6. Tabla de Programa de la Mujer - PAP
    await sql`
      CREATE TABLE IF NOT EXISTS gia_mujer_pap (
        id SERIAL PRIMARY KEY,
        rut_paciente TEXT REFERENCES gia_pacientes(rut),
        fecha_pap DATE NOT NULL,
        resultado TEXT DEFAULT 'PENDIENTE',
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        observaciones TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Crear el usuario Maestro (Si no existe)
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminRut = process.env.ADMIN_RUT || '12345678-5';
    const hashedAdminPassword = hashPassword(adminPassword);

    await sql`
      INSERT INTO gia_usuarios (rut, nombre, profesion, rol, password)
      VALUES (${adminRut}, 'Administrador Maestro', 'Soporte TI', 'ADMINISTRADOR', ${hashedAdminPassword})
      ON CONFLICT (rut) DO UPDATE SET rol = 'ADMINISTRADOR'
    `;

    return { success: true, message: "Base de datos inicializada correctamente con esquemas GIA." };
  } catch (error: any) {
    console.error("Error inicializando la base de datos:", error);
    return { success: false, error: error.message };
  }
}
