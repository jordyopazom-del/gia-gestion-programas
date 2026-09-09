import re

with open('src/app/(app)/infantil/nuevo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_nsp = r'<label className="block text-xs font-bold text-slate-500 mb-2">Próximo Control Programado</label>\s*<div className="flex gap-3">\s*<input \s*type="month" \s*min=\{new Date\(\)\.toISOString\(\)\.substring\(0, 7\)\}\s*value=\{proximoControl\} \s*onChange=\{\(e\) => setProximoControl\(e\.target\.value\)\} \s*className="flex-1 rounded-xl border-slate-200"\s*/>\s*<select \s*value=\{estamentoProximoControl\} \s*onChange=\{\(e\) => setEstamentoProximoControl\(e\.target\.value\)\} \s*className="flex-1 rounded-xl border-slate-200"\s*>\s*<option value="">Estamento\.\.\.</option>\s*<option value="MEDICO">Médico</option>\s*<option value="ENFERMERA">Enfermera</option>\s*<option value="NUTRICIONISTA">Nutricionista</option>\s*<option value="DENTAL">Dental</option>\s*</select>\s*</div>'

new_nsp = """
                <label className="block text-xs font-bold text-slate-500 mb-2">Próximas Atenciones Programadas (Mes/Año)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input type="month" value={proxControlMedico} onChange={(e) => setProxControlMedico(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" placeholder="Médico"/>
                  <input type="month" value={proxControlEnfermera} onChange={(e) => setProxControlEnfermera(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" placeholder="Enfermera"/>
                  <input type="month" value={proxControlNutri} onChange={(e) => setProxControlNutri(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" placeholder="Nutricionista"/>
                  <input type="month" value={proxControlDental} onChange={(e) => setProxControlDental(e.target.value)} className="w-full rounded-xl border-slate-200 text-sm" placeholder="Dental"/>
                </div>
"""

content = re.sub(old_nsp, new_nsp.strip(), content)

with open('src/app/(app)/infantil/nuevo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
