"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { buscarPacienteMujerPorRut, guardarPap, ingresarEmbarazo, obtenerProfesionalesMatroneria } from "@/actions/mujerActions";
import { crearPacienteProvisorio } from "@/actions/pacientesActions";
import { Search, UserCircle, Calendar, ShieldCheck, AlertCircle, CheckCircle, FileText, ArrowLeft, HeartPulse, Sparkles, Clock, AlertTriangle, User, X, ChevronRight, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";
import Link from "next/link";
import { decodificarCodigoPap, DecodificacionPap } from "@/lib/decodificadorPap";

export default function NuevoRegistroMujer() {
  const router = useRouter();
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
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [tipoIngreso, setTipoIngreso] = useState<"PAP" | "EMBARAZO">("PAP");

  // Lista y Selección Predictiva de Profesionales
  const [profesionalesList, setProfesionalesList] = useState<{ rut: string; nombre: string; profesion: string; rol: string }[]>([]);
  const [profesionalRut, setProfesionalRut] = useState<string>("");
  const [searchProfInput, setSearchProfInput] = useState<string>("");
  const [showProfDropdown, setShowProfDropdown] = useState<boolean>(false);
  const [modoProfesional, setModoProfesional] = useState<"PROPIO" | "MANUAL">("PROPIO");
  const profSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    obtenerProfesionalesMatroneria().then(res => {
      if (res.profesionales) {
        setProfesionalesList(res.profesionales);
      }
    });
  }, []);

  // Cerrar dropdown de profesionales al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profSearchRef.current && !profSearchRef.current.contains(event.target as Node)) {
        setShowProfDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProfesionales = useMemo(() => {
    if (!searchProfInput.trim()) return profesionalesList;
    const q = searchProfInput.toLowerCase().trim();
    return profesionalesList.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      p.rut.toLowerCase().includes(q) || 
      (p.profesion && p.profesion.toLowerCase().includes(q))
    );
  }, [profesionalesList, searchProfInput]);

  const profesionalSeleccionadoObj = useMemo(() => {
    if (!profesionalRut) return null;
    return profesionalesList.find(p => p.rut === profesionalRut) || null;
  }, [profesionalesList, profesionalRut]);

  const [showProvisorio, setShowProvisorio] = useState(false);
  const [provNombre, setProvNombre] = useState("");
  const [provFechaNac, setProvFechaNac] = useState("");
  const [provSexo, setProvSexo] = useState("FEMENINO");
  const [provSector, setProvSector] = useState("SECTOR 1");
  const [creatingProv, setCreatingProv] = useState(false);

  const handleCreateProvisorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutInput || !provNombre || !provFechaNac) return;
    setCreatingProv(true);
    
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
      alert("Error al crear paciente: " + res.error);
    }
    setCreatingProv(false);
  };

  const handleSearch = async () => {
    if (!rutInput || rutInput.length < 2) return;
    setLoadingSearch(true);
    setSearchError("");
    setPaciente(null);

    const res = await buscarPacienteMujerPorRut(rutInput);
    setLoadingSearch(false);

    if (res.error) {
      setSearchError(res.error);
    } else {
      setPaciente(res.data);
      if (fechaPap) {
        const d = new Date(fechaPap);
        d.setMonth(d.getMonth() + 36);
        setFechaProximoControl(d.toISOString().split("T")[0]);
      }
    }
  };

  // Formulario PAP / VPH y Decodificador Inteligente
  const [tipoExamen, setTipoExamen] = useState("PAP");
  const [fechaPap, setFechaPap] = useState(() => getLocalDateString());
  const [codigoLab, setCodigoLab] = useState(""); // Empieza en blanco para evitar errores
  const [periodicidadMeses, setPeriodicidadMeses] = useState<number>(36);
  const [fechaProximoControl, setFechaProximoControl] = useState("");
  const [criterioPersonalizado, setCriterioPersonalizado] = useState(false);
  const [adecuacionMuestra, setAdecuacionMuestra] = useState("SATISFACTORIA");
  const [motivoInsatisfactoria, setMotivoInsatisfactoria] = useState("");
  const [resultado, setResultado] = useState("NEGATIVO");
  const [fechaResultado, setFechaResultado] = useState(() => getLocalDateString());
  const [derivadoUpc, setDerivadoUpc] = useState(false);
  const [fechaDerivacionUpc, setFechaDerivacionUpc] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Formulario Embarazo
  const [fum, setFum] = useState("");
  const [fpp, setFpp] = useState("");
  const [fechaUltimoControl, setFechaUltimoControl] = useState("");
  const [fechaProximoControlEmb, setFechaProximoControlEmb] = useState("");
  const [estadoNutricional, setEstadoNutricional] = useState("");
  const [observacionesEmb, setObservacionesEmb] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Decodificación en tiempo real
  const decodificacion: DecodificacionPap = useMemo(() => {
    if (tipoExamen !== "PAP") {
      return {
        codigoOriginal: "",
        codigoLimpio: "",
        diagnostico: resultado === "POSITIVO_16_18" ? "POSITIVO VPH 16/18" : resultado === "POSITIVO_OTROS" ? "POSITIVO Otros VPH" : resultado === "NEGATIVO" ? "NEGATIVO VPH" : "PENDIENTE",
        adecuacion: "SATISFACTORIA",
        adecuacionDescripcion: "Muestra Satisfactoria",
        microbiologia: [],
        conducta: [],
        esPatologico: resultado.startsWith("POSITIVO"),
        esInsatisfactorio: false,
        periodicidadSugeridaMeses: resultado === "NEGATIVO" ? 60 : 0,
        textoResumen: "",
      };
    }
    if (!codigoLab.trim()) {
      return {
        codigoOriginal: "",
        codigoLimpio: "",
        diagnostico: "Pendiente de ingresar código",
        adecuacion: "SATISFACTORIA",
        adecuacionDescripcion: "Ingrese código del informe",
        microbiologia: [],
        conducta: [],
        esPatologico: false,
        esInsatisfactorio: false,
        periodicidadSugeridaMeses: 36,
        textoResumen: "",
      };
    }
    return decodificarCodigoPap(codigoLab);
  }, [codigoLab, tipoExamen, resultado]);

  const handleCodigoLabChange = (val: string) => {
    const raw = val.toUpperCase();
    setCodigoLab(raw);
    if (!raw.trim()) return;

    const dec = decodificarCodigoPap(raw);
    
    if (dec.esInsatisfactorio) {
      setAdecuacionMuestra("INSATISFACTORIA");
      setMotivoInsatisfactoria(dec.motivoInsatisfactoria || "CELULARIDAD_ESCASA");
      setResultado("MUESTRA INSATISFACTORIA");
    } else {
      setAdecuacionMuestra("SATISFACTORIA");
      setMotivoInsatisfactoria("");
      if (dec.esPatologico) {
        setResultado(dec.diagnosticoCodigo || "ASC-US");
        setDerivadoUpc(true);
      } else {
        setResultado("NEGATIVO");
        setDerivadoUpc(false);
      }
    }

    if (!criterioPersonalizado) {
      setPeriodicidadMeses(dec.periodicidadSugeridaMeses);
      if (fechaPap && dec.periodicidadSugeridaMeses > 0) {
        const d = new Date(fechaPap);
        d.setMonth(d.getMonth() + dec.periodicidadSugeridaMeses);
        setFechaProximoControl(d.toISOString().split("T")[0]);
      } else if (dec.periodicidadSugeridaMeses === 0) {
        setFechaProximoControl("");
      }
    }
  };

  const handlePeriodicidadChange = (meses: number, manual: boolean = true) => {
    setPeriodicidadMeses(meses);
    if (manual) setCriterioPersonalizado(true);
    if (fechaPap && meses > 0) {
      const d = new Date(fechaPap);
      d.setMonth(d.getMonth() + meses);
      setFechaProximoControl(d.toISOString().split("T")[0]);
    } else if (meses === 0) {
      setFechaProximoControl("");
    }
  };

  const handleFumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fumVal = e.target.value;
    setFum(fumVal);
    if (fumVal) {
      const date = new Date(fumVal);
      date.setDate(date.getDate() + 280);
      setFpp(date.toISOString().split('T')[0]);
    } else {
      setFpp("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");

    if (tipoIngreso === "PAP") {
      const isInsatisfactoria = tipoExamen === "PAP" ? (adecuacionMuestra === "INSATISFACTORIA" || decodificacion.esInsatisfactorio) : false;
      const realResultado = isInsatisfactoria ? "MUESTRA INSATISFACTORIA" : (tipoExamen === "PAP" ? (decodificacion.esPatologico ? (decodificacion.diagnosticoCodigo || resultado) : "NEGATIVO") : resultado);
      const isPatologico = !isInsatisfactoria && realResultado !== "NEGATIVO" && realResultado !== "NORMAL" && realResultado !== "PENDIENTE";

      const res = await guardarPap({
        rut_paciente: paciente.rut,
        fecha_pap: fechaPap,
        profesional_rut: modoProfesional === "MANUAL" ? (profesionalRut || undefined) : undefined,
        tipo_examen: tipoExamen,
        adecuacion_muestra: isInsatisfactoria ? "INSATISFACTORIA" : "SATISFACTORIA",
        motivo_insatisfactoria: isInsatisfactoria ? (motivoInsatisfactoria || decodificacion.motivoInsatisfactoria) : undefined,
        resultado: realResultado,
        fecha_resultado: realResultado !== "PENDIENTE" ? (fechaResultado || fechaPap) : undefined,
        derivado_upc: isPatologico ? derivadoUpc : false,
        fecha_derivacion_upc: isPatologico && derivadoUpc ? (fechaDerivacionUpc || fechaPap) : undefined,
        codigo_lab: tipoExamen === "PAP" ? (codigoLab || undefined) : undefined,
        periodicidad_meses: periodicidadMeses,
        fecha_proximo_control: fechaProximoControl || undefined,
        observaciones: observaciones || (tipoExamen === "PAP" ? decodificacion.textoResumen : undefined)
      });

      setSaving(false);

      if (res.error) {
        setSaveError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/mujer");
        }, 1500);
      }
    } else {
      const res = await ingresarEmbarazo({
        rut_paciente: paciente.rut,
        fum,
        fpp,
        fecha_ultimo_control: fechaUltimoControl || undefined,
        fecha_proximo_control: fechaProximoControlEmb || undefined,
        estado_nutricional: estadoNutricional || undefined,
        observaciones: observacionesEmb || undefined
      });

      setSaving(false);

      if (res.error) {
        setSaveError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/mujer");
        }, 1500);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <Link 
          href="/mujer"
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <HeartPulse className="mr-3 text-pink-500" size={32} />
            Registrar Atención Clínica de la Mujer
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Tamizaje CaCu con Decodificador Inteligente o Ingreso de Embarazo</p>
        </div>
      </div>

      {/* Buscador de Paciente ESTÁNDAR POR RUT */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Búsqueda de Paciente</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ingrese RUT de la paciente (ej: 12345678-9)..."
              value={rutInput}
              onChange={(e) => setRutInput(formatRut(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-mono font-bold text-slate-800 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loadingSearch || rutInput.length < 2}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
          >
            {loadingSearch ? "Buscando..." : "Buscar Paciente"}
          </button>
        </div>
        {searchError && (
          <div className="mt-3 flex flex-col items-start gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {searchError}
            </div>
            {searchError === "Paciente no encontrado en el padrón interconectado." && (
              <button 
                onClick={() => setShowProvisorio(true)}
                className="flex items-center text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition shadow-sm mt-1 cursor-pointer"
              >
                <UserPlus size={12} className="mr-1.5" /> Registrar de forma Provisoria
              </button>
            )}
          </div>
        )}
      </div>

      {paciente && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ficha Rápida de la Paciente Seleccionada */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 shrink-0">
                <UserCircle size={28} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div>
                  <h2 className="text-base font-bold text-slate-800 uppercase leading-tight">{paciente.nombre_completo}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">RUT: {paciente.rut}-{paciente.dv}</p>
                </div>
                <div className="text-left sm:text-right flex items-center sm:justify-end gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-pink-50 text-pink-700 border border-pink-100 rounded-full text-xs font-black uppercase tracking-wider">
                    Sector: {paciente.sector || "General"}
                  </span>
                  {paciente.histerectomizada && (
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-black uppercase tracking-wider">
                      HST (Excluida)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Selector de Tipo de Atención */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTipoIngreso("PAP")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                tipoIngreso === "PAP"
                  ? 'bg-pink-50 border-pink-500 shadow-xs ring-2 ring-pink-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">Tamizaje PAP / VPH</span>
                <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">Decodificador Lab</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Registrar informe de citología con códigos de laboratorio.</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoIngreso("EMBARAZO")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                tipoIngreso === "EMBARAZO"
                  ? 'bg-purple-50 border-purple-500 shadow-xs ring-2 ring-purple-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">Control de Embarazo</span>
                <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">Cálculo FPP</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Registrar FUM, FPP automática y controles gestacionales.</p>
            </button>
          </div>

          {/* Formulario Clínico Seleccionado */}
          {tipoIngreso === "PAP" ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Detalles del Examen PAP / VPH
              </h3>

              {/* Selector Predictivo de Profesional Responsable / Matrón(a) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-pink-600" />
                    Profesional Responsable / Matrón(a)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { 
                        setModoProfesional("PROPIO"); 
                        setProfesionalRut(""); 
                        setSearchProfInput("");
                        setShowProfDropdown(false);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modoProfesional === "PROPIO" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Mi Usuario
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModoProfesional("MANUAL");
                        setProfesionalRut("");
                        setSearchProfInput("");
                        setShowProfDropdown(true);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modoProfesional === "MANUAL" ? 'bg-pink-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Buscar Otro Profesional
                    </button>
                  </div>
                </div>

                {modoProfesional === "MANUAL" ? (
                  <div className="relative" ref={profSearchRef}>
                    {profesionalSeleccionadoObj ? (
                      <div className="flex items-center justify-between p-3 bg-white border border-pink-200 rounded-xl shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center">
                            {profesionalSeleccionadoObj.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs block uppercase">
                              {profesionalSeleccionadoObj.nombre}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {profesionalSeleccionadoObj.profesion || "Profesional"} • RUT: {profesionalSeleccionadoObj.rut}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProfesionalRut("");
                            setSearchProfInput("");
                            setShowProfDropdown(true);
                          }}
                          className="text-[10px] font-bold text-pink-600 hover:text-pink-800 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          placeholder="Escribe nombre, apellido o RUT del matrón(a)..."
                          value={searchProfInput}
                          onChange={(e) => {
                            setSearchProfInput(e.target.value);
                            setShowProfDropdown(true);
                          }}
                          onFocus={() => setShowProfDropdown(true)}
                          className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-pink-500 outline-none shadow-xs"
                          autoFocus
                        />
                        {searchProfInput && (
                          <button
                            type="button"
                            onClick={() => { setSearchProfInput(""); setShowProfDropdown(false); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}

                        {/* Menú de Sugerencias de Profesionales */}
                        {showProfDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Profesionales disponibles ({filteredProfesionales.length})</span>
                              <span>Haz clic para seleccionar</span>
                            </div>
                            {filteredProfesionales.length > 0 ? (
                              filteredProfesionales.map((prof) => (
                                <button
                                  key={prof.rut}
                                  type="button"
                                  onClick={() => {
                                    setProfesionalRut(prof.rut);
                                    setSearchProfInput(prof.nombre);
                                    setShowProfDropdown(false);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-left hover:bg-pink-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-7 w-7 rounded-lg bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                      {prof.nombre.charAt(0)}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-800 text-xs block group-hover:text-pink-700 transition-colors uppercase">
                                        {prof.nombre}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {prof.profesion || "Profesional"} • RUT: {prof.rut}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    Seleccionar
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                                No se encontraron profesionales que coincidan con &quot;{searchProfInput}&quot;.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </div>
                      <span className="font-bold">Usuario en sesión</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Se registrará automáticamente con tu cuenta</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Examen</label>
                  <select
                    value={tipoExamen}
                    onChange={(e) => {
                      setTipoExamen(e.target.value);
                      if (e.target.value === "VPH") {
                        setResultado("NEGATIVO");
                        handlePeriodicidadChange(60, false);
                      } else {
                        handleCodigoLabChange(codigoLab);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                  >
                    <option value="PAP">PAP (Citología Convencional)</option>
                    <option value="VPH">Test de VPH (Tamizaje Molecular)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de la Toma</label>
                  <input
                    type="date"
                    value={fechaPap}
                    onChange={(e) => {
                      setFechaPap(e.target.value);
                      if (e.target.value && periodicidadMeses > 0) {
                        const d = new Date(e.target.value);
                        d.setMonth(d.getMonth() + periodicidadMeses);
                        setFechaProximoControl(d.toISOString().split("T")[0]);
                      }
                    }}
                    max={getLocalDateString()}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* SECCIÓN PAP: DECODIFICADOR INTELIGENTE */}
              {tipoExamen === "PAP" && (
                <div className="p-4 bg-pink-50/60 border border-pink-100 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-xs font-black text-pink-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-pink-600" />
                      Código Compuesto de Anatomía Patológica (Laboratorio)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codigoLab}
                        onChange={(e) => handleCodigoLabChange(e.target.value)}
                        placeholder="Escriba código del informe (ej: IG8, IG7, AG8T, H1...)"
                        className="flex-1 px-4 py-2.5 bg-white border border-pink-200 rounded-xl font-mono font-black text-pink-700 tracking-widest text-base uppercase focus:ring-2 focus:ring-pink-500 outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Traducción Clínica en Vivo */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Interpretación Clínica Automática</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        decodificacion.esPatologico ? 'bg-red-100 text-red-700' : decodificacion.esInsatisfactorio ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {decodificacion.esPatologico ? 'PATOLÓGICO / ALTERADO' : decodificacion.esInsatisfactorio ? 'MUESTRA INADECUADA' : 'NORMAL / NEGATIVO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Diagnóstico Citológico</span>
                        <span className={`font-bold ${decodificacion.esPatologico ? 'text-red-600' : 'text-slate-800'}`}>
                          {decodificacion.diagnostico}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Adecuación de Muestra</span>
                        <span className={`font-semibold ${decodificacion.esInsatisfactorio ? 'text-orange-600' : 'text-slate-700'}`}>
                          {decodificacion.adecuacionDescripcion}
                        </span>
                      </div>

                      {decodificacion.microbiologia.length > 0 && (
                        <div className="col-span-1 sm:col-span-2 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                          <span className="block text-[9px] font-bold text-amber-800 uppercase">Hallazgos Microbiológicos / Inflamatorios</span>
                          <span className="text-amber-900 font-medium">{decodificacion.microbiologia.join(" • ")}</span>
                        </div>
                      )}

                      {decodificacion.conducta.length > 0 && (
                        <div className="col-span-1 sm:col-span-2 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                          <span className="block text-[9px] font-bold text-blue-800 uppercase">Conducta Sugerida por Laboratorio</span>
                          <span className="text-blue-900 font-semibold">{decodificacion.conducta.join(" • ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SELECTOR DE PERIODICIDAD CLÍNICA */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                          Periodicidad y Próximo Control PAP
                        </label>
                        <p className="text-[10px] text-slate-400">Seleccione la frecuencia de citación:</p>
                      </div>
                      {criterioPersonalizado && (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                          Criterio Clínico Activo
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handlePeriodicidadChange(36)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          periodicidadMeses === 36
                            ? 'bg-pink-600 text-white border-pink-600 shadow-xs ring-2 ring-pink-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        3 Años
                        <span className="block text-[8px] font-normal opacity-80">Estándar MINSAL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePeriodicidadChange(12)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          periodicidadMeses === 12
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        1 Año
                        <span className="block text-[8px] font-normal opacity-80">Criterio Clínico / G7</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePeriodicidadChange(6)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          periodicidadMeses === 6
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        6 Meses
                        <span className="block text-[8px] font-normal opacity-80">Tratamiento / Control</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePeriodicidadChange(0)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                          periodicidadMeses === 0
                            ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        UPC / Repetir
                        <span className="block text-[8px] font-normal opacity-80">Sin Vigencia</span>
                      </button>
                    </div>

                    {periodicidadMeses > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">Fecha Próximo PAP Calculada:</span>
                        <input
                          type="date"
                          value={fechaProximoControl}
                          onChange={(e) => {
                            setFechaProximoControl(e.target.value);
                            setCriterioPersonalizado(true);
                          }}
                          className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones Clínicas</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={2000}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium h-20 text-slate-700 text-sm resize-none"
                  placeholder="Observaciones adicionales del matrón(a)..."
                />
              </div>
            </div>
          ) : (
            /* FORMULARIO DE EMBARAZO */
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Ingreso al Programa de Control Gestacional (Embarazo)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">F.U.M (Fecha Última Menstruación)</label>
                  <input
                    type="date"
                    value={fum}
                    onChange={handleFumChange}
                    max={getLocalDateString()}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">F.P.P (Fecha Probable de Parto)</label>
                  <input
                    type="date"
                    value={fpp}
                    readOnly
                    className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-purple-700 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Último Control</label>
                  <input
                    type="date"
                    value={fechaUltimoControl}
                    onChange={(e) => setFechaUltimoControl(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Próximo Control</label>
                  <input
                    type="date"
                    value={fechaProximoControlEmb}
                    onChange={(e) => setFechaProximoControlEmb(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado Nutricional</label>
                <select
                  value={estadoNutricional}
                  onChange={(e) => setEstadoNutricional(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="ENFLAQUECIDA">Enflaquecida</option>
                  <option value="NORMOPESO">Normopeso</option>
                  <option value="SOBREPESO">Sobrepeso</option>
                  <option value="OBESIDAD">Obesidad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones Gestacionales</label>
                <textarea
                  value={observacionesEmb}
                  onChange={(e) => setObservacionesEmb(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-xs focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  placeholder="Antecedentes obstétricos, patologías asociadas, etc..."
                />
              </div>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} />
              {saveError}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100 shadow-sm">
              <CheckCircle size={16} />
              ¡Atención registrada con éxito en el Programa de la Mujer! Redirigiendo al panel...
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/mujer")}
              className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {saving ? "Guardando Registro..." : "Guardar Atención"}
            </button>
          </div>
        </form>
      )}

      {showProvisorio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateProvisorio}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center text-slate-800">
                  <UserPlus className="mr-2 text-pink-600" size={20} />
                  <h3 className="font-bold">Ingreso de Excepción (Provisorio)</h3>
                </div>
                <button type="button" onClick={() => setShowProvisorio(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={20}/>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 text-[10px] text-pink-700 font-medium">
                  Este registro permitirá realizar la atención clínica de forma inmediata. Percápita lo validará posteriormente.
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none uppercase font-medium"
                    placeholder="EJ: MARÍA PÉREZ SOTO"
                  />
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha Nacimiento</label>
                    <input 
                      type="date" required value={provFechaNac} max={getLocalDateString()} onChange={e => setProvFechaNac(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Sexo</label>
                    <select 
                      value={provSexo} onChange={e => setProvSexo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
                    >
                      <option value="FEMENINO">FEMENINO</option>
                      <option value="MASCULINO">MASCULINO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Sector Territorial</label>
                  <select 
                    value={provSector} onChange={e => setProvSector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none cursor-pointer"
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
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={creatingProv}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creatingProv ? "Registrando..." : "Crear Paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
