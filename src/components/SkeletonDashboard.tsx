import { Wind, Download, Plus, Filter, Search } from "lucide-react";

interface SkeletonDashboardProps {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export default function SkeletonDashboard({ 
  title = "Panel de Gestión", 
  subtitle = "Cargando datos del módulo...",
  showHeader = true
}: SkeletonDashboardProps) {
  return (
    <div className="animate-pulse">
      {/* HEADER SIMULADO */}
      {showHeader && (
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-400 mr-4">
            <Wind size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-slate-500">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Boton Analisis */}
          <div className="h-10 w-44 bg-slate-200 rounded-xl"></div>
          {/* Boton Exportar */}
          <div className="h-10 w-40 bg-slate-200 rounded-xl hidden sm:block"></div>
          {/* Boton Registrar (con color sólido para dar sensación de interactividad inmediata) */}
          <div className="flex items-center justify-center space-x-2 bg-blue-500/50 text-white px-6 py-2.5 rounded-xl font-bold h-10 w-32">
            <Plus size={18} />
            <span className="text-sm">Registrar</span>
          </div>
        </div>
      )}

      {/* FILTROS SIMULADOS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <div className="w-full h-10 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="md:col-span-3">
            <div className="w-full h-10 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="md:col-span-3">
            <div className="w-full h-10 bg-slate-100 rounded-xl"></div>
          </div>
          <div className="md:col-span-2">
            <div className="w-full h-10 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-300">
              <Filter size={14} className="mr-1" />
              <span className="text-xs font-black">FILTROS</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA SIMULADA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-48 bg-slate-200 rounded"></div>
            <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Fila 1 */}
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <div className="flex space-x-4 w-1/3">
              <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-3 w-24 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="h-4 w-24 bg-slate-200 rounded hidden md:block"></div>
            <div className="h-6 w-20 bg-emerald-100 rounded-full"></div>
          </div>
          {/* Fila 2 */}
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <div className="flex space-x-4 w-1/3">
              <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded"></div>
                <div className="h-3 w-20 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="h-4 w-24 bg-slate-200 rounded hidden md:block"></div>
            <div className="h-6 w-20 bg-blue-100 rounded-full"></div>
          </div>
          {/* Fila 3 */}
          <div className="flex items-center justify-between py-2">
            <div className="flex space-x-4 w-1/3">
              <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded"></div>
                <div className="h-3 w-28 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="h-4 w-24 bg-slate-200 rounded hidden md:block"></div>
            <div className="h-6 w-20 bg-amber-100 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
