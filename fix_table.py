import re

with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    content = f.read()

# Fix the body section where th were wrongly placed
wrong_body = """                      {activeTab === "embarazadas" ? (
                  <>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Identificación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Gestación</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Controles</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">Nutrición / Obs.</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50 text-right">Acciones</th>
                  </>
                ) : activeTab === "pap" ? ("""

correct_body = """                      {activeTab === "embarazadas" ? (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded w-fit">
                                E.G: {p.fum ? calcularSemanasGestacion(p.fum) : "-"} semanas
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                FPP: {p.fpp ? new Date(p.fpp).toLocaleDateString('es-CL') : "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-xs text-slate-600">
                              <div><span className="font-semibold text-slate-400 text-[10px] uppercase">Último:</span> {p.fecha_ultimo_control ? new Date(p.fecha_ultimo_control).toLocaleDateString('es-CL') : "Sin reg"}</div>
                              <div><span className="font-semibold text-slate-400 text-[10px] uppercase">Próximo:</span> {p.fecha_proximo_control ? new Date(p.fecha_proximo_control).toLocaleDateString('es-CL') : "Sin reg"}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded w-fit ${p.estado_nutricional === 'OBESIDAD' ? 'bg-red-50 text-red-600' : p.estado_nutricional === 'SOBREPESO' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {p.estado_nutricional || "S/N"}
                              </span>
                              {p.observaciones && <span className="text-xs text-slate-500 line-clamp-2" title={p.observaciones}>{p.observaciones}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setTipoIngreso("EMBARAZO"); openExamenModal(p); }} className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1.5 rounded-lg transition-colors" title="Actualizar Embarazo">
                                <FileText size={16} />
                              </button>
                             </div>
                          </td>
                        </>
                      ) : activeTab === "pap" ? ("""

content = content.replace(wrong_body, correct_body)

with open("src/app/(app)/mujer/MujerClientView.tsx", "w") as f:
    f.write(content)
print("Tabla body reparado")
