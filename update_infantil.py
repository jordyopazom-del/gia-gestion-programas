import re

with open('/Users/jopazo/.gemini/antigravity/brain/f817981f-6687-4712-91e0-552750425136/scratch/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update type InfantilData
content = re.sub(
    r'proximo_control: string \| null;\n  estamento_proximo_control: string \| null;',
    r'prox_control_medico: string | null;\n  prox_control_enfermera: string | null;\n  prox_control_nutri: string | null;\n  prox_control_dental: string | null;',
    content
)

# 2. Update Edit States
content = re.sub(
    r'const \[editProxControl, setEditProxControl\] = useState\(""\);\n  const \[editProxEstamento, setEditProxEstamento\] = useState\(""\);',
    r'const [editProxControlMedico, setEditProxControlMedico] = useState("");\n  const [editProxControlEnfermera, setEditProxControlEnfermera] = useState("");\n  const [editProxControlNutri, setEditProxControlNutri] = useState("");\n  const [editProxControlDental, setEditProxControlDental] = useState("");',
    content
)

# 3. Update handleGuardarEdicion payload
content = re.sub(
    r'proximo_control: editProxControl \? `\$\{editProxControl\}-01` : null,\n      estamento_proximo_control: editProxEstamento \|\| null,',
    r'prox_control_medico: editProxControlMedico ? `${editProxControlMedico}-01` : null,\n      prox_control_enfermera: editProxControlEnfermera ? `${editProxControlEnfermera}-01` : null,\n      prox_control_nutri: editProxControlNutri ? `${editProxControlNutri}-01` : null,\n      prox_control_dental: editProxControlDental ? `${editProxControlDental}-01` : null,',
    content
)

# 4. Helper getEstadoBadge
# Replace the whole getEstadoBadge function
estado_badge_new = """
  const getEstadoBadge = (paciente: InfantilData) => {
    if (paciente.edad_anios >= 10) return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black tracking-wider border border-slate-200">ALTA POR EDAD</span>;
    if (paciente.estado_programa === 'INASISTENTE') return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black tracking-wider border border-red-200 shadow-sm flex flex-col items-center">INASISTENTE <span className="text-[8px] opacity-80 mt-0.5">({paciente.observaciones})</span></span>;
    
    // Evaluar 4 fechas
    const fechasRaw = [
      paciente.prox_control_medico,
      paciente.prox_control_enfermera,
      paciente.prox_control_nutri,
      paciente.prox_control_dental
    ];
    
    // Filtrar nulos
    const fechas = fechasRaw.filter(f => f !== null) as string[];
    
    if (fechas.length === 0) {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black tracking-wider border border-amber-200 shadow-sm">SIN AGENDAR</span>;
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let hasVencido = false;
    let hasPorVencer = false;

    for (const dateStr of fechas) {
      const d = parseLocalDate(dateStr);
      const dYear = d.getFullYear();
      const dMonth = d.getMonth();

      if (dYear < currentYear || (dYear === currentYear && dMonth < currentMonth)) {
        hasVencido = true;
      } else if (dYear === currentYear && dMonth === currentMonth) {
        hasPorVencer = true;
      }
    }

    if (hasVencido) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-black tracking-wider border border-red-200 shadow-sm flex items-center gap-1.5"><AlertCircle size={12}/> VENCIDO</span>;
    } else if (hasPorVencer) {
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black tracking-wider border border-amber-200 shadow-sm flex items-center gap-1.5"><AlertCircle size={12}/> POR VENCER</span>;
    } else {
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black tracking-wider border border-emerald-200 shadow-sm flex items-center gap-1.5"><CheckCircle2 size={12}/> VIGENTE</span>;
    }
  };
"""
# Assuming we can find the old getEstadoBadge
# It starts at: const getEstadoBadge = (paciente: InfantilData) => {
# and ends right before: const exportToExcel = () => {
content = re.sub(
    r'const getEstadoBadge = \(paciente: InfantilData\) => \{[\s\S]*?\};\n\n  const exportToExcel',
    estado_badge_new.strip() + '\n\n  const exportToExcel',
    content
)

# 5. Helper esVencido
es_vencido_new = """
  const esVencido = (p: InfantilData) => {
    if (p.estado_programa === 'INASISTENTE') return true;
    
    const fechasRaw = [
      p.prox_control_medico,
      p.prox_control_enfermera,
      p.prox_control_nutri,
      p.prox_control_dental
    ];
    
    const fechas = fechasRaw.filter(f => f !== null) as string[];
    if (fechas.length === 0) return true; // Sin agendar = Brecha

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    for (const dateStr of fechas) {
      const d = parseLocalDate(dateStr);
      const dYear = d.getFullYear();
      const dMonth = d.getMonth();
      if (dYear < currentYear || (dYear === currentYear && dMonth < currentMonth)) {
        return true;
      }
    }
    return false;
  };
"""
# Replace esVencido
content = re.sub(
    r'const esVencido = \(p: InfantilData\) => \{[\s\S]*?\};\n\n  const esRiesgo',
    es_vencido_new.strip() + '\n\n  const esRiesgo',
    content
)

# 6. Excel Export
excel_repl = """
        "Próx. Control Médico": p.prox_control_medico ? p.prox_control_medico.substring(0, 7) : "",
        "Próx. Control Enf": p.prox_control_enfermera ? p.prox_control_enfermera.substring(0, 7) : "",
        "Próx. Control Nutri": p.prox_control_nutri ? p.prox_control_nutri.substring(0, 7) : "",
        "Próx. Control Dental": p.prox_control_dental ? p.prox_control_dental.substring(0, 7) : "",
"""
content = re.sub(
    r'"Próximo Control": p.proximo_control \? p.proximo_control.substring\(0, 7\) : "",\n        "Estamento Próx Control": p.estamento_proximo_control \|\| "",',
    excel_repl.strip() + ',',
    content
)

# 7. Table Headers
headers_repl = """
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-1/4">Paciente e Identificación</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Últimas Atenciones</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Evaluación Clínica</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Próximas Atenciones</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
"""
content = re.sub(
    r'<th className="px-6 py-4 text-\[10px\] font-black uppercase text-slate-400 tracking-widest w-1/3">Paciente e Identificación</th>\n                  <th className="px-6 py-4 text-\[10px\] font-black uppercase text-slate-400 tracking-widest">Últimas Atenciones</th>\n                  <th className="px-6 py-4 text-\[10px\] font-black uppercase text-slate-400 tracking-widest">Evaluación Clínica</th>\n                  <th className="px-6 py-4 text-\[10px\] font-black uppercase text-slate-400 tracking-widest">Próximo Control</th>\n                  <th className="px-6 py-4 text-\[10px\] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>',
    headers_repl.strip(),
    content
)

# 8. Table Body Columns
body_cols = """
                  <td className="px-6 py-4 align-top">
                     <div className="flex flex-col gap-1.5">
                       <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold text-slate-500 w-12">MED:</span>
                          <span className="font-bold text-slate-600">{p.prox_control_medico ? formatMesAno(p.prox_control_medico) : '-'}</span>
                       </div>
                       <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold text-slate-500 w-12">ENF:</span>
                          <span className="font-bold text-slate-600">{p.prox_control_enfermera ? formatMesAno(p.prox_control_enfermera) : '-'}</span>
                       </div>
                       <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold text-slate-500 w-12">NUT:</span>
                          <span className="font-bold text-slate-600">{p.prox_control_nutri ? formatMesAno(p.prox_control_nutri) : '-'}</span>
                       </div>
                       <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-bold text-slate-500 w-12">DEN:</span>
                          <span className="font-bold text-slate-600">{p.prox_control_dental ? formatMesAno(p.prox_control_dental) : '-'}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-center">
                    {getEstadoBadge(p)}
                  </td>
                  <td className="px-6 py-4 align-top text-right">
"""

# Replace the old Próximo Control col and Acciones col
# The old block looks like:
#                   <td className="px-6 py-4 align-top">
#                     <div className="flex flex-col items-start gap-1">
#                       {getEstadoBadge(p)}
#                       {p.proximo_control && (
#                         <div className="flex items-center mt-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
#                           <Calendar size={12} className="text-slate-400 mr-1.5" />
#                           <span className="font-bold text-[10px] uppercase">{formatMesAno(p.proximo_control)}</span>
#                           {p.estamento_proximo_control && <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded ml-1">{p.estamento_proximo_control}</span>}
#                         </div>
#                       )}
#                     </div>
#                   </td>
#                   <td className="px-6 py-4 align-top text-right">
content = re.sub(
    r'<td className="px-6 py-4 align-top">\s*<div className="flex flex-col items-start gap-1">\s*\{getEstadoBadge\(p\)\}[\s\S]*?</td>\s*<td className="px-6 py-4 align-top text-right">',
    body_cols.strip(),
    content
)

# 9. Slide Over / Modal states init
modal_init = """
                            setEditProxControlMedico(p.prox_control_medico ? p.prox_control_medico.substring(0, 7) : "");
                            setEditProxControlEnfermera(p.prox_control_enfermera ? p.prox_control_enfermera.substring(0, 7) : "");
                            setEditProxControlNutri(p.prox_control_nutri ? p.prox_control_nutri.substring(0, 7) : "");
                            setEditProxControlDental(p.prox_control_dental ? p.prox_control_dental.substring(0, 7) : "");
"""
content = re.sub(
    r'setEditProxControl\(p.proximo_control \? p.proximo_control.substring\(0, 7\) : ""\);\n\s*setEditProxEstamento\(p.estamento_proximo_control \|\| ""\);',
    modal_init.strip(),
    content
)

# 10. Slide Over read mode dates
slide_over_dates = """
                    <div className="flex items-center gap-1.5 justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">Médico</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPaciente.prox_control_medico ? formatMesAno(selectedPaciente.prox_control_medico) : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">Enfermera</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPaciente.prox_control_enfermera ? formatMesAno(selectedPaciente.prox_control_enfermera) : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-500 font-medium">Nutricionista</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPaciente.prox_control_nutri ? formatMesAno(selectedPaciente.prox_control_nutri) : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-between py-1">
                      <span className="text-xs text-slate-500 font-medium">Odontólogo</span>
                      <span className="text-sm font-bold text-slate-800">{selectedPaciente.prox_control_dental ? formatMesAno(selectedPaciente.prox_control_dental) : '-'}</span>
                    </div>
"""
# Replace the block under <Calendar size={12} className="mr-2" /> Próximo Control
content = re.sub(
    r'<div className="flex items-center gap-1\.5">\s*<Calendar size=\{14\} className="text-slate-400" />[\s\S]*?</div>',
    slide_over_dates.strip(),
    content,
    count=1
)

# 11. Modal Edit Mode JSX
edit_mode_jsx = """
                  <div className="col-span-2 mt-2 border-t pt-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center">
                      <Calendar size={14} className="mr-1.5 text-blue-500" /> Próximas Atenciones (Espejo)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Próx. Médico (Mes/Año)</label>
                        <input type="month" value={editProxControlMedico} onChange={e => setEditProxControlMedico(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Próx. Enfermera (Mes/Año)</label>
                        <input type="month" value={editProxControlEnfermera} onChange={e => setEditProxControlEnfermera(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Próx. Nutricionista (Mes/Año)</label>
                        <input type="month" value={editProxControlNutri} onChange={e => setEditProxControlNutri(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Próx. Dental (Mes/Año)</label>
                        <input type="month" value={editProxControlDental} onChange={e => setEditProxControlDental(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                    </div>
                  </div>
"""
content = re.sub(
    r'<div>\s*<label className="block text-xs font-semibold text-slate-500 mb-1">Próximo Control \(Mes/Año\)</label>\s*<input type="month" value=\{editProxControl\}[\s\S]*?</div>\s*</div>\s*<div>\s*<label className="block text-xs font-semibold text-slate-500 mb-1">Profesional Próx. Control</label>[\s\S]*?</select>\s*</div>',
    edit_mode_jsx.strip(),
    content
)

with open('/Users/jopazo/.gemini/antigravity/brain/f817981f-6687-4712-91e0-552750425136/scratch/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

