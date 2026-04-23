"use client";

import { useState } from "react";
import { buscarPacientePorRut, saveEmpamRecord, EmpamSubmission } from "@/actions/empamActions";
import { Search, UserCircle, Calendar, ShieldCheck, AlertCircle } from "lucide-react";

export default function NuevoEmpam() {
  const [rutInput, setRutInput] = useState("");
  const [paciente, setPaciente] = useState<any>(null);
  const [age, setAge] = useState<number | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchWarning, setSearchWarning] = useState("");

  const [fechaAtencion, setFechaAtencion] = useState(new Date().toISOString().split("T")[0]);
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
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSearch = async () => {
    if (rutInput.length < 8) return;
    setLoadingSearch(true);
    setSearchError("");
    setSearchWarning("");
    setPaciente(null);

    const res = await buscarPacientePorRut(rutInput);
    if (res.error) {
      setSearchError(res.error);
    } else {
      if (res.warning) setSearchWarning(res.warning);
      setPaciente(res.data);
      setAge(res.age ?? null);
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
      setRutInput("");
      setPaciente(null);
      setSearchWarning("");
      // Limpiar Form
      setPresionArterial(""); setGlicemia(""); setColesterol("");
      setEstadoNutricional("NORMAL"); setPertenenciaIndigena("NO");
      setTipoControl("CONTROL EMPAM"); setRiesgoCaidas("NO");
      setMaltrato("NO"); setActFisica("NO"); setFuma("NO"); setDerivacion("NO");
    }
    setSaving(false);
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
            
            <div className="flex direction-column space-y-2">
              <input 
                type="text" 
                placeholder="RUT del Paciente (Ej: 12345678-9)"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={rutInput}
                onChange={(e) => setRutInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={loadingSearch}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                {loadingSearch ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {searchError && (
              <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start">
                <AlertCircle className="mr-2 shrink-0 mt-0.5" size={16} />
                {searchError}
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
          <div className={`transition-all duration-300 ${!paciente ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
            <form onSubmit={handleSave} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
                <Calendar className="mr-2 text-slate-400" size={20} /> I. Registro de Variables Clínicas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Evaluación</label>
                  <input type="date" required value={fechaAtencion} onChange={e => setFechaAtencion(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">P/A ≥ 140/90 (Valor)</label>
                  <input type="text" placeholder="Ej: 150/95 o dejar blanco" value={presionArterial} onChange={e => setPresionArterial(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Glicemia Alterada (Valor)</label>
                  <input type="text" placeholder="Ej: 115 o dejar blanco" value={glicemia} onChange={e => setGlicemia(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Colesterol ≥ 200 (Valor)</label>
                  <input type="text" placeholder="Ej: 220 o dejar blanco" value={colesterol} onChange={e => setColesterol(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
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
                  disabled={saving || !paciente}
                  className="w-full bg-red-500 text-white py-3 rounded-md font-semibold text-sm shadow-sm hover:bg-red-600 transition disabled:opacity-50 flex justify-center items-center"
                >
                  {saving ? "Guardando..." : "📋 Procesar y Registrar Atención"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
