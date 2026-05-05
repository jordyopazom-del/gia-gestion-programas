import * as XLSX from 'xlsx';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { hashPassword } from '../lib/password';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function migrar() {
  console.log('🚀 Iniciando migración masiva EMPAM desde reporte Excel...');

  try {
    // PREGUNTA PARA EL USUARIO: Deberá reemplazar esta ruta por la ruta real de su archivo Excel
    const filePath = '/Users/jopazo/Downloads/REGISTRO EMPAM 2026.xlsx';
    
    // Configurar Usuario Comodín
    const rutMigracion = '99999999-9';
    const passMigracion = hashPassword('migracion123');
    
    console.log('Creando usuario comodín de respaldo...');
    await sql`
      INSERT INTO gia_usuarios (rut, nombre, profesion, rol, password)
      VALUES (${rutMigracion}, 'MIGRACIÓN SISTEMA', 'Sistema', 'ADMINISTRATIVO', ${passMigracion})
      ON CONFLICT (rut) DO NOTHING
    `;

    const workbook = XLSX.readFile(filePath);
    
    let pacientesCreados = 0;
    let atencionesCreadas = 0;
    let pacientesIgnorados = 0;

    // Iterar por todas las hojas (meses) del libro
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📄 Leyendo pestaña: ${sheetName}...`);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log(`📊 Procesando ${data.length} registros en esta pestaña...`);

      for (const row of data as any[]) {
        const rawRut = row['Rut'];
        if (!rawRut) continue;

        // 1. Limpiar y separar RUT
        const cleanRutStr = String(rawRut).replace(/\./g, '').trim().toUpperCase();
        const parts = cleanRutStr.split('-');
        const rutNum = parseInt(parts[0]);
        const dv = parts[1] || '';

        if (isNaN(rutNum)) continue;

        // 2. Procesar Datos del Paciente
        const nombre = String(row['Nombre'] || 'SIN NOMBRE').toUpperCase();
        const telefono = String(row['CONTACTO'] || '');
        const sexo = String(row['Femenino/Masculino'] || '').toUpperCase();
        const sector = String(row['CESFAM (Sector), CECOSF o PSR'] || 'SECTOR GENERAL').toUpperCase();
        
        // Estimar fecha de nacimiento
        const edadStr = String(row['Edad'] || '65');
        const edadNum = parseInt(edadStr.replace(/\D/g, '')) || 65;
        const fechaNacimiento = new Date();
        fechaNacimiento.setFullYear(fechaNacimiento.getFullYear() - edadNum);

        // UPSERT Paciente (Solo validamos que exista, NO alteramos el Padrón)
        const existingPaciente = await sql`SELECT rut FROM gia_pacientes WHERE rut = ${rutNum}`;
        if (existingPaciente.length === 0) {
          // Ignorar paciente si no existe en el Padrón Maestro
          pacientesIgnorados++;
          continue;
        }
        // NOTA: No hacemos UPDATE aquí. El Padrón del sistema es la fuente de verdad.

        // Normalización de resultado EFAM
        const valorOriginalEfam = String(row['RESULTADO EFAM'] || 'PENDIENTE').trim();
        let resultado = 'PENDIENTE';
        const resUpper = valorOriginalEfam.toUpperCase();
        
        if (resUpper.includes('ASR') || resUpper.includes('SIN RIESGO')) resultado = 'Autovalente sin riesgo';
        else if (resUpper.includes('ACR') || resUpper.includes('CON RIESGO')) resultado = 'Autovalente con riesgo';
        else if (resUpper.includes('RDP') || resUpper.includes('RIESGO DE DEPEND')) resultado = 'Riesgo de Dependencia';
        else if (resUpper.includes('DEPENDIENTE LEVE')) resultado = 'Dependencia leve';
        else if (resUpper.includes('DEPENDIENTE MOD')) resultado = 'Dependencia moderada';
        else if (resUpper.includes('DEPENDIENTE SEVERA')) resultado = 'Dependencia severa';
        else if (resUpper !== 'PENDIENTE' && resUpper !== '') {
          // Si hay un valor pero no calza con ninguna regla estándar, lo forzamos a PENDIENTE
          resultado = 'PENDIENTE';
        }

        // Búsqueda exhaustiva de la columna Fecha debido a cabeceras sucias en el Excel
        const fechaRaw = row['Fecha'] || row['Fecha '] || row['A'] || row['c'] || row['__EMPTY'];
        
        if (fechaRaw) {
          let fechaAtencion: string = '';
          
          if (typeof fechaRaw === 'number') {
            // Número de Excel
            const date = XLSX.SSF.parse_date_code(fechaRaw);
            fechaAtencion = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else {
            const d = new Date(fechaRaw);
            if (!isNaN(d.getTime())) {
              fechaAtencion = d.toISOString().split('T')[0];
            }
          }

          if (fechaAtencion) {
            // Verificar duplicidad
            const existingAtencion = await sql`
              SELECT id FROM gia_empam 
              WHERE rut_paciente = ${rutNum} AND fecha_atencion = ${fechaAtencion}
            `;

            if (existingAtencion.length === 0) {
              // Objeto JSONB estructurado para la web
              const dataClinica = {
                migrado: true,
                profesional_original: row['Nombre profesional'] || 'Sin Profesional Registrado',
                estado_excel_original: (resultado === 'PENDIENTE' && resUpper !== 'PENDIENTE' && resUpper !== '') ? valorOriginalEfam : '',
                estado_nutricional: row['Estado nutricion'] || '',
                pertenencia_indigena: row['Pertenencia ind'] || '',
                tipo_control: row['Ingreso/Control'] || '',
                presion_arterial: row['P/A>=140/190'] || '',
                glicemia: row['Glicemia entre'] || '',
                colesterol: row['Colesterol >=200'] || '',
                sospecha_maltrato: row['Sospecha de maltrato'] || '',
                riesgo_caidas: row['Riesgo de caida'] || '',
                actividad_fisica: row['AM Act. Fis'] || '',
                fuma: row['FUMA SI/NO'] || '',
                derivacion_medico: row['DERIVACION +A'] || '',
                atencion_domiciliaria: row['ATENCION DOMICILIARIA'] || ''
              };

              await sql`
                INSERT INTO gia_empam (rut_paciente, fecha_atencion, resultado_efam, profesional_rut, data_clinica, motivo_egreso)
                VALUES (${rutNum}, ${fechaAtencion}, ${resultado}, ${rutMigracion}, ${sql.json(dataClinica)}, 'ACTIVO')
              `;
              atencionesCreadas++;
            }
          }
        }
      }
    }

    console.log('\n✅ Migración completada con éxito.');
    console.log(`🆕 Pacientes actualizados: ${pacientesCreados}`);
    console.log(`📋 Atenciones migradas/inyectadas: ${atencionesCreadas}`);
    console.log(`⚠️ Pacientes ignorados (no existen en padrón): ${pacientesIgnorados}`);

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: No se encontró el archivo Excel en la ruta especificada.');
      console.error('Por favor, edite el script y ponga la ruta correcta en "filePath".');
    } else {
      console.error('❌ Error durante la migración:', error);
    }
  } finally {
    await sql.end();
  }
}

migrar();
