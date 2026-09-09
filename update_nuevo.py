import re

with open('src/app/(app)/infantil/nuevo/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State vars
states_new = """
  const [proxControlMedico, setProxControlMedico] = useState("");
  const [proxControlEnfermera, setProxControlEnfermera] = useState("");
  const [proxControlNutri, setProxControlNutri] = useState("");
  const [proxControlDental, setProxControlDental] = useState("");
"""
content = re.sub(
    r'const \[proximoControl, setProximoControl\] = useState\(""\);\n  const \[estamentoProximoControl, setEstamentoProximoControl\] = useState\(""\);',
    states_new.strip(),
    content
)

# 2. Payload mapping
payload_new = """
        prox_control_medico: proxControlMedico ? `${proxControlMedico}-01` : null,
        prox_control_enfermera: proxControlEnfermera ? `${proxControlEnfermera}-01` : null,
        prox_control_nutri: proxControlNutri ? `${proxControlNutri}-01` : null,
        prox_control_dental: proxControlDental ? `${proxControlDental}-01` : null,
"""
content = re.sub(
    r'proximo_control: proximoControl \? `\$\{proximoControl\}-01` : null,\n        estamento_proximo_control: estamentoProximoControl \|\| null,',
    payload_new.strip(),
    content
)

# 3. JSX
jsx_new = """
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Próx. Médico (Mes/Año)</label>
                <input 
                  type="month" 
                  value={proxControlMedico} 
                  onChange={(e) => setProxControlMedico(e.target.value)} 
                  className="w-full rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Próx. Enfermera (Mes/Año)</label>
                <input 
                  type="month" 
                  value={proxControlEnfermera} 
                  onChange={(e) => setProxControlEnfermera(e.target.value)} 
                  className="w-full rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Próx. Nutricionista (Mes/Año)</label>
                <input 
                  type="month" 
                  value={proxControlNutri} 
                  onChange={(e) => setProxControlNutri(e.target.value)} 
                  className="w-full rounded-xl border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Próx. Odontólogo (Mes/Año)</label>
                <input 
                  type="month" 
                  value={proxControlDental} 
                  onChange={(e) => setProxControlDental(e.target.value)} 
                  className="w-full rounded-xl border-slate-200 text-sm"
                />
              </div>
            </div>
"""
# Find the JSX block
#             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
#               <div>
#                 <label className="block text-xs font-bold text-slate-500 mb-2">Fecha Próximo Control (Mes/Año)</label>
#                 ...
#                 </select>
#               </div>
#             </div>
content = re.sub(
    r'<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\s*<div>\s*<label className="block text-xs font-bold text-slate-500 mb-2">Fecha Próximo Control \(Mes/Año\)</label>[\s\S]*?</select>\s*</div>\s*</div>',
    jsx_new.strip(),
    content
)

with open('src/app/(app)/infantil/nuevo/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

