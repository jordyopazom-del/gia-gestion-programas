
import { sql } from '../src/lib/db';

async function seedV2() {
  console.log('💉 Iniciando Seed Respiratorio V2 (Vivito y Coleando)...');

  // Limpiar datos previos de respiratorio (opcional, pero mejor para ver el cambio limpio)
  await sql`DELETE FROM gia_respiratorio`;

  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const patients = [
    {
      rut: 44444444, // ANA MORALES
      atencion: formatDate(now),
      tipo: 'CONTROL KINESIOLÓGICO',
      diag: 'SBOR',
      ctrl: 'CONTROLADO',
      next_med: { mes: 'AGOSTO 2026', date: '2026-08-01' },
      next_kin: { mes: 'SEPTIEMBRE 2026', date: '2026-09-01' },
      next_esp: { mes: 'MAYO 2027', date: '2027-05-01' }
    },
    {
      rut: 11111111, // JUAN PEREZ
      atencion: '2024-02-15',
      tipo: 'CONTROL MÉDICO',
      diag: 'ASMA MODERADA',
      ctrl: 'PARCIALMENTE CONTROLADO',
      next_med: { mes: 'JUNIO 2026', date: '2026-06-01' },
      next_kin: { mes: 'MAYO 2026', date: '2026-05-10' }, // Próximo (en 5 días)
      next_esp: { mes: 'DICIEMBRE 2026', date: '2026-12-01' }
    },
    {
      rut: 22222222, // MARIA GONZALEZ
      atencion: '2023-05-01',
      tipo: 'ESPIROMETRÍA',
      diag: 'EPOC TIPO B',
      ctrl: 'NO CONTROLADO',
      next_med: { mes: 'MARZO 2026', date: '2026-03-01' }, // Vencido
      next_kin: { mes: 'ABRIL 2026', date: '2026-04-01' }, // Vencido
      next_esp: { mes: 'MAYO 2025', date: '2025-05-01' }  // Vencido
    }
  ];

  for (const p of patients) {
    await sql`
      INSERT INTO gia_respiratorio (
        rut_paciente, fecha_atencion, tipo_atencion, diagnostico, nivel_control,
        cita_medico, cita_kine, cita_espiro, profesional_rut, data_clinica
      ) VALUES (
        ${p.rut}, ${p.atencion}, ${p.tipo}, ${p.diag}, ${p.ctrl},
        ${p.next_med.date}, ${p.next_kin.date}, ${p.next_esp.date}, '16805719-9',
        ${JSON.stringify({
          proximo_medico_label: p.next_med.mes,
          proximo_kine_label: p.next_kin.mes,
          proximo_espiro_label: p.next_esp.mes,
          profesional_nombre: 'ADMINISTRADOR MAESTRO'
        })}
      )
    `;
  }

  console.log('✅ Seed V2 Completado. ¡Dashboard actualizado!');
  process.exit(0);
}

seedV2().catch(console.error);
