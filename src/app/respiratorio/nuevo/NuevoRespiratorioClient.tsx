"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  UserCircle, 
  Calendar, 
  Stethoscope, 
  Activity, 
  Wind, 
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  UserPlus,
  Heart,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buscarPacienteRespiratorio, guardarAtencionRespiratoria } from "@/actions/respiratorioActions";
import { crearPacienteProvisorio } from "@/actions/pacientesActions";
import { UserProfile } from "@/actions/userActions";
import { getLocalDateString } from "@/lib/dateUtils";
import { toast } from "react-hot-toast";

const LISTA_DIAG = ["ASMA LEVE", "ASMA MODERADA", "ASMA SEVERA", "EPOC TIPO A", "EPOC TIPO B", "SBOR LEVE", "SBOR MODERADO", "SBOR SEVERO", "OXIGENO DEPENDIENTE", "AVNI", "FIBROSIS QUISTICA", "OTRAS RESPIRATORIAS"];
const LISTA_CONTROL = ["CONTROLADO", "PARCIALMENTE CONTROLADO", "NO CONTROLADO", "SIN EVALUAR"];
const LISTA_TIPO = ["CONTROL MÉDICO", "CONTROL KINESIOLÓGICO", "ESPIROMETRÍA", "INGRESO ERA/IRA", "REINGRESO"];

