import re

with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    content = f.read()

table_pap_condition = "activeTab === 'pap' ? 'min-w-[1200px]' : 'min-w-[900px]'"
new_table_pap_condition = "activeTab === 'pap' ? 'min-w-[1200px]' : activeTab === 'embarazadas' ? 'min-w-[1100px]' : 'min-w-[900px]'"

content = content.replace(table_pap_condition, new_table_pap_condition)

# Insert the headers for embarazadas
headers_pap = """                {activeTab === "pap" ? ("""
headers_embarazadas = """                {activeTab === "embarazadas" ? (
                  <>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Identificación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Gestación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Controles</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Nutrición / Obs.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50 text-right">Acciones</th>
                  </>
                ) : activeTab === "pap" ? ("""

content = content.replace(headers_pap, headers_embarazadas)

with open("src/app/(app)/mujer/MujerClientView.tsx", "w") as f:
    f.write(content)
print("Paso 3 aplicado (tabla)")
