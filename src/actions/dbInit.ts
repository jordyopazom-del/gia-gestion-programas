"use server";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function initDatabase() {
  try {
    // 1. Tabla de Usuarios (Profesionales Clínicos)
    await sql`
      CREATE TABLE IF NOT EXISTS gia_usuarios (
        rut TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        profesion TEXT,
        rol TEXT DEFAULT 'CLINICO',
        password TEXT NOT NULL
      )
    `;

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
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

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
        diagnostico TEXT,
        nivel_control TEXT,
        cita_medico DATE,
        cita_kine DATE,
        cita_espiro DATE,
        profesional_rut TEXT REFERENCES gia_usuarios(rut),
        es_inasistente BOOLEAN DEFAULT FALSE,
        motivo_egreso TEXT DEFAULT 'ACTIVO',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 5. Crear el usuario Maestro (Si no existe) para que no nos quedemos fuera
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminRut = process.env.ADMIN_RUT || '12345678-5';
    const hashedAdminPassword = hashPassword(adminPassword);
    
    await sql`
      INSERT INTO gia_usuarios (rut, nombre, profesion, rol, password)
      VALUES (${adminRut}, 'Administrador Maestro', 'Soporte TI', 'ADMIN', ${hashedAdminPassword})
      ON CONFLICT (rut) DO NOTHING
    `;

    return { success: true, message: "Base de datos inicializada correctamente con esquemas GIA." };
  } catch (error: any) {
    console.error("Error inicializando la base de datos:", error);
    return { success: false, error: error.message };
  }
}
