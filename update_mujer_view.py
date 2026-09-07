import re

path = 'src/app/(app)/mujer/MujerClientView.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert import
content = content.replace(
  'import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";',
  'import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";\nimport FormularioAtencionMujer from "@/app/(app)/mujer/components/FormularioAtencionMujer";'
)

# We want to remove the states for the FORM inside the modal, but NOT the modal state (showExamenModal), NOT profesionalesList (used for excel), NOT calcularSemanasGestacion.
# Let's remove only:
# - profesionalRutForm, searchProfModalInput, showProfModalDropdown, modoProfesionalForm
# - filteredProfesionalesModal, profesionalSeleccionadoModalObj
# - tipoExamenForm, fechaExamenForm, codigoLabForm, periodicidadMesesForm, fechaProximoControlForm
# - criterioPersonalizado, adecuacionMuestraForm, motivoInsatisfactoriaForm, resultadoForm, fechaResultadoForm
# - decodificacion
# - handleCodigoLabChange, handlePeriodicidadChange
# - fumForm, fppForm, fechaUltimoControlEmbarazoForm, fechaProximoControlEmbarazoForm, estadoNutricionalForm, observacionesEmbarazoForm, handleFumChange
# - derivadoUpcForm, fechaDerivacionUpcForm, observacionesExamenForm, savingExamen, examenError
# - handleSaveExamen, handleEmbarazoSubmit

to_remove = [
    r'  const \[profesionalRutForm.*?;\n',
    r'  const \[searchProfModalInput.*?;\n',
    r'  const \[showProfModalDropdown.*?;\n',
    r'  const \[modoProfesionalForm.*?;\n',
    r'  const filteredProfesionalesModal = useMemo\(\(\) => \{.*?\n  \}, \[profesionalesList, searchProfModalInput\]\);\n',
    r'  const profesionalSeleccionadoModalObj = useMemo\(\(\) => \{.*?\n  \}, \[profesionalesList, profesionalRutForm\]\);\n',
    
    r'  const \[tipoExamenForm.*?;\n',
    r'  const \[fechaExamenForm.*?;\n',
    r'  const \[codigoLabForm.*?;\n',
    r'  const \[periodicidadMesesForm.*?;\n',
    r'  const \[fechaProximoControlForm.*?;\n',
    r'  const \[criterioPersonalizado.*?;\n',
    r'  const \[adecuacionMuestraForm.*?;\n',
    r'  const \[motivoInsatisfactoriaForm.*?;\n',
    r'  const \[resultadoForm.*?;\n',
    r'  const \[fechaResultadoForm.*?;\n',
    
    r'  const decodificacion: DecodificacionPap = useMemo\(\(\) => \{.*?\n  \}, \[codigoLabForm, tipoExamenForm, resultadoForm\]\);\n',
    
    r'  const handleCodigoLabChange = \(val: string\) => \{.*?\n  \};\n',
    r'  const handlePeriodicidadChange = \(meses: number, manual: boolean = true\) => \{.*?\n  \};\n',
    
    r'  const \[fumForm.*?;\n',
    r'  const \[fppForm.*?;\n',
    r'  const \[fechaUltimoControlEmbarazoForm.*?;\n',
    r'  const \[fechaProximoControlEmbarazoForm.*?;\n',
    r'  const \[estadoNutricionalForm.*?;\n',
    r'  const \[observacionesEmbarazoForm.*?;\n',
    r'  const handleFumChange = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{.*?\n  \};\n',
    
    r'  const \[derivadoUpcForm.*?;\n',
    r'  const \[fechaDerivacionUpcForm.*?;\n',
    r'  const \[observacionesExamenForm.*?;\n',
    r'  const \[savingExamen.*?;\n',
    r'  const \[examenError.*?;\n',
    
    r'  const handleSaveExamen = async \(\) => \{.*?\n  \};\n',
    r'  const handleEmbarazoSubmit = async \(e\?: React\.FormEvent\) => \{.*?\n  \};\n'
]

for pattern in to_remove:
    content = re.sub(pattern, '', content, flags=re.DOTALL)

