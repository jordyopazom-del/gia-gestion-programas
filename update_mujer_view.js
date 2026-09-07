const fs = require('fs');

const path = 'src/app/(app)/mujer/MujerClientView.tsx';
let content = fs.readFileSync(path, 'utf8');

// Insert import
content = content.replace(
  'import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";',
  'import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";\nimport FormularioAtencionMujer from "@/app/(app)/mujer/components/FormularioAtencionMujer";'
);

// Remove unused state declarations
const statesToRemove = [
  'const [profesionalesList, setProfesionalesList] = useState<{ rut: string; nombre: string; profesion: string; rol: string }[]>([]);',
  'const [profesionalRutForm, setProfesionalRutForm] = useState<string>(user?.rut || "");',
  'const [searchProfModalInput, setSearchProfModalInput] = useState<string>("");',
  'const [showProfModalDropdown, setShowProfModalDropdown] = useState<boolean>(false);',
  'const [modoProfesionalForm, setModoProfesionalForm] = useState<"PROPIO" | "MANUAL">("PROPIO");',
  'const filteredProfesionalesModal = useMemo(() => {',
  '  if (!searchProfModalInput.trim()) return profesionalesList;',
  '  const q = searchProfModalInput.toLowerCase().trim();',
  '  return profesionalesList.filter(p => ',
  '    p.nombre.toLowerCase().includes(q) || ',
  '    p.rut.toLowerCase().includes(q) || ',
  '    (p.profesion && p.profesion.toLowerCase().includes(q))',
  '  );',
  '}, [profesionalesList, searchProfModalInput]);',
  'const profesionalSeleccionadoModalObj = useMemo(() => {',
  '  if (!profesionalRutForm) return null;',
  '  return profesionalesList.find(p => p.rut === profesionalRutForm) || null;',
  '}, [profesionalesList, profesionalRutForm]);',
  'useEffect(() => {',
  '  obtenerProfesionalesMatroneria().then(res => {',
  '    if (res.profesionales) {',
  '      setProfesionalesList(res.profesionales);',
  '    }',
  '  });',
  '}, []);',
  'const [tipoExamenForm, setTipoExamenForm] = useState("PAP");',
  'const [fechaExamenForm, setFechaExamenForm] = useState("");',
  'const [codigoLabForm, setCodigoLabForm] = useState("");',
  'const [periodicidadMesesForm, setPeriodicidadMesesForm] = useState<number | null>(36);',
  'const [fechaProximoControlForm, setFechaProximoControlForm] = useState("");',
  'const [criterioPersonalizado, setCriterioPersonalizado] = useState(false);',
  'const [adecuacionMuestraForm, setAdecuacionMuestraForm] = useState("SATISFACTORIA");',
  'const [motivoInsatisfactoriaForm, setMotivoInsatisfactoriaForm] = useState("");',
  'const [resultadoForm, setResultadoForm] = useState("NEGATIVO");',
  'const [fechaResultadoForm, setFechaResultadoForm] = useState("");',
  'const decodificacion: DecodificacionPap = useMemo(() => {',
  '  if (tipoExamenForm !== "PAP") {',
  '    return {',
  '      codigoOriginal: "",',
  '      codigoLimpio: "",',
  '      diagnostico: resultadoForm === "POSITIVO_16_18" ? "POSITIVO VPH 16/18" : resultadoForm === "POSITIVO_OTROS" ? "POSITIVO Otros VPH" : resultadoForm === "NEGATIVO" ? "NEGATIVO VPH" : "PENDIENTE",',
  '      adecuacion: "SATISFACTORIA",',
  '      adecuacionDescripcion: "Muestra Satisfactoria",',
  '      microbiologia: [],',
  '      conducta: [],',
  '      esPatologico: resultadoForm.startsWith("POSITIVO"),',
  '      esInsatisfactorio: false,',
  '      periodicidadSugeridaMeses: resultadoForm === "NEGATIVO" ? 60 : 0,',
  '      textoResumen: "",',
  '    };',
  '  }',
  '  return decodificarCodigoPap(codigoLabForm);',
  '}, [codigoLabForm, tipoExamenForm, resultadoForm]);',
  'const handleCodigoLabChange = (val: string) => {',
  '  const raw = val.toUpperCase();',
  '  setCodigoLabForm(raw);',
  '  const dec = decodificarCodigoPap(raw);',
  '  ',
  '  if (dec.esInsatisfactorio) {',
  '    setAdecuacionMuestraForm("INSATISFACTORIA");',
  '    setMotivoInsatisfactoriaForm(dec.motivoInsatisfactoria || "CELULARIDAD_ESCASA");',
  '    setResultadoForm("MUESTRA INSATISFACTORIA");',
  '  } else {',
  '    setAdecuacionMuestraForm("SATISFACTORIA");',
  '    setMotivoInsatisfactoriaForm("");',
  '    if (dec.esPatologico) {',
  '      setResultadoForm(dec.diagnosticoCodigo || "ASC-US");',
  '      setDerivadoUpcForm(true);',
  '    } else {',
  '      setResultadoForm("NEGATIVO");',
  '      setDerivadoUpcForm(false);',
  '    }',
  '  }',
  '',
  '  if (!criterioPersonalizado) {',
  '    setPeriodicidadMesesForm(dec.periodicidadSugeridaMeses);',
  '    if (fechaExamenForm && dec.periodicidadSugeridaMeses > 0) {',
  '      const d = new Date(fechaExamenForm);',
  '      d.setMonth(d.getMonth() + dec.periodicidadSugeridaMeses);',
  '      setFechaProximoControlForm(d.toISOString().split("T")[0]);',
  '    } else if (dec.periodicidadSugeridaMeses === 0) {',
  '      setFechaProximoControlForm("");',
  '    }',
  '  }',
  '};',
  'const handlePeriodicidadChange = (meses: number, manual: boolean = true) => {',
  '  if (manual && periodicidadMesesForm === meses) {',
  '    setPeriodicidadMesesForm(null);',
  '    setFechaProximoControlForm("");',
  '    return;',
  '  }',
  '  ',
  '  setPeriodicidadMesesForm(meses);',
  '  if (manual) setCriterioPersonalizado(true);',
  '  if (fechaExamenForm && meses > 0) {',
  '    const d = new Date(fechaExamenForm);',
  '    d.setMonth(d.getMonth() + meses);',
  '    setFechaProximoControlForm(d.toISOString().split("T")[0]);',
  '  } else if (meses === 0) {',
  '    setFechaProximoControlForm("");',
  '  }',
  '};',
  'const [fumForm, setFumForm] = useState("");',
  'const [fppForm, setFppForm] = useState("");',
  'const [fechaUltimoControlEmbarazoForm, setFechaUltimoControlEmbarazoForm] = useState("");',
  'const [fechaProximoControlEmbarazoForm, setFechaProximoControlEmbarazoForm] = useState("");',
  'const [estadoNutricionalForm, setEstadoNutricionalForm] = useState("");',
  'const [observacionesEmbarazoForm, setObservacionesEmbarazoForm] = useState("");',
  'const handleFumChange = (e: React.ChangeEvent<HTMLInputElement>) => {',
  '  const fumDate = e.target.value;',
  '  setFumForm(fumDate);',
  '  if (fumDate) {',
  '    const date = new Date(fumDate);',
  '    date.setDate(date.getDate() + 280); // 40 semanas',
  '    setFppForm(date.toISOString().split("T")[0]);',
  '  } else {',
  '    setFppForm("");',
  '  }',
  '};',
  'const [derivadoUpcForm, setDerivadoUpcForm] = useState(false);',
  'const [fechaDerivacionUpcForm, setFechaDerivacionUpcForm] = useState("");',
  'const [observacionesExamenForm, setObservacionesExamenForm] = useState("");',
  'const [savingExamen, setSavingExamen] = useState(false);',
  'const [examenError, setExamenError] = useState("");',
];