export default function NuevoRespiratorioClient({ user }: { user: UserProfile }) {
  const router = useRouter();
  
  // Estados de Búsqueda
  const [rutInput, setRutInput] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [paciente, setPaciente] = useState<any>(null);
  const [age, setAge] = useState<number | null>(null);
  const [ultimaFicha, setUltimaFicha] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Estados para paciente provisorio
  const [showProvisorio, setShowProvisorio] = useState(false);
  const [provNombre, setProvNombre] = useState("");
  const [provFechaNac, setProvFechaNac] = useState("");
  const [provSexo, setProvSexo] = useState("MASCULINO");
  const [provSector, setProvSector] = useState("SECTOR 1");
  const [creatingProv, setCreatingProv] = useState(false);

  // Estados del Formulario
  const [fechaAtencion, setFechaAtencion] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });
  
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  const currentYear = new Date().getFullYear();
  const anios = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

  const [diagnostico, setDiagnostico] = useState(LISTA_DIAG[0]);
  const [nivelControl, setNivelControl] = useState(LISTA_CONTROL[0]);
  const [tipoAtencion, setTipoAtencion] = useState("");
  const [esPad, setEsPad] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [esMigrante, setEsMigrante] = useState(false);
  const [esPuebloOriginario, setEsPuebloOriginario] = useState(false);
  const [esSecueladoTbc, setEsSecueladoTbc] = useState(false);
  const [otraRespiratoriaDetalle, setOtraRespiratoriaDetalle] = useState("");
  const [eq5dScore, setEq5dScore] = useState<string>("");
  const [catScore, setCatScore] = useState<string>("");
  const [fechaEncuesta, setFechaEncuesta] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  });

  const [mesCitaMed, setMesCitaMed] = useState("");
  const [anioCitaMed, setAnioCitaMed] = useState("");
  const [mesCitaKin, setMesCitaKin] = useState("");
  const [anioCitaKin, setAnioCitaKin] = useState("");
  const [mesCitaEsp, setMesCitaEsp] = useState("");
  const [anioCitaEsp, setAnioCitaEsp] = useState("");

  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length > 9) clean = clean.slice(0, 9);
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSearch = async () => {
    if (!rutInput || rutInput.length < 8) return;
    setLoadingSearch(true);
    setSearchError(null);
    setPaciente(null);
    setAge(null);
    
    try {
      const res = await buscarPacienteRespiratorio(rutInput);
      if (res.error) {
        setSearchError(res.error);
      } else if (res.data) {
        setPaciente(res.data);
        setAge(calculateAge(res.data.fecha_nacimiento));
        setUltimaFicha(res.ficha);
        if (res.ficha) {
          setDiagnostico(res.ficha.diagnostico);
          setNivelControl(res.ficha.nivel_control);
          
          let prevCli: any = {};
          try {
            prevCli = typeof res.ficha.data_clinica === 'string' 
              ? JSON.parse(res.ficha.data_clinica) 
              : (res.ficha.data_clinica || {});
          } catch(e) {}
          
          setEq5dScore(prevCli.eq5d_score?.toString() || "");
          setCatScore(prevCli.cat_score?.toString() || "");
          setFechaEncuesta(prevCli.fecha_encuesta || getLocalDateString());
          setEsMigrante(!!prevCli.es_migrante);
          setEsPuebloOriginario(!!prevCli.pueblo_originario);
          setEsSecueladoTbc(!!prevCli.secuelado_tbc);
          setOtraRespiratoriaDetalle(prevCli.otra_respiratoria_detalle || "");
        } else {
          setEq5dScore("");
          setCatScore("");
          setFechaEncuesta(getLocalDateString());
          setEsMigrante(false);
          setEsPuebloOriginario(false);
          setEsSecueladoTbc(false);
          setOtraRespiratoriaDetalle("");
        }
        setEsPad(res.data?.es_pad || (res.ficha?.es_pad) || false);
      }
    } catch (e) {
      setSearchError("Error de conexión");
    }
    setLoadingSearch(false);
  };

  const handleCreateProvisorio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProv(true);
    
    const parts = rutInput.split("-");
    const rut = parts[0].replace(/\./g, "");
    const dv = parts[1] || "K";

    const res = await crearPacienteProvisorio({
      rut,
      dv,
      nombre: provNombre.toUpperCase(),
      fecha_nacimiento: provFechaNac,
      sexo: provSexo,
      sector: provSector
    });

    if (res.success) {
      await handleSearch();
      setShowProvisorio(false);
      setProvNombre("");
      toast.success("Paciente provisorio creado");
    } else {
      toast.error("Error al crear: " + res.error);
    }
    setCreatingProv(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const labelMed = mesCitaMed ? `${meses[parseInt(mesCitaMed)]} ${anioCitaMed}` : null;
    const labelKin = mesCitaKin ? `${meses[parseInt(mesCitaKin)]} ${anioCitaKin}` : null;
    const labelEsp = mesCitaEsp ? `${meses[parseInt(mesCitaEsp)]} ${anioCitaEsp}` : null;

    const res = await guardarAtencionRespiratoria({
      rut_paciente: paciente.rut,
      fecha_atencion: fechaAtencion,
      tipo_atencion: tipoAtencion,
      diagnostico,
      nivel_control: nivelControl,
      cita_medico: labelMed ? `${anioCitaMed}-${(parseInt(mesCitaMed)+1).toString().padStart(2,'0')}-01` : null,
      cita_kine: labelKin ? `${anioCitaKin}-${(parseInt(mesCitaKin)+1).toString().padStart(2,'0')}-01` : null,
      cita_espiro: labelEsp ? `${anioCitaEsp}-${(parseInt(mesCitaEsp)+1).toString().padStart(2,'0')}-01` : null,
      profesional_rut: user.rut,
      es_pad: esPad,
      observaciones,
      data_clinica: {
        profesional_nombre: user.nombre,
        proximo_medico_label: labelMed,
        proximo_kine_label: labelKin,
        proximo_espiro_label: labelEsp,
        eq5d_score: (diagnostico.includes("ASMA") || diagnostico === "OXIGENO DEPENDIENTE" || diagnostico === "AVNI" || diagnostico === "FIBROSIS QUISTICA" || diagnostico === "OTRAS RESPIRATORIAS") && eq5dScore ? parseInt(eq5dScore) : null,
        cat_score: diagnostico.includes("EPOC") && catScore ? parseInt(catScore) : null,
        fecha_encuesta: ((diagnostico.includes("ASMA") || diagnostico === "OXIGENO DEPENDIENTE" || diagnostico === "AVNI" || diagnostico === "FIBROSIS QUISTICA" || diagnostico === "OTRAS RESPIRATORIAS") && eq5dScore) || (diagnostico.includes("EPOC") && catScore) ? fechaEncuesta : null,
        es_migrante: esMigrante,
        pueblo_originario: esPuebloOriginario,
        secuelado_tbc: esSecueladoTbc,
        otra_respiratoria_detalle: diagnostico === "OTRAS RESPIRATORIAS" && otraRespiratoriaDetalle ? otraRespiratoriaDetalle.toUpperCase().trim() : null
      }
    });

    if (res.success) {
      setShowSuccessModal(true);
    } else {
      toast.error("Error al guardar: " + res.error);
    }
    setSaving(false);
  };



  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header Institucional */}
      <div className="flex items-center mb-8 pb-4 border-b border-slate-200">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 shadow-sm">
          <Wind size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programa Respiratorio ERA/IRA</h1>
          <p className="text-slate-500 text-sm">Registro Centralizado de Atenciones Integrales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Izquierdo: Buscador Estilo EMPAM */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Search className="mr-2 text-slate-400" size={18} /> Búsqueda en Padrón
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
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-50 shrink-0"
              >
                {loadingSearch ? "..." : "Buscar"}
              </button>
            </div>

            {searchError && (
              <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start">
                  <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="text-xs font-black uppercase tracking-tight mb-2">{searchError}</p>
                    {searchError === "Paciente no encontrado en el padrón interconectado." && (
                      <button 
                        onClick={() => setShowProvisorio(true)}
                        className="flex items-center text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition shadow-sm"
                      >
                        <UserPlus size={12} className="mr-1.5" /> Registrar de forma Provisoria
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta de Paciente Estilo EMPAM */}
          {paciente && (
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50 -mr-10 -mt-10"></div>
               <h2 className="text-xs uppercase tracking-wide font-bold text-blue-600 mb-4">Identidad Verificada</h2>
               
               <div className="flex items-center mb-6">
                 <div className="h-14 w-14 bg-white rounded-full border border-blue-200 flex items-center justify-center text-blue-500 mr-4 shadow-sm shrink-0">
                   <UserCircle size={32} />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-800 text-sm uppercase">{paciente.nombre_completo}</h3>
                   <p className="text-slate-500 text-xs mt-1 font-mono">RUT: {paciente.rut}-{paciente.dv}</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-3 rounded-lg border border-blue-50">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sector</p>
                     <p className="text-xs font-bold text-slate-700">{paciente.sector}</p>
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg border border-blue-50">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Edad Actual</p>
                     <p className="text-xs font-bold text-slate-700">{age} Años</p>
                  </div>
               </div>

               {ultimaFicha && (
                 <div className="mt-6 p-4 bg-white rounded-xl border border-blue-100 shadow-inner">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center">
                       <ClipboardList size={10} className="mr-1" /> Última Atención
                    </p>
                    <p className="text-[11px] font-bold text-slate-800 uppercase">{ultimaFicha.diagnostico}</p>
                    <p className="text-[10px] font-medium text-slate-500 italic">{ultimaFicha.nivel_control}</p>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Lado Derecho: Formulario Estilo Institucional */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className={`space-y-6 transition-all duration-300 ${!paciente ? 'opacity-40 pointer-events-none' : ''}`}>
            
            {/* Sección I: Datos de Atención */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4 uppercase text-sm tracking-tight">
                  <Calendar className="mr-2 text-blue-500" size={20} /> I. Cronología de la Atención
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fecha de Atención (Real)</label>
                    <input 
                      type="date" required value={fechaAtencion} max={getLocalDateString()}
                      onChange={(e) => setFechaAtencion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tipo de Atención</label>
                    <select 
                      required
                      value={tipoAtencion} onChange={e => setTipoAtencion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                       <option value="">SELECCIONE TIPO DE ATENCIÓN...</option>
                       {LISTA_TIPO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            {/* II. Evaluación Clínica */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4 uppercase text-sm tracking-tight">
                  <Heart className="mr-2 text-blue-500" size={20} /> II. Evaluación Clínica Respiratoria
               </h3>

               <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Seleccione Diagnóstico Principal</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {LISTA_DIAG.map(d => (
                         <button
                           key={d} type="button"
                           onClick={() => setDiagnostico(d)}
                           className={`px-3 py-2.5 rounded-lg text-center text-[10px] font-bold transition-all border leading-tight ${
                             diagnostico === d 
                             ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                             : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-blue-300'
                           }`}
                         >
                           {d}
                         </button>
                       ))}
                    </div>

                    {diagnostico === "OTRAS RESPIRATORIAS" && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Especifique Diagnóstico "Otras Respiratorias"</label>
                        <input 
                          type="text" required
                          value={otraRespiratoriaDetalle}
                          onChange={e => setOtraRespiratoriaDetalle(e.target.value.slice(0, 100))}
                          maxLength={100}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none placeholder-slate-400 uppercase"
                          placeholder="Ej: Fibrosis Pulmonar, Secuela de Neumonía, etc."
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Nivel de Control Actual</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {LISTA_CONTROL.map(c => (
                         <button
                           key={c} type="button"
                           onClick={() => setNivelControl(c)}
                           className={`px-3 py-2.5 rounded-lg text-center text-[10px] font-bold transition-all border leading-tight ${
                             nivelControl === c 
                             ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                             : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white hover:border-blue-300'
                           }`}
                         >
                           {c}
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Campos Dinámicos para Encuestas Opcionales */}
                  {(diagnostico.includes("ASMA") || diagnostico === "OXIGENO DEPENDIENTE" || diagnostico === "AVNI" || diagnostico === "FIBROSIS QUISTICA" || diagnostico === "OTRAS RESPIRATORIAS") && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center">
                           📋 Encuesta de Calidad de Vida (EQ-5D)
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional / Anual</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Puntaje EQ-VAS (0 - 100)</label>
                          <input 
                            type="number" min={0} max={100}
                            value={eq5dScore} onChange={e => {
                              const val = e.target.value;
                              if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                                setEq5dScore(val);
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Ej: 80"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha de Aplicación</label>
                          <input 
                            type="date"
                            value={fechaEncuesta} onChange={e => setFechaEncuesta(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      </div>
                      
                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-medium text-blue-800 flex items-center gap-1.5">
                         <span>💡</span>
                         <span>
                           {age !== null && age < 18 
                             ? "Se sugiere aplicar la versión infantil EQ-5D-Y (Youth) según la edad del paciente." 
                             : "Se sugiere aplicar la versión estándar EQ-5D para adultos según la edad del paciente."
                           }
                         </span>
                      </div>
                    </div>
                  )}

                  {diagnostico.includes("EPOC") && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center">
                           📋 Encuesta de Calidad de Vida en EPOC (CAT)
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional / Anual</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Puntaje CAT (0 - 40)</label>
                          <input 
                            type="number" min={0} max={40}
                            value={catScore} onChange={e => {
                              const val = e.target.value;
                              if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 40)) {
                                setCatScore(val);
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Puntaje total (síntomas)..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha de Aplicación</label>
                          <input 
                            type="date"
                            value={fechaEncuesta} onChange={e => setFechaEncuesta(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     {/* Estrategia PAD */}
                     <div className={`flex items-center justify-between p-4 rounded-xl border ${paciente?.es_pad ? 'bg-blue-50/80 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" id="es_pad" checked={esPad} onChange={e => setEsPad(e.target.checked)}
                            disabled={paciente?.es_pad}
                            className={`h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-3 ${paciente?.es_pad ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          />
                          <label htmlFor="es_pad" className={`text-xs font-bold uppercase tracking-tight flex items-center ${paciente?.es_pad ? 'text-slate-500 cursor-not-allowed' : 'text-slate-700 cursor-pointer'}`}>
                             <ShieldCheck size={16} className={`mr-2 ${paciente?.es_pad ? 'text-slate-400' : 'text-blue-600'}`} /> ESTRATEGIA PAD (DOMICILIO)
                          </label>
                        </div>
                        {paciente?.es_pad && (
                          <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            🔒 PROTEGIDO
                          </span>
                        )}
                     </div>

                     {/* Caracterización Especial */}
                     <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-2">
                           Caracterización Especial
                        </label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                           <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer">
                              <input 
                                 type="checkbox" checked={esMigrante} onChange={e => setEsMigrante(e.target.checked)}
                                 className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>MIGRANTE</span>
                           </label>
                           <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer">
                              <input 
                                 type="checkbox" checked={esPuebloOriginario} onChange={e => setEsPuebloOriginario(e.target.checked)}
                                 className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>P. ORIGINARIO</span>
                           </label>
                           <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 cursor-pointer">
                              <input 
                                 type="checkbox" checked={esSecueladoTbc} onChange={e => setEsSecueladoTbc(e.target.checked)}
                                 className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>SECUELADO TBC</span>
                           </label>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* III. Citaciones */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4 uppercase text-sm tracking-tight">
                  <Calendar className="mr-2 text-blue-500" size={20} /> III. Programación de Seguimiento
               </h3>

               <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: 'Control Médico', icon: '🩺', mes: mesCitaMed, setMes: setMesCitaMed, anio: anioCitaMed, setAnio: setAnioCitaMed },
                    { label: 'Control Kinesiólogo', icon: '🏃', mes: mesCitaKin, setMes: setMesCitaKin, anio: anioCitaKin, setAnio: setAnioCitaKin },
                    { label: 'Espirometría', icon: '🌬️', mes: mesCitaEsp, setMes: setMesCitaEsp, anio: anioCitaEsp, setAnio: setAnioCitaEsp },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                       <div className="w-40 flex items-center space-x-2">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase">{item.label}</span>
                       </div>
                        <div className="flex-1 space-y-1">
                          <div className="grid grid-cols-2 gap-2">
                             <select 
                               value={item.mes} onChange={e => item.setMes(e.target.value)}
                               className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                             >
                                <option value="">MES...</option>
                                {meses.map((m, i) => <option key={m} value={i}>{m}</option>)}
                             </select>
                             <select 
                               value={item.anio} onChange={e => item.setAnio(e.target.value)}
                               className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                             >
                                <option value="">AÑO...</option>
                                {anios.map(a => <option key={a} value={a}>{a}</option>)}
                             </select>
                          </div>
                        </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">IV. Observaciones Clínicas (Máx. 2000 caracteres)</label>
               <textarea 
                  value={observaciones} onChange={e => setObservaciones(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                  placeholder="Detalle hallazgos o planes de rescate..."
               />
            </div>

            <button 
              type="submit" disabled={saving}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? "PROCESANDO..." : "GUARDAR FICHA RESPIRATORIA"}
            </button>

          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={48} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Registro Exitoso!</h3>
            <p className="text-slate-500 mb-8">La atención ha sido registrada correctamente en el módulo respiratorio.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  setPaciente(null);
                  setRutInput("");
                  setObservaciones("");
                  setEq5dScore("");
                  setCatScore("");
                  setFechaEncuesta(getLocalDateString());
                  setEsMigrante(false);
                  setEsPuebloOriginario(false);
                  setEsSecueladoTbc(false);
                  setOtraRespiratoriaDetalle("");
                  setDiagnostico(LISTA_DIAG[0]);
                  setNivelControl(LISTA_CONTROL[0]);
                  setTipoAtencion("");
                  setEsPad(false);
                  setMesCitaMed("");
                  setAnioCitaMed("");
                  setMesCitaKin("");
                  setAnioCitaKin("");
                  setMesCitaEsp("");
                  setAnioCitaEsp("");
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                Ingresar Siguiente Paciente
              </button>
              <button 
                onClick={() => router.push("/respiratorio")}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Volver al Listado
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Paciente Provisorio */}
      {showProvisorio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Nuevo Paciente Provisorio</h3>
              <button onClick={() => setShowProvisorio(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateProvisorio} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Completo</label>
                <input 
                  type="text" required value={provNombre} onChange={e => setProvNombre(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm uppercase"
                  placeholder="EJ: JUAN PEREZ SOTO"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Nacimiento</label>
                <input 
                  type="date" required value={provFechaNac} onChange={e => setProvFechaNac(e.target.value)}
                  max={getLocalDateString()}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sexo</label>
                  <select 
                    value={provSexo} onChange={e => setProvSexo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
                  >
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector</label>
                  <select 
                    value={provSector} onChange={e => setProvSector(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm"
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
              <button 
                type="submit" disabled={creatingProv}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-4"
              >
                {creatingProv ? "CREANDO..." : "CREAR PACIENTE"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
