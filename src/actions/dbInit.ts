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
        histerectomizada BOOLEAN DEFAULT FALSE,
        fecha_histerectomia DATE,
        causa_histerectomia TEXT,
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
      await sql`ALTER TABLE gia_pacientes ADD COLUMN IF NOT EXISTS histerectomizada BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE gia_pacientes ADD COLUMN IF NOT EXISTS fecha_histerectomia DATE`;
      await sql`ALTER TABLE gia_pacientes ADD COLUMN IF NOT EXISTS causa_histerectomia TEXT`;
    } catch (e) {
      console.log("Columna es_pad o columnas de histerectomía ya existen o error al crearlas");
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
        tipo_examen TEXT DEFAULT 'PAP',
        adecuacion_muestra TEXT DEFAULT 'SATISFACTORIA',
        motivo_insatisfactoria TEXT,
        fecha_resultado DATE,
        derivado_upc BOOLEAN DEFAULT FALSE,
        fecha_derivacion_upc DATE,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Asegurar que las nuevas columnas existan por si la tabla ya existía
    try {
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS tipo_examen TEXT DEFAULT 'PAP'`;
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS adecuacion_muestra TEXT DEFAULT 'SATISFACTORIA'`;
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS motivo_insatisfactoria TEXT`;
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS fecha_resultado DATE`;
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS derivado_upc BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE gia_mujer_pap ADD COLUMN IF NOT EXISTS fecha_derivacion_upc DATE`;
    } catch (e) {
      console.log("Columnas extendidas de gia_mujer_pap ya existen o error al crearlas");
    }

    // 7. Tabla de Programa ECICEP
    await sql`
      CREATE TABLE IF NOT EXISTS gia_ecicep (
        id SERIAL PRIMARY KEY,
        rut_paciente TEXT REFERENCES gia_pacientes(rut) ON DELETE CASCADE,
        fecha_atencion DATE NOT NULL DEFAULT CURRENT_DATE,
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        categoria TEXT NOT NULL,
        diagnosticos TEXT[] DEFAULT ARRAY[]::TEXT[],
        polifarmacia BOOLEAN DEFAULT FALSE,
        funcionalidad TEXT,
        deterioro_cognitivo BOOLEAN DEFAULT FALSE,
        riesgo_social BOOLEAN DEFAULT FALSE,
        hospitalizacion_reciente BOOLEAN DEFAULT FALSE,
        consultas_urgencia INTEGER DEFAULT 0,
        gestor_rut TEXT REFERENCES gia_usuarios(rut),
        observaciones TEXT,
        cita_medico DATE,
        cita_enfermero DATE,
        cita_nutri DATE,
        cita_kine DATE,
        data_clinica JSONB,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Asegurar que las columnas de seguimiento existan
    try {
      await sql`ALTER TABLE gia_ecicep ADD COLUMN IF NOT EXISTS cita_medico DATE`;
      await sql`ALTER TABLE gia_ecicep ADD COLUMN IF NOT EXISTS cita_enfermero DATE`;
      await sql`ALTER TABLE gia_ecicep ADD COLUMN IF NOT EXISTS cita_nutri DATE`;
      await sql`ALTER TABLE gia_ecicep ADD COLUMN IF NOT EXISTS cita_kine DATE`;
    } catch (e) {
      console.log("Columnas de seguimiento ECICEP ya existen o error al crearlas");
    }

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
