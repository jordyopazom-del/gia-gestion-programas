
import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  console.log('🚀 Iniciando Migración Respiratoria con SELLO DE SEGURIDAD...');
  
  // Limpiar migración previa para evitar duplicados en caso de error
  await sql`DELETE FROM gia_respiratorio WHERE data_clinica->>'migrado' = 'true'`;
  console.log('🧹 Limpieza de registros de migración previa completada.');
  
  const workbook = XLSX.readFile('./respiratorio_data.xlsx');
  const sheetName = 'RESPIRATORIO';
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    console.error('❌ No se encontró la pestaña RESPIRATORIO');
    process.exit(1);
  }

  const data: any[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`📊 Total filas en Excel: ${data.length}`);

  let migrados = 0;
  
  // 🧹 Limpieza Total de la tabla para evitar fantasmas
  await sql`DELETE FROM gia_respiratorio`;
  console.log('🧹 Base de datos de respiratorio vaciada por completo.');
  let ignoradosPadrion = 0;
  let fallecidos = 0;

  const rutsNoEncontrados: string[] = [];

  for (const row of data) {
    const rawRut = row['RUT']?.toString() || '';
    if (!rawRut) continue;

    // Limpiar RUT para búsqueda
    const cleanRut = rawRut.split('-')[0].replace(/\./g, '').trim();
    
    // 🛡️ SELLO DE SEGURIDAD: Verificar en Padrón Maestro
    const [paciente] = await sql`SELECT rut, nombre_completo FROM gia_pacientes WHERE rut = ${cleanRut}`;

    if (!paciente) {
      ignoradosPadrion++;
      rutsNoEncontrados.push(rawRut);
      continue;
    }

    // Verificar si es fallecido (Col P)
    const egreso = row['MOTIVO EGRESO']?.toString().toUpperCase() || '';
    if (egreso.includes('FALLECIMIENTO') || egreso.includes('FALLECIDO')) {
      fallecidos++;
      continue;
    }

    // Mapeo de fechas (Citaciones = Última Atención Real)
    const citaMed = row['CITACION MEDICO'];
    const citaKin = row['CITACION KINE'];
    const citaEsp = row['CITACION ESPIROMETRIA'];

    // Mapeo de etiquetas (Controles = Mes de Próximo Control)
    const ctrlMed = row['CONTROL MEDICO']?.toString() || '';
    const ctrlKin = row['CONTROL KINE']?.toString() || '';
    const ctrlEsp = row['ESPIROMETRIA']?.toString() || '';

    // Datos clínicos en JSON
    const dataClinica = {
      proximo_medico_label: ctrlMed,
      proximo_kine_label: ctrlKin,
      proximo_espiro_label: ctrlEsp,
      profesional_nombre: 'MIGRACIÓN EXCEL',
      migrado: true
    };


    // Lógica Clínica Estricta (Versión 4.0 - Verificada)
    const rawDiag = row['Diagnostico']?.toString().toUpperCase().replace(/\s+/g, ' ').trim() || 'SIN DIAGNÓSTICO';
    let diagnostico = rawDiag;
    let nivelControl = 'SIN EVALUAR';

    // 1. Detectar el Nivel de Control primero
    if (rawDiag.includes('PARCIALMENTE')) {
      nivelControl = 'PARCIALMENTE CONTROLADA';
    } else if (rawDiag.includes('NO CONTROLADA') || rawDiag.includes('NO CONTROLADO')) {
      nivelControl = 'NO CONTROLADA';
    } else if (rawDiag.includes('CONTROLADA') || rawDiag.includes('CONTROLADO')) {
      nivelControl = 'CONTROLADA';
    } else if (rawDiag.includes('NO EVALUADA') || rawDiag.includes('NO EVALUADO')) {
      nivelControl = 'SIN EVALUAR';
    }

    // 2. LIMPIAR EL DIAGNÓSTICO: Quitar todos los "apellidos" clínicos
    const apellidos = [
      'PARCIALMENTE CONTROLADA', 'PARCIALMENTE CONTROLADO', 'PARCIALMENTE',
      'NO CONTROLADA', 'NO CONTROLADO',
      'CONTROLADA', 'CONTROLADO',
      'NO EVALUADA', 'NO EVALUADO'
    ];

    apellidos.forEach(apellido => {
      diagnostico = diagnostico.replace(apellido, '').trim();
    });

    // Limpieza final de espacios dobles que puedan quedar
    diagnostico = diagnostico.replace(/\s+/g, ' ').trim();

    // Insertar registro en gia_respiratorio
    await sql`
      INSERT INTO gia_respiratorio (
        rut_paciente,
        diagnostico,
        nivel_control,
        cita_medico,
        cita_kine,
        cita_espiro,
        data_clinica,
        profesional_rut,
        fecha_atencion,
        motivo_egreso
      ) VALUES (
        ${cleanRut},
        ${diagnostico},
        ${nivelControl},
        ${parseExcelDate(citaMed)},
        ${parseExcelDate(citaKin)},
        ${parseExcelDate(citaEsp)},
        ${JSON.stringify(dataClinica)},
        '16805719-9',
        NOW(),
        'ACTIVO'
      )
    `;

    migrados++;
    if (migrados % 50 === 0) console.log(`⏳ Procesados ${migrados}...`);
  }

  console.log('\n--- 🏁 RESUMEN DE MIGRACIÓN ---');
  console.log(`✅ Pacientes migrados con éxito: ${migrados}`);
  console.log(`🛡️ Ignorados por no estar en Padrón: ${ignoradosPadrion}`);
  console.log(`🪦 Omitidos por fallecimiento: ${fallecidos}`);
  console.log(`-------------------------------\n`);

  if (rutsNoEncontrados.length > 0) {
    console.log('⚠️ RUTs que deben regularizarse en Padrón Maestro:');
    console.log(rutsNoEncontrados.join(', '));
  }

  process.exit(0);
}

function parseExcelDate(val: any) {
  if (!val) return null;
  let d: Date | null = null;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date((val - 25569) * 86400 * 1000);
  } else if (typeof val === 'string') {
    const parts = val.includes('/') ? val.split('/') : val.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parts[2].length === 2 ? parseInt('20' + parts[2]) : parseInt(parts[2]);
      d = new Date(year, month, day);
    } else {
      // Intentar parseo directo si no tiene el formato esperado
      d = new Date(val);
    }
  }

  // Validar que sea una fecha real (evita RangeError: Invalid time value)
  if (d && !isNaN(d.getTime())) {
    return d;
  }
  
  return null;
}

migrate();
