"use client";

import { useState } from "react";
import { buscarPacienteMujerPorRut } from "@/actions/mujerActions";
import { crearPacienteProvisorio } from "@/actions/pacientesActions";
import { Search, AlertCircle, CheckCircle, ArrowLeft, HeartPulse, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLocalDateString } from "@/lib/dateUtils";
import Link from "next/link";
import FormularioAtencionMujer from "@/app/(app)/mujer/components/FormularioAtencionMujer";

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
  
  const [showProvisorio, setShowProvisorio] = useState(false);
  const [provNombre, setProvNombre] = useState("");
  const [provFechaNac, setProvFechaNac] = useState("");
  const [provSexo, setProvSexo] = useState("FEMENINO");
  const [provSector, setProvSector] = useState("SECTOR 1");
  const [creatingProv, setCreatingProv] = useState(false);

  const [success, setSuccess] = useState(false);

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
    }
  };

  const handleResetForm = () => {
    setSuccess(false);
    setPaciente(null);
    setRutInput("");
    setSearchError("");
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

      {!success && (
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
      )}

      {paciente && !success && (
        <FormularioAtencionMujer 
          paciente={paciente} 
          onSuccess={() => setSuccess(true)} 
          onCancel={() => router.push("/mujer")} 
        />
      )}

      {success && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center animate-in zoom-in-95 duration-300">
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-wide">¡Registro Exitoso!</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm font-medium">
            La atención clínica ha sido guardada. Los indicadores de la matriz y rescates se han actualizado automáticamente.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleResetForm}
              className="px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-colors shadow-sm w-full sm:w-auto uppercase tracking-wider text-xs cursor-pointer"
            >
              Ingresar Siguiente Paciente
            </button>
            <Link
              href="/mujer"
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto uppercase tracking-wider text-xs cursor-pointer inline-flex items-center justify-center"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
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
