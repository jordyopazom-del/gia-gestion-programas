"use client";

import { useState } from "react";
import { buscarPacienteMujerPorRut, guardarPap } from "@/actions/mujerActions";
import { Search, UserCircle, Calendar, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NuevoPap() {
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

  const [fechaPap, setFechaPap] = useState(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 10);
    return localISOTime;
  });
  const [resultado, setResultado] = useState("PENDIENTE");
  const [observaciones, setObservaciones] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSearch = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    setSaving(true);
    setSaveError("");

    const res = await guardarPap({
      rut_paciente: paciente.rut,
      fecha_pap: fechaPap,
      resultado,
      observaciones
    });

    setSaving(false);

    if (res.error) {
      setSaveError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/mujer");
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
          <Calendar className="mr-3 text-pink-500" size={32} />
          Registrar Toma de PAP
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Ingreso de tamizaje para el programa de la mujer</p>
      </div>

      {/* Buscador */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Buscar Paciente</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ingrese RUT de la paciente..."
              value={rutInput}
              onChange={(e) => setRutInput(formatRut(e.target.value))}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-mono"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loadingSearch || rutInput.length < 2}
            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loadingSearch ? "Buscando..." : "Buscar"}
          </button>
        </div>
        {searchError && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg">
            <AlertCircle size={16} />
            {searchError}
          </div>
        )}
      </div>

      {paciente && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ficha Paciente */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                <UserCircle size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase">{paciente.nombre_completo}</h2>
                <p className="text-sm text-slate-500 font-medium">RUT: {paciente.rut}-{paciente.dv} | Sector: {paciente.sector}</p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de la Toma</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    value={fechaPap}
                    onChange={(e) => setFechaPap(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Resultado</label>
                <select
                  value={resultado}
                  onChange={(e) => setResultado(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="ALTERADO">ALTERADO</option>
                  <option value="MUESTRA INSATISFACTORIA">MUESTRA INSATISFACTORIA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                maxLength={2000}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-medium h-24"
                placeholder="Ingrese observaciones clínicas relevantes..."
              />
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              {saveError}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 p-3 rounded-lg">
              <CheckCircle size={16} />
              ¡Registro guardado con éxito! Redirigiendo...
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/mujer")}
              className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="bg-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Registro"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
