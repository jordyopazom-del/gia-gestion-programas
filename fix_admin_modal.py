import re

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = r'<div>\s*<label className="block text-xs font-bold text-slate-500 mb-1">Mes y Año \(Correspondiente\)</label>\s*<input \s*type="month" \s*min=\{new Date\(\)\.toISOString\(\)\.substring\(0, 7\)\}\s*value=\{editProxControl\} \s*onChange=\{e => setEditProxControl\(e\.target\.value\)\} \s*className="w-full text-sm border-slate-300 rounded-lg" \s*/>\s*</div>\s*<div>\s*<label className="block text-xs font-bold text-slate-500 mb-1">Estamento Próx\. Control</label>\s*<select value=\{editProxEstamento\} onChange=\{e => setEditProxEstamento\(e\.target\.value\)\} className="w-full text-sm border-slate-300 rounded-lg">\s*<option value="">Sin asignar / Seleccionar\.\.\.</option>\s*<option value="MEDICO">Médico</option>\s*<option value="ENFERMERA">Enfermera</option>\s*<option value="NUTRICIONISTA">Nutricionista</option>\s*<option value="DENTAL">Dental</option>\s*</select>\s*</div>'

new_block = """
                  <div className="col-span-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Próximas Atenciones (Mes/Año)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Médico</label>
                        <input type="month" value={editProxControlMedico} onChange={e => setEditProxControlMedico(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Enfermera</label>
                        <input type="month" value={editProxControlEnfermera} onChange={e => setEditProxControlEnfermera(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nutricionista</label>
                        <input type="month" value={editProxControlNutri} onChange={e => setEditProxControlNutri(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Odontólogo</label>
                        <input type="month" value={editProxControlDental} onChange={e => setEditProxControlDental(e.target.value)} className="w-full text-sm border-slate-300 rounded-lg"/>
                      </div>
                    </div>
                  </div>
"""

content = re.sub(old_block, new_block.strip(), content)

with open('src/app/(app)/infantil/InfantilClientView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
