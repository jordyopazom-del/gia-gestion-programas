"use client";

import { useState } from "react";
import { buscarPacientePorRut, saveEmpamRecord, EmpamSubmission } from "@/actions/empamActions";
import { crearPacienteProvisorio } from "@/actions/pacientesActions";
import { Search, UserCircle, Calendar, ShieldCheck, AlertCircle, UserPlus, X } from "lucide-react";

export default function NuevoEmpam() {
  const [rutInput, setRutInput] = useState("");
  const formatRut = (value: string) => {
    // Limpiar y limitar a 9 caracteres (max RUT chileno es 8+DV o 9+DV en el futuro lejano, hoy es 8+DV)
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

  const [fechaAtencion, setFechaAtencion] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    return localISOTime;
  });
  const [resultadoEfam, setResultadoEfam] = useState("Autovalente sin riesgo");
  const [estadoNutricional, setEstadoNutricional] = useState("NORMAL");
  const [pertenenciaIndigena, setPertenenciaIndigena] = useState("NO");
  const [tipoControl, setTipoControl] = useState("CONTROL EMPAM");
  const [riesgoCaidas, setRiesgoCaidas] = useState("NO");
  const [presionArterial, setPresionArterial] = useState("");
  const [glicemia, setGlicemia] = useState("");
  const [colesterol, setColesterol] = useState("");
  const [maltrato, setMaltrato] = useState("NO");
  const [actFisica, setActFisica] = useState("NO");
  const [fuma, setFuma] = useState("NO");
  const [derivacion, setDerivacion] = useState("NO");
  const [esPad, setEsPad] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Estado para paciente provisorio
  const [showProvisorio, setShowProvisorio] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [provNombre, setProvNombre] = useState("");
  const [provFechaNac, setProvFechaNac] = useState("");
  const [provSexo, setProvSexo] = useState("MASCULINO");
  const [provSector, setProvSector] = useState("SECTOR 1");
  const [creatingProv, setCreatingProv] = useState(false);

  const handleSearch = async () => {
    if (rutInput.length < 8) return;
    setLoadingSearch(true);
    setSearchError("");
    setSearchWarning("");
    setPaciente(null);

    const res = await buscarPacientePorRut(rutInput);
    if (res.error) {
      setSearchError(res.error);
      if (res.data) {
        setPaciente(res.data);
        setAge(res.age ?? null);
        setEsPad(res.data?.es_pad || false);
      }
    } else {
      setPaciente(res.data);
      setAge(res.age ?? null);
      setEsPad(res.data?.es_pad || false);
    }
    setLoadingSearch(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");
    setSuccess(false);

      const payload: EmpamSubmission = {
      rut_paciente: paciente.rut,
      fecha_atencion: fechaAtencion,
      resultado_efam: resultadoEfam,
      es_pad: esPad,
      data_clinica: {
        estado_nutricional: estadoNutricional,
        pertenencia_indigena: pertenenciaIndigena,
        tipo_control: tipoControl,
        riesgo_caidas: riesgoCaidas,
        presion_arterial: presionArterial,
        glicemia: glicemia,
        colesterol: colesterol,
        sospecha_maltrato: maltrato,
        actividad_fisica: actFisica,
        fuma: fuma,
        derivacion_medico: derivacion
      }
    };

    const res = await saveEmpamRecord(payload);
    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setShowSuccessModal(true);
      setRutInput("");
      setPaciente(null);
      setSearchWarning("");
      // Limpiar Form
      setPresionArterial(""); setGlicemia(""); setColesterol("");
      setEstadoNutricional("NORMAL"); setPertenenciaIndigena("NO");
      setTipoControl("CONTROL EMPAM"); setRiesgoCaidas("NO");
      setMaltrato("NO"); setActFisica("NO"); setFuma("NO"); setDerivacion("NO"); setEsPad(false);
    }
    setSaving(false);
  };

  const handleCreateProvisorio = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingProv(true);
    
    // Validar edad para EMPAM
    if (provFechaNac) {
      const birth = new Date(provFechaNac);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
      }
      
      if (age < 65) {
        alert(`Bloqueo de Seguridad: El paciente tiene ${age} años según la fecha ingresada. EMPAM es exclusivo para 65 o más años.`);
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
      // Una vez creado, lo buscamos de nuevo para cargar la info en el form principal
      await handleSearch();
      setShowProvisorio(false);
      setProvNombre("");
    } else {
      alert("Error al crear paciente: " + res.error);
    }
    setCreatingProv(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center mb-8 pb-4 border-b border-slate-200">
        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Evaluación Médico Preventiva del Adulto Mayor (EMPAM)</h1>
          <p className="text-slate-500 text-sm">Registro Centralizado de Atenciones Integrales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Izquierdo: Identidad blindada */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Search className="mr-2 text-slate-400" size={18} /> Búsqueda en Padrón
            </h2>
            
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="RUT del Paciente (Ej: 12345678-9)"
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
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
              <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-100">
                <div className="flex items-start">
                  <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="font-bold">{searchError.includes('Bloqueo') ? 'Bloqueo de Seguridad' : 'Alerta de Búsqueda'}</p>
                    <p className="text-xs opacity-90 mb-2">{searchError}</p>
                    {searchError === "Paciente no encontrado en el padrón interconectado." && (
                      <button 
                        onClick={() => setShowProvisorio(true)}
                        className="flex items-center text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition shadow-sm mt-2"
                      >
                        <UserPlus size={12} className="mr-1.5" /> Registrar de forma Provisoria
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {searchWarning && (
              <div className="mt-4 bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-200 flex items-start">
                <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                {searchWarning}
              </div>
            )}
          </div>

          {paciente && (
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl opacity-50 -mr-10 -mt-10"></div>
              <h2 className="text-sm uppercase tracking-wide font-semibold text-blue-600 mb-4">Identidad Verificada</h2>
              
              <div className="flex items-center mb-6">
                <div className="h-14 w-14 bg-white rounded-full border border-blue-200 flex items-center justify-center text-blue-500 mr-4 shadow-sm shrink-0">
                  <UserCircle size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase">{paciente.nombre_completo}</h3>
                  <p className="text-slate-500 text-xs mt-1">RUT: {paciente.rut}-{paciente.dv}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                  <span className="text-slate-400 block mb-1 text-[10px] uppercase">Edad</span>
                  <span className="font-semibold text-slate-700">{age !== null ? `${age} años` : "Sin dato"}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                  <span className="text-slate-400 block mb-1 text-[10px] uppercase">Sexo</span>
                  <span className="font-semibold text-slate-700 uppercase">{paciente.sexo || "-"}</span>
                </div>
                <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm col-span-2">
                  <span className="text-slate-400 block mb-1 text-[10px] uppercase">Sector de Inscripción</span>
                  <span className="font-semibold text-slate-700 uppercase">{paciente.sector}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lado Derecho: Formulario Clínico */}
        <div className="lg:col-span-2">
          <div className={`transition-all duration-300 ${(!paciente || searchError) ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
            <form onSubmit={handleSave} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
                <Calendar className="mr-2 text-slate-400" size={20} /> I. Registro de Variables Clínicas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Evaluación</label>
                  <input 
                    type="date" 
                    required 
                    value={fechaAtencion} 
                    max={new Date().toISOString().split("T")[0]} 
                    onChange={e => setFechaAtencion(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Nutricional</label>
                  <select value={estadoNutricional} onChange={e => setEstadoNutricional(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="ENFLAQUECIDO">ENFLAQUECIDO</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="SOBREPESO">SOBREPESO</option>
                    <option value="OBESIDAD">OBESIDAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Resultado EFAM</label>
                  <select required value={resultadoEfam} onChange={e => setResultadoEfam(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="Autovalente sin riesgo">Autovalente sin riesgo</option>
                    <option value="Autovalente con riesgo">Autovalente con riesgo</option>
                    <option value="Riesgo de Dependencia">Riesgo de Dependencia</option>
                    <option value="Dependencia leve">Dependencia leve</option>
                    <option value="Dependencia moderada">Dependencia moderada</option>
                    <option value="Dependencia severa">Dependencia severa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Pertenencia Indígena</label>
                  <select value={pertenenciaIndigena} onChange={e => setPertenenciaIndigena(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ingreso / Control</label>
                  <select value={tipoControl} onChange={e => setTipoControl(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="CONTROL EMPAM">CONTROL EMPAM</option>
                     <option value="INGRESO EMPAM">INGRESO EMPAM</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">P/A (Valor, ej: 120/80)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 120/80 o dejar blanco" 
                    value={presionArterial} 
                    onChange={e => setPresionArterial(e.target.value.replace(/[^0-9/]/g, "").slice(0, 7))} 
                    maxLength={7}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-mono" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Glicemia Alterada (Valor)</label>
                  <input type="number" step="any" min="0" placeholder="Ej: 115" value={glicemia} onChange={e => setGlicemia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Colesterol ≥ 200 (Valor)</label>
                  <input type="number" step="any" min="0" placeholder="Ej: 220" value={colesterol} onChange={e => setColesterol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sospecha de Maltrato</label>
                  <select value={maltrato} onChange={e => setMaltrato(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Riesgo de Caídas</label>
                  <select value={riesgoCaidas} onChange={e => setRiesgoCaidas(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">AM Act. Fís (Autovalente)</label>
                  <select value={actFisica} onChange={e => setActFisica(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fuma SI/NO</label>
                  <select value={fuma} onChange={e => setFuma(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Derivación +AMA</label>
                  <select value={derivacion} onChange={e => setDerivacion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                     <option value="NO">NO</option>
                     <option value="SI">SI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Profesional Resp.</label>
                  <input type="text" readOnly value="Usuario Activo" className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sector Territorial</label>
                  <input type="text" readOnly value={paciente?.sector || ""} className="w-full bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-600 uppercase cursor-not-allowed" />
                </div>
              </div>

              <div className={`mt-6 flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border ${paciente?.es_pad ? 'border-blue-200 bg-blue-50/80' : 'border-blue-100'}`}>
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="es_pad" 
                    checked={esPad} 
                    onChange={e => setEsPad(e.target.checked)} 
                    disabled={paciente?.es_pad}
                    className={`w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${paciente?.es_pad ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`} 
                  />
                  <label htmlFor="es_pad" className={`text-xs font-bold uppercase tracking-tight flex items-center ${paciente?.es_pad ? 'text-slate-500 cursor-not-allowed' : 'text-slate-700 cursor-pointer'}`}>
                    <ShieldCheck size={16} className={`mr-2 ${paciente?.es_pad ? 'text-slate-400' : 'text-blue-600'}`} /> ESTRATEGIA PAD (ATENCIÓN DOMICILIARIA)
                  </label>
                </div>
                {paciente?.es_pad && (
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                    🔒 PROTEGIDO
                  </span>
                )}
              </div>

              {saveError && (
                <div className="mt-8 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                  {saveError}
                </div>
              )}

              {success && (
                <div className="mt-8 bg-emerald-50 text-emerald-700 p-4 rounded-lg text-sm border border-emerald-200 font-medium text-center">
                  ¡Registro Clínico y Estadístico Guardado Exitosamente!
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  type="submit"
                  disabled={saving || !paciente || !!searchError}
                  className="w-full bg-red-500 text-white py-3 rounded-md font-semibold text-sm shadow-sm hover:bg-red-600 transition disabled:opacity-50 flex justify-center items-center"
                >
                  {saving ? "Guardando..." : "📋 Procesar y Registrar Atención"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* Modal de Registro Provisorio */}
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
                  Este registro permitirá realizar la atención clínica hoy. Percápita lo validará posteriormente.
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
                    placeholder="EJ: JUAN PEREZ SOTO"
                  />
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Fecha Nacimiento</label>
                    <input 
                      type="date" required value={provFechaNac} max={new Date().toISOString().split("T")[0]} onChange={e => setProvFechaNac(e.target.value)}
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
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {creatingProv ? 'Guardando...' : 'Confirmar e Iniciar EMPAM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Éxito Moderno */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 animate-bounce">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">¡Registro Exitoso!</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                La evaluación EMPAM ha sido procesada y guardada correctamente en el historial clínico del paciente.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Entendido, Continuar
                </button>
                <button 
                   onClick={() => window.location.href = "/empam"}
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