// Instead of removing line by line which is hard with formatting, we can use regex to replace blocks.

const regexToRemove1 = /\/\/ Estados para Modal de Ingreso Rápido[\s\S]*?const \[examenError, setExamenError\] = useState\(""\);/m;
content = content.replace(regexToRemove1, '');

// Also remove `handleSaveExamen` and `handleEmbarazoSubmit`
const regexToRemove2 = /const handleSaveExamen = async \(\) => \{[\s\S]*?setSelectedPacienteExamen\(null\);\n    \}\n  \};/m;
content = content.replace(regexToRemove2, '');

const regexToRemove3 = /const handleEmbarazoSubmit = async \(e\?: React\.FormEvent\) => \{[\s\S]*?setActiveTab\("embarazadas"\);\n    \}\n  \};/m;
content = content.replace(regexToRemove3, '');

// openExamenModal needs to be updated since it references removed state variables
const newOpenExamenModal = `
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
    // setTipoIngreso("SELECCION");
    setShowExamenModal(true);
  };
`;

const regexOpenExamen = /const openExamenModal = \(paciente: PacienteMujer\) => \{[\s\S]*?setShowExamenModal\(true\);\n  \};/m;
content = content.replace(regexOpenExamen, newOpenExamenModal);


// Now replace the modal JSX
const modalJsxRegex = /\{\/\* Modal Premium de Ingreso Rápido de Examen PAP\/VPH \*\/\}[\s\S]*?\{\/\* Panel Lateral \(Drawer\) de Historial Clínico PAP\/VPH \*\/\}/m;

const newModalJsx = `{/* Modal Premium de Ingreso Rápido de Examen PAP/VPH */}
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

      {/* Panel Lateral (Drawer) de Historial Clínico PAP/VPH */}`;

content = content.replace(modalJsxRegex, newModalJsx);

fs.writeFileSync(path, content, 'utf8');

