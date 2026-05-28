"use client";

import { useState, useMemo } from "react";
import { Search, HeartPulse, User, ShieldCheck, Download, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { UserProfile } from "@/actions/userActions";
import Link from "next/link";

type PacienteMujer = {
  rut: string;
  dv: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sector: string;
  telefono: string;
  estado: string;
  es_pad?: boolean;
  ultima_fecha_pap?: string;
  ultimo_resultado_pap?: string;
};

export default function MujerClientView({ initialData, user }: { initialData: PacienteMujer[], user: UserProfile }) {
  const [data] = useState<PacienteMujer[]>(initialData);
  const [searchRut, setSearchRut] = useState("");
  const [selectedSector, setSelectedSector] = useState("TODOS");
  const [onlyPad, setOnlyPad] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); // "general" o "pap"
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  const sectores = useMemo(() => {
    const s = new Set(data.map(p => p.sector).filter(Boolean));
    return ["TODOS", ...Array.from(s)].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;

    // Solo activos por defecto para Phase 1
    result = result.filter(p => !p.estado || p.estado === 'ACTIVO');

    if (searchRut) {
      const q = searchRut.replace(/[^0-9kK-]/g, "").toLowerCase();
      result = result.filter(p => 
        p.rut.toLowerCase().includes(q) || 
        p.nombre_completo.toLowerCase().includes(searchRut.toLowerCase())
      );
    }

    if (onlyPad) {
      result = result.filter(p => p.es_pad);
    }

    if (selectedSector !== "TODOS") {
      result = result.filter(p => p.sector === selectedSector);
    }

    if (activeTab === "pap") {
      // Filtrar mujeres de 25 a 64 años
      result = result.filter(p => {
        const age = calculateAge(p.fecha_nacimiento);
        return age !== null && age >= 25 && age <= 64;
      });
    }

    return result;
  }, [data, searchRut, onlyPad, selectedSector, activeTab]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToExcel = () => {
    const exportData = filteredData.map(p => ({
      "RUT": `${p.rut}-${p.dv}`,
      "Nombre": p.nombre_completo,
      "Edad": calculateAge(p.fecha_nacimiento),
      "Sector": p.sector,
      "Teléfono": p.telefono || "Sin Registro",
      "Estado PAD": p.es_pad ? "SÍ" : "NO"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Programa Mujer");
    XLSX.writeFile(wb, "Programa_Mujer.xlsx");
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center tracking-tight">
            <HeartPulse className="mr-3 text-pink-500" size={32} strokeWidth={2.5} />
            Programa de la Mujer
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Población femenina bajo control</p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/mujer/nuevo"
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-pink-700 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            <span>Registrar PAP</span>
          </Link>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm text-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar Nómina</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab("general"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "general" 
            ? "bg-white text-slate-800 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Población General
        </button>
        <button
          onClick={() => { setActiveTab("pap"); setCurrentPage(1); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "pap" 
            ? "bg-white text-pink-600 shadow-sm" 
            : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tamizaje PAP (25-64 años)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por RUT o Nombre..."
                value={searchRut}
                onChange={(e) => { setSearchRut(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all shadow-sm font-medium"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSector}
                onChange={(e) => { setSelectedSector(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all shadow-sm max-w-[200px]"
              >
                {sectores.map(s => <option key={s} value={s}>{s === "TODOS" ? "Todos los Sectores" : s}</option>)}
              </select>
              <button
                onClick={() => { setOnlyPad(!onlyPad); setCurrentPage(1); }}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  onlyPad 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck size={16} className={`mr-2 ${onlyPad ? 'text-blue-600' : 'text-slate-400'}`} />
                Solo Pacientes PAD
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">RUT</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Edad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sector</th>
                {activeTab === "pap" ? (
                  <>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Último PAP</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  </>
                ) : (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron pacientes mujeres en el padrón activo.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p, i) => {
                  const age = calculateAge(p.fecha_nacimiento);
                  return (
                    <tr key={i} className="hover:bg-pink-50/30 transition-colors group">
                      <td className="px-6 py-4 font-mono text-sm font-medium text-pink-600">{p.rut}-{p.dv}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 uppercase text-sm truncate max-w-[200px]">{p.nombre_completo}</span>
                          {p.es_pad && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black tracking-widest shrink-0">
                              <ShieldCheck size={10} className="mr-1 text-blue-600" />
                              PAD
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">{age}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 uppercase whitespace-nowrap">{p.sector}</td>
                      {activeTab === "pap" ? (
                        <>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.ultima_fecha_pap ? new Date(p.ultima_fecha_pap).toLocaleDateString('es-CL') : "—"}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.ultimo_resultado_pap || "PENDIENTE"}</td>
                          <td className="px-6 py-4 text-sm font-bold">
                            {p.ultima_fecha_pap ? (() => {
                              const fecha = new Date(p.ultima_fecha_pap);
                              const hoy = new Date();
                              const diffAnios = hoy.getFullYear() - fecha.getFullYear();
                              if (diffAnios >= 3) {
                                return <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-black">VENCIDO</span>;
                              }
                              return <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-black">VIGENTE</span>;
                            })() : <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-black">SIN REGISTRO</span>}
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{p.telefono || "—"}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
