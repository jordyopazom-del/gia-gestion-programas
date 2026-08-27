import postgres from "postgres";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS gia_mujer_embarazos (
        id SERIAL PRIMARY KEY,
        rut VARCHAR(12) NOT NULL REFERENCES gia_pacientes(rut) ON DELETE CASCADE,
        fum DATE NOT NULL,
        fpp DATE NOT NULL,
        fecha_ultimo_control DATE,
        fecha_proximo_control DATE,
        estado_nutricional VARCHAR(50),
        observaciones TEXT,
        estado VARCHAR(20) DEFAULT 'EMBARAZO' CHECK (estado IN ('EMBARAZO', 'PUERPERIO', 'FINALIZADO')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("Tabla gia_mujer_embarazos creada exitosamente.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