# Update openExamenModal and add handleExamenSuccess
new_open_examen_modal = """
  const handleExamenSuccess = (payload: any) => {
    if (payload.tipo_examen) {
      setData(prev => prev.map(p => {
        if (p.rut === payload.rut_paciente) {
          return {
            ...p,
            ultima_fecha_pap: payload.fecha_pap,
            ultimo_resultado_pap: payload.resultado,
            ultimo_tipo_examen: payload.tipo_examen,
            ultima_adecuacion_muestra: payload.adecuacion_muestra,
            ultimo_motivo_insatisfactoria: payload.motivo_insatisfactoria,
            ultima_fecha_resultado: payload.fecha_resultado,
            ultimo_derivado_upc: payload.derivado_upc,
            ultima_fecha_derivacion_upc: payload.fecha_derivacion_upc,
            ultimo_codigo_lab: payload.codigo_lab,
            ultima_periodicidad_meses: payload.periodicidad_meses,
            ultima_fecha_proximo_control: payload.fecha_proximo_control,
            ultimo_profesional_rut: payload.profesional_rut
          };
        }
        return p;
      }));
      setShowExamenModal(false);
      setSelectedPacienteExamen(null);
    } else if (payload.fum) {
      setShowExamenModal(false);
      
      const pac = data.find(p => p.rut === payload.rut_paciente);
      if (pac) {
        setEmbarazadasData(prev => [
          {
            rut: pac.rut,
            dv: pac.dv,
            nombre_completo: pac.nombre_completo,
            fecha_nacimiento: pac.fecha_nacimiento,
            sector: pac.sector,
            telefono: pac.telefono,
            fum: payload.fum,
            fpp: payload.fpp,
            fecha_ultimo_control: payload.fecha_ultimo_control,
            fecha_proximo_control: payload.fecha_proximo_control,
            estado_nutricional: payload.estado_nutricional,
            observaciones: payload.observaciones,
            estado_embarazo: "EMBARAZO"
          },
          ...prev
        ]);
      }
      setSelectedPacienteExamen(null);
      setActiveTab("embarazadas");
    }
  };

  const openExamenModal = (paciente: PacienteMujer) => {
    setSelectedPacienteExamen(paciente);
    setTipoIngreso("SELECCION");
    setShowExamenModal(true);
  };
"""
regex_open_examen = re.compile(r'const openExamenModal = \(paciente: PacienteMujer\) => \{.*?setShowExamenModal\(true\);\n  \};', re.DOTALL)
content = re.sub(regex_open_examen, new_open_examen_modal, content)


# Now replace the modal JSX
modal_jsx_regex = re.compile(r'\{/\* Modal Premium de Ingreso Rápido de Examen PAP/VPH \*/\}.*?\{/\* Panel Lateral \(Drawer\) de Historial Clínico PAP/VPH \*/\}', re.DOTALL)

new_modal_jsx = """{/* Modal Premium de Ingreso Rápido de Examen PAP/VPH */}
      {showExamenModal && selectedPacienteExamen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in scale-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {tipoIngreso === "SELECCION" ? "Seleccione Tipo de Registro" : tipoIngreso === "PAP" ? "Ingreso de Tamizaje (PAP/VPH)" : "Control de Embarazo"}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Paciente: {selectedPacienteExamen.nombre_completo} (RUT: {selectedPacienteExamen.rut}-{selectedPacienteExamen.dv})</p>
              </div>
              <button 
                onClick={() => { setShowExamenModal(false); setSelectedPacienteExamen(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
                <FormularioAtencionMujer 
                  paciente={selectedPacienteExamen} 
                  user={user} 
                  initialTipoIngreso={tipoIngreso as any} 
                  isModal={true} 
                  onCancel={() => { setShowExamenModal(false); setSelectedPacienteExamen(null); }} 
                  onSuccess={(payload) => { 
                    handleExamenSuccess(payload);
                  }}
                />
            </div>
          </div>
        </div>
      )}

      {/* Panel Lateral (Drawer) de Historial Clínico PAP/VPH */}"""

content = re.sub(modal_jsx_regex, new_modal_jsx, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
