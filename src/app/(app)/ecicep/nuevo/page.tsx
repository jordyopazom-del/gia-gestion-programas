"use client";

import { useState, useEffect } from "react";
import { buscarPacienteParaEcicep, saveEcicepRecord, obtenerClinicosActivos, EcicepSubmission } from "@/actions/ecicepActions";
import { crearPacienteProvisorio } from "@/actions/pacientesActions";
import { getCurrentUser } from "@/actions/userActions";
import { Search, UserCircle, Calendar, AlertCircle, UserPlus, X, ClipboardCheck } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";
import { toast } from "react-hot-toast";

const ROLES_DISPONIBLES = [
  "Médico", "Enfermero", "Nutricionista", "Kinesiólogo", 
  "Psicólogo", "Asistente Social", "Terapeuta Ocupacional", 
  "Fonoaudiólogo", "Odontólogo", "TENS", "Matrón(a)"
];



const getParsedDataClinica = (dataClinica: any) => {
  if (!dataClinica) return null;
  if (typeof dataClinica === "string") {
    try {
      return JSON.parse(dataClinica);
    } catch (e) {
      return null;
    }
  }
  return dataClinica;
};

export default function NuevoEcicep() {
  const [rutInput, setRutInput] = useState("");
  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length > 9) clean = clean.slice(0, 9);
    
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
  };

  const [paciente, setPaciente] = useState<any>(null);
  const [age, setAge] = useState<number | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchWarning, setSearchWarning] = useState("");

  // Form Fields
  const [fechaAtencion, setFechaAtencion] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });
  const [fechaIngreso, setFechaIngreso] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });
  const [categoria, setCategoria] = useState("G1");
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [polifarmacia, setPolifarmacia] = useState(false);
  const [funcionalidad, setFuncionalidad] = useState("Autovalente sin riesgo");
  const [deterioroCognitivo, setDeterioroCognitivo] = useState(false);
  const [riesgoSocial, setRiesgoSocial] = useState(false);
  const [hospitalizacionReciente, setHospitalizacionReciente] = useState(false);
  const [consultasUrgencia, setConsultasUrgencia] = useState(0);
  const [gestorRut, setGestorRut] = useState("");
  const [profesionalRut, setProfesionalRut] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [planAtenciones, setPlanAtenciones] = useState<any[]>([]);
  const [seguimientoTelefonico, setSeguimientoTelefonico] = useState(false);
  const [estamentoSeguimiento, setEstamentoSeguimiento] = useState("");
  const [gestionCaso, setGestionCaso] = useState(false);
  const [estamentoGestion, setEstamentoGestion] = useState("");
  
  const [clinicos, setClinicos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Provisorio Patient
  const [showProvisorio, setShowProvisorio] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [provNombre, setProvNombre] = useState("");
  const [provFechaNac, setProvFechaNac] = useState("");
  const [provSexo, setProvSexo] = useState("MASCULINO");
  const [provSector, setProvSector] = useState("SECTOR 1");
  const [creatingProv, setCreatingProv] = useState(false);

  // Fetch Clinicos on Mount
  useEffect(() => {
    async function load() {
      const res = await obtenerClinicosActivos();
      if (res.success && res.data) {
        setClinicos(res.data);
      }
      try {
        const u = await getCurrentUser();
        if (u) {
          setProfesionalRut(u.rut);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const handleSearch = async () => {
    if (rutInput.length < 8) return;
    setLoadingSearch(true);
    setSearchError("");
    setSearchWarning("");
    setPaciente(null);

    const res = await buscarPacienteParaEcicep(rutInput);
    if (res.error) {
      setSearchError(res.error);
      if (res.data) {
        setPaciente(res.data);
        const computedAge = res.age ?? null;
        setAge(computedAge);
        
        // Cargar evaluación anterior si existe para pacientes de excepción
        if (res.evaluacion) {
          setCategoria(res.evaluacion.categoria || "G1");
          setDiagnosticos(res.evaluacion.diagnosticos || []);
          setPolifarmacia(!!res.evaluacion.polifarmacia);
          setFuncionalidad(res.evaluacion.funcionalidad || (computedAge !== null && computedAge < 65 ? "No aplica (Menor de 65 años)" : "Autovalente sin riesgo"));
          setDeterioroCognitivo(!!res.evaluacion.deterioro_cognitivo);
          setRiesgoSocial(!!res.evaluacion.riesgo_social);
          setHospitalizacionReciente(!!res.evaluacion.hospitalizacion_reciente);
          setConsultasUrgencia(res.evaluacion.consultas_urgencia || 0);
          setGestorRut(res.evaluacion.gestor_rut || "");
          
          const dataClinica = getParsedDataClinica(res.evaluacion.data_clinica);
          setPlanAtenciones(dataClinica?.plan || []);
          setSeguimientoTelefonico(!!dataClinica?.seguimiento_telefonico);
          setEstamentoSeguimiento(dataClinica?.estamento_seguimiento || "");
          setFechaIngreso(dataClinica?.fecha_ingreso || res.evaluacion.fecha_atencion || new Date().toISOString().slice(0, 10));
        } else {
          setCategoria("G1");
          setDiagnosticos([]);
          setPolifarmacia(false);
          setFuncionalidad(computedAge !== null && computedAge < 65 ? "No aplica (Menor de 65 años)" : "Autovalente sin riesgo");
          setDeterioroCognitivo(false);
          setRiesgoSocial(false);
          setHospitalizacionReciente(false);
          setConsultasUrgencia(0);
          setGestorRut("");
          setPlanAtenciones([]);
          setSeguimientoTelefonico(false);
          setEstamentoSeguimiento("");
          setFechaIngreso(new Date().toISOString().slice(0, 10));
        }
      }
    } else {
      setPaciente(res.data);
      const computedAge = res.age ?? null;
      setAge(computedAge);
      
      // Cargar evaluación anterior si existe
      if (res.evaluacion) {
        setCategoria(res.evaluacion.categoria || "G1");
        setDiagnosticos(res.evaluacion.diagnosticos || []);
        setPolifarmacia(!!res.evaluacion.polifarmacia);
        setFuncionalidad(res.evaluacion.funcionalidad || (computedAge !== null && computedAge < 65 ? "No aplica (Menor de 65 años)" : "Autovalente sin riesgo"));
        setDeterioroCognitivo(!!res.evaluacion.deterioro_cognitivo);
        setRiesgoSocial(!!res.evaluacion.riesgo_social);
        setHospitalizacionReciente(!!res.evaluacion.hospitalizacion_reciente);
        setConsultasUrgencia(res.evaluacion.consultas_urgencia || 0);
        setGestorRut(res.evaluacion.gestor_rut || "");
        
        const dataClinica = getParsedDataClinica(res.evaluacion.data_clinica);
        setPlanAtenciones(dataClinica?.plan || []);
        setSeguimientoTelefonico(!!dataClinica?.seguimiento_telefonico);
        setEstamentoSeguimiento(dataClinica?.estamento_seguimiento || "");
        setFechaIngreso(dataClinica?.fecha_ingreso || res.evaluacion.fecha_atencion || new Date().toISOString().slice(0, 10));
      } else {
        setCategoria("G1");
        setDiagnosticos([]);
        setPolifarmacia(false);
        setFuncionalidad(computedAge !== null && computedAge < 65 ? "No aplica (Menor de 65 años)" : "Autovalente sin riesgo");
        setDeterioroCognitivo(false);
        setRiesgoSocial(false);
        setHospitalizacionReciente(false);
        setConsultasUrgencia(0);
        setGestorRut("");
        setPlanAtenciones([]);
        setSeguimientoTelefonico(false);
        setEstamentoSeguimiento("");
        setFechaIngreso(new Date().toISOString().slice(0, 10));
      }
    }
    setLoadingSearch(false);
  };

  const toggleDiagnostico = (diag: string) => {
    if (diagnosticos.includes(diag)) {
      setDiagnosticos(diagnosticos.filter(d => d !== diag));
    } else {
      setDiagnosticos([...diagnosticos, diag]);
    }
  };

  const addPlanRow = () => {
    setPlanAtenciones([...planAtenciones, { 
      rol: "Médico", 
      mes: new Date().getMonth() + 1, 
      ano: new Date().getFullYear(),
      laboratorio: false,
      ecg: false,
      espirometria: false,
      fondoOjo: false,
      perfilPA: false,
      otros: false,
      otrosTexto: ""
    }]);
  };

  const removePlanRow = (idx: number) => {
    setPlanAtenciones(planAtenciones.filter((_, i) => i !== idx));
  };

  const updatePlanRow = (idx: number, field: string, value: any) => {
    const updated = [...planAtenciones];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'otros' && !value) updated[idx].otrosTexto = "";
    setPlanAtenciones(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");
    setSuccess(false);

    let dateMed: string | undefined = undefined;
    let dateEnf: string | undefined = undefined;
    let dateNut: string | undefined = undefined;
    let dateKin: string | undefined = undefined;

    planAtenciones.forEach(item => {
      const formattedMonth = item.mes.toString().padStart(2, "0");
      const dateStr = `${item.ano}-${formattedMonth}-01`;
      if (item.rol === "Médico") dateMed = dateStr;
      if (item.rol === "Enfermero") dateEnf = dateStr;
      if (item.rol === "Nutricionista") dateNut = dateStr;
      if (item.rol === "Kinesiólogo") dateKin = dateStr;
    });

    const payload: EcicepSubmission = {
      rut_paciente: paciente.rut,
      fecha_atencion: fechaAtencion,
      categoria,
      diagnosticos: [],
      polifarmacia: false,
      funcionalidad: "No aplica (Menor de 65 años)",
      deterioro_cognitivo: false,
      riesgo_social: false,
      hospitalizacion_reciente: false,
      consultas_urgencia: 0,
      gestor_rut: gestorRut || undefined,
      profesional_rut: profesionalRut || undefined,
      observaciones: observaciones || undefined,
      cita_medico: dateMed,
      cita_enfermero: dateEnf,
      cita_nutri: dateNut,
      cita_kine: dateKin,
      data_clinica: { 
        plan: planAtenciones, 
        seguimiento_telefonico: seguimientoTelefonico,
        estamento_seguimiento: seguimientoTelefonico ? estamentoSeguimiento : "",
        gestion_caso: gestionCaso,
        estamento_gestion: gestionCaso ? estamentoGestion : "",
        fecha_ingreso: fechaIngreso 
      }
    };

    const res = await saveEcicepRecord(payload);
    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setShowSuccessModal(true);
      setRutInput("");
      setPaciente(null);
      // Reset Form
      setDiagnosticos([]);
      setPolifarmacia(false);
      setFuncionalidad("No aplica (Menor de 65 años)");
      setDeterioroCognitivo(false);
      setRiesgoSocial(false);
      setHospitalizacionReciente(false);
      setConsultasUrgencia(0);
      setGestorRut("");
      setObservaciones("");

      setPlanAtenciones([]);
      setSeguimientoTelefonico(false);
      setEstamentoSeguimiento("");
      setFechaIngreso(new Date().toISOString().slice(0, 10));
    }
    setSaving(false);
  };

  const handleCreateProvisorio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProv(true);
    
    if (provFechaNac) {
      const birth = new Date(provFechaNac);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
      
      if (age < 15) {
        alert(`Bloqueo de Seguridad: El paciente tiene ${age} años según la fecha ingresada. La estratificación ECICEP es exclusiva para población de 15 años o más.`);
        setCreatingProv(false);
        return;
      }
    }

    // Extraer DV del RUT
    const parts = rutInput.split("-");
    const rut = parts[0].replace(/\./g, "");
    const dv = parts[1] || "K";

    const res = await crearPacienteProvisorio({
      rut,
      dv,
      nombre: provNombre,
      fecha_nacimiento: provFechaNac,
      sexo: provSexo,
      sector: provSector
    });

    if (res.success) {
      await handleSearch();
      setShowProvisorio(false);
      setProvNombre("");
    } else {
      alert("Error al crear paciente provisorio: " + res.error);
    }
    setCreatingProv(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center mb-8 pb-4 border-b border-slate-200">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
          <ClipboardCheck size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Evaluación de Cuidado Integral de Condiciones Crónicas (ECICEP)</h1>
          <p className="text-slate-500 text-sm">Registro de Estratificación Multimorbilidad y Gestión del Cuidado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Búsqueda de Paciente */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center">
              <Search className="mr-2 text-slate-400" size={18} /> Buscar Paciente
            </h2>
            
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="RUT (Ej: 12345678-9)"
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                maxLength={10}
                value={rutInput}
                onChange={(e) => setRutInput(formatRut(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={loadingSearch}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 text-sm shrink-0"
              >
                {loadingSearch ? "..." : "Buscar"}
              </button>
            </div>

            {searchError && (
              <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                <div className="flex items-start">
                  <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="font-bold">Alerta de Búsqueda</p>
                    <p className="text-xs opacity-90 mb-2">{searchError}</p>
                    {searchError === "Paciente no encontrado en el padrón interconectado." && (
                      <button 
                        onClick={() => setShowProvisorio(true)}
                        className="flex items-center text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition shadow-sm mt-2"
                      >
                        <UserPlus size={12} className="mr-1.5" /> Registrar Provisorio
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {paciente && (
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50 -mr-10 -mt-10"></div>
              <h2 className="text-xs uppercase tracking-wide font-semibold text-blue-600 mb-4">Identidad Verificada</h2>
              
              <div className="flex items-center mb-6">
                <div className="h-14 w-14 bg-white rounded-full border border-blue-200 flex items-center justify-center text-blue-500 mr-4 shadow-sm shrink-0">
                  <UserCircle size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase">{paciente.nombre_completo}</h3>
                  <p className="text-slate-500 text-xs mt-1">RUT: {paciente.rut}-{paciente.dv}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                  <span className="text-slate-400 block mb-1 text-[9px] uppercase font-bold">Edad</span>
                  <span className="font-bold text-slate-700">{age !== null ? `${age} años` : "Sin dato"}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                  <span className="text-slate-400 block mb-1 text-[9px] uppercase font-bold">Sexo</span>
                  <span className="font-bold text-slate-700 uppercase">{paciente.sexo || "-"}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm col-span-2">
                  <span className="text-slate-400 block mb-1 text-[9px] uppercase font-bold">Sector</span>
                  <span className="font-bold text-slate-700 uppercase">{paciente.sector}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulario Clínico */}
        <div className="lg:col-span-2">
          <div className={`transition-all duration-300 ${!paciente ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
            <form onSubmit={handleSave} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
              
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center border-b border-slate-100 pb-3">
                  <Calendar className="mr-2 text-blue-600" size={18} /> I. Datos de la Atención
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de la Estratificación Actual</label>
                    <input 
                      type="date" 
                      required 
                      value={fechaAtencion} 
                      max={getLocalDateString()} 
                      onChange={e => setFechaAtencion(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de Ingreso al ECICEP (Histórica)</label>
                    <input 
                      type="date" 
                      required 
                      value={fechaIngreso} 
                      max={getLocalDateString()} 
                      onChange={e => setFechaIngreso(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-emerald-700" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Profesional que Registra / Modifica</label>
                    <select 
                      required
                      value={profesionalRut} 
                      onChange={e => setProfesionalRut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                    >
                      <option value="">-- Seleccione Profesional --</option>
                      {clinicos.map(c => (
                        <option key={c.rut} value={c.rut}>{c.nombre} ({c.profesion})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Gestor de Caso (Titular)</label>
                    <select 
                      value={gestorRut} 
                      onChange={e => setGestorRut(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-indigo-700"
                    >
                      <option value="">-- Seleccionar Gestor (Opcional) --</option>
                      {clinicos.map(c => (
                        <option key={c.rut} value={c.rut}>{c.nombre} ({c.profesion})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Categoría ECICEP</label>
                    <select 
                      value={categoria} 
                      onChange={e => setCategoria(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    >
                      <option value="G0">G0 - Sin Riesgo / Bajo</option>
                      <option value="G1">G1 - Riesgo Bajo</option>
                      <option value="G2">G2 - Riesgo Moderado</option>
                      <option value="G3">G3 - Riesgo Alto / Complejo</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 pt-5 border-t border-slate-100">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        checked={seguimientoTelefonico}
                        onChange={e => {
                          setSeguimientoTelefonico(e.target.checked);
                          if (!e.target.checked) setEstamentoSeguimiento("");
                        }}
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide select-none">
                        📞 Requiere Seguimiento Telefónico
                      </span>
                    </label>
                    
                    {seguimientoTelefonico && (
                      <div className="mt-3 sm:mt-0 animate-in fade-in slide-in-from-left-4 duration-200">
                        <select
                          required
                          value={estamentoSeguimiento}
                          onChange={e => setEstamentoSeguimiento(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Asignar a Estamento --</option>
                          {ROLES_DISPONIBLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 pt-4 border-t border-slate-100">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                      checked={gestionCaso}
                      onChange={e => {
                        setGestionCaso(e.target.checked);
                        if (!e.target.checked) setEstamentoGestion("");
                      }}
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide select-none">
                      📋 Requiere Gestión de Caso
                    </span>
                  </label>

                  {gestionCaso && (
                    <div className="mt-3 sm:mt-0 animate-in fade-in slide-in-from-left-4 duration-200">
                      <select
                        required
                        value={estamentoGestion}
                        onChange={e => setEstamentoGestion(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Asignar a Estamento --</option>
                        {ROLES_DISPONIBLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan de Cuidado Anual (Próximas Citas) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    📅 II. Plan de Cuidado Anual (Próximas Citas - 12 Meses)
                  </h2>
                  <button 
                    type="button" 
                    onClick={addPlanRow}
                    className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center"
                  >
                    + Programar Cita
                  </button>
                </div>
                <p className="text-slate-400 text-xs mt-1 mb-4">Programe las próximas atenciones del paciente dentro del año de vigencia indicando especialidad, mes y año:</p>
                
                {planAtenciones.length === 0 ? (
                  <p className="text-slate-400 text-xs py-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No hay atenciones programadas en el plan anual.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                    {planAtenciones.map((item: any, idx) => (
                      <div key={idx} className="flex flex-col space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in duration-100">
                        <div className="flex items-center space-x-2">
                          <select 
                            value={item.rol} 
                            onChange={e => updatePlanRow(idx, 'rol', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                          >
                            {["Médico", "Enfermero", "Nutricionista", "Kinesiólogo", "Psicólogo", "Asistente Social", "Terapeuta Ocupacional", "Fonoaudiólogo", "Odontólogo", "TENS", "Matrón(a)"].map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <select 
                            value={item.mes} 
                            onChange={e => updatePlanRow(idx, 'mes', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-28"
                          >
                            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((name, mIdx) => (
                              <option key={mIdx} value={mIdx + 1}>{name}</option>
                            ))}
                          </select>
                          <select 
                            value={item.ano} 
                            onChange={e => updatePlanRow(idx, 'ano', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-20"
                          >
                            {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => removePlanRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.nota || ""}
                          onChange={e => updatePlanRow(idx, 'nota', e.target.value)}
                          placeholder="Nota específica para esta cita (Ej: control cardiovascular, 10 sesiones...)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        
                        {/* Procedimientos y Órdenes para esta cita */}
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Órdenes pendientes para esta cita:</p>
                          <div className="flex flex-wrap gap-2">
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-red-600 rounded border-slate-300" checked={item.laboratorio || false} onChange={e => updatePlanRow(idx, 'laboratorio', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🩸 Lab</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-rose-600 rounded border-slate-300" checked={item.ecg || false} onChange={e => updatePlanRow(idx, 'ecg', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🫀 ECG</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-teal-600 rounded border-slate-300" checked={item.espirometria || false} onChange={e => updatePlanRow(idx, 'espirometria', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🫁 Espiro</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-amber-600 rounded border-slate-300" checked={item.fondoOjo || false} onChange={e => updatePlanRow(idx, 'fondoOjo', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">👁️ F.Ojo</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-indigo-600 rounded border-slate-300" checked={item.perfilPA || false} onChange={e => updatePlanRow(idx, 'perfilPA', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">⚕️ Perfil PA</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-purple-600 rounded border-slate-300" checked={item.perfilGlicemia || false} onChange={e => updatePlanRow(idx, 'perfilGlicemia', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">🩸 Glicemia</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                              <input type="checkbox" className="h-3 w-3 text-slate-600 rounded border-slate-300" checked={item.otros || false} onChange={e => updatePlanRow(idx, 'otros', e.target.checked)} />
                              <span className="text-[10px] font-bold text-slate-600">➕ Otros</span>
                            </label>
                          </div>
                          {item.otros && (
                            <div className="mt-2">
                              <input 
                                type="text" 
                                value={item.otrosTexto || ""}
                                onChange={e => updatePlanRow(idx, 'otrosTexto', e.target.value)}
                                placeholder="Ej: Rx Tórax..."
                                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-[11px] text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observaciones</label>
                <textarea 
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Ingrese observaciones de la atención..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-3 text-xs focus:ring-2 focus:ring-blue-500 min-h-[100px] outline-none"
                />
              </div>

              {saveError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                  {saveError}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg text-sm border border-emerald-200 font-medium text-center">
                  ¡Estratificación ECICEP guardada exitosamente!
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <button 
                  type="submit"
                  disabled={saving || !paciente}
                  className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center"
                >
                  {saving ? "Procesando..." : "📋 Guardar Estratificación"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Provisorio Modal */}
      {showProvisorio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateProvisorio}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center text-slate-800">
                  <UserPlus className="mr-2 text-blue-600" size={20} />
                  <h3 className="font-bold">Ingreso de Excepción (Provisorio)</h3>
                </div>
                <button type="button" onClick={() => setShowProvisorio(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20}/>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-[10px] text-blue-700 font-medium">
                  Este registro provisorio le permitirá realizar el registro clínico inmediato.
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">RUT Identificado</label>
                  <p className="text-sm font-mono font-bold text-slate-700">{rutInput}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nombre Completo</label>
                  <input 
                    type="text" required value={provNombre} onChange={e => setProvNombre(e.target.value.slice(0, 100).toUpperCase())}
                    maxLength={100}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-medium"
                    placeholder="EJ: CARLOS DIAZ RETAMAL"
                  />
                </div>
  
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha Nacimiento</label>
                    <input 
                      type="date" required value={provFechaNac} max={getLocalDateString()} onChange={e => setProvFechaNac(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Sexo</label>
                    <select 
                      value={provSexo} onChange={e => setProvSexo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="MASCULINO">MASCULINO</option>
                      <option value="FEMENINO">FEMENINO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Sector Territorial</label>
                  <select 
                    value={provSector} onChange={e => setProvSector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ARQUILHUE">ARQUILHUE</option>
                    <option value="EMR CHABRANCO">EMR CHABRANCO</option>
                    <option value="EMR CURRIÑE">EMR CURRIÑE</option>
                    <option value="EMR HUEINAHUE">EMR HUEINAHUE</option>
                    <option value="ISLA HUAPI">ISLA HUAPI</option>
                    <option value="LLIFEN">LLIFEN</option>
                    <option value="LONCOPAN">LONCOPAN</option>
                    <option value="MAIHUE">MAIHUE</option>
                    <option value="NONTUELA">NONTUELA</option>
                    <option value="SECTOR 1">SECTOR 1</option>
                    <option value="SECTOR 2">SECTOR 2</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
                <button 
                  type="button" onClick={() => setShowProvisorio(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={creatingProv}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                >
                  {creatingProv ? 'Guardando...' : 'Confirmar e Iniciar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 animate-bounce">
                <ClipboardCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">¡Registro Exitoso!</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                La estratificación ECICEP ha sido registrada exitosamente en la ficha y padrón del paciente.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Entendido, Continuar
                </button>
                <button 
                   onClick={() => window.location.href = "/ecicep"}
                   className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Volver al Listado General
                </button>
              </div>
            </div>
            <div className="bg-slate-50 py-4 px-8 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
              GIA Belarmina • Gestión Integral APS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
