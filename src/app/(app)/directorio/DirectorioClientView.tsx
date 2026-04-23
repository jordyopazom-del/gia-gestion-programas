"use client";

import { useState, useMemo } from "react";
import { PacienteData } from "@/actions/pacientesActions";
import { Search, MapPin, Download } from "lucide-react";

const calculateAge = (birthDate: string | null) => {
  if (!birthDate) return "-";
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return "-";
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function DirectorioClientView({ pacientes }: { pacientes: PacienteData[] }) {
  const [searchRut, setSearchRut] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterSector, setFilterSector] = useState("Todos");

  // Get distinct sectors for the filter
  const sectors = useMemo(() => {
    const s = new Set(pacientes.map(p => p.sector));
    return ["Todos", ...Array.from(s).sort()];
  }, [pacientes]);

  // Filter patients
  const filtered = useMemo(() => {
    return pacientes.filter(p => {
      const qRut = searchRut.replace(/[-.]/g, "").toLowerCase();
      const matchRut = p.rut.toLowerCase().includes(qRut);
      const matchName = p.nombre_completo.toLowerCase().includes(searchName.toLowerCase());
      const matchSector = filterSector === "Todos" || p.sector === filterSector;
      return matchRut && matchName && matchSector;
    });
  }, [pacientes, searchRut, searchName, filterSector]);

  // Derived stats
  const totalPacientes = pacientes.length;
  // This could be any other stat. For now let's mimic the prototype:
  const stat1 = totalPacientes; // Total
  const stat2 = pacientes.filter(p => p.sexo === "FEMENINO").length; // Females
  const stat3 = pacientes.filter(p => p.sexo === "MASCULINO").length; // Males
  const stat4 = pacientes.filter(p => {
    const age = calculateAge(p.fecha_nacimiento);
    return typeof age === 'number' ? age >= 65 : Number(age) >= 65;
  }).length; // Elderly

  return (
    <div className="flex flex-col space-y-6">
      {/* Target Stats Header to mimic prototype */}
      <div className="grid grid-cols-4 gap-4 px-6 pt-4">
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-800">{stat1.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Inscritos Totales</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat2.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Mujeres</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat3.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Hombres</p>
        </div>
        <div className="text-center pb-6 border-b border-slate-200">
           <p className="text-4xl font-light text-slate-700">{stat4.toLocaleString("es-CL")}</p>
           <p className="text-xs font-semibold text-slate-400 uppercase mt-2">Adultos Mayores (65+)</p>
        </div>
      </div>

      <div className="px-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Buscador y Filtros</h2>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <Search size={12} className="mr-1" /> Buscar por RUT (sin puntos)
            </label>
            <input 
              type="text" 
              value={searchRut}
              onChange={(e) => setSearchRut(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100" 
              placeholder="Ej: 17297171"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <Search size={12} className="mr-1" /> Buscar por Nombre o Apellido
            </label>
            <input 
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100" 
              placeholder="Ej: Daniela"
            />
          </div>
          <div className="flex-1">
            <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
              <MapPin size={12} className="mr-1" /> Filtrar por Sector
            </label>
            <select 
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <div className="flex justify-between items-end mb-2">
           <span className="text-sm text-slate-600 font-medium">Mostrando {filtered.length} pacientes de {pacientes.length}</span>
           <button className="text-slate-400 hover:text-slate-600"><Download size={16} /></button>
        </div>
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs whitespace-nowrap text-slate-600">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 uppercase font-medium text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-500">RUT</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Nombre Completo</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-center">Edad</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-center">Sexo</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Sector</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Teléfono</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Dirección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 500).map((p, i) => (
                  <tr key={i} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2 font-medium">{p.rut}-{p.dv}</td>
                    <td className="px-4 py-2 uppercase truncate" title={p.nombre_completo}>{p.nombre_completo}</td>
                    <td className="px-4 py-2 text-center">{calculateAge(p.fecha_nacimiento)}</td>
                    <td className="px-4 py-2 text-center uppercase">{p.sexo}</td>
                    <td className="px-4 py-2 uppercase truncate max-w-[150px]" title={p.sector}>{p.sector}</td>
                    <td className="px-4 py-2">{p.telefono || '-'}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]" title={p.direccion}>{p.direccion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                Visualizando los primeros 500 resultados por rendimiento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
