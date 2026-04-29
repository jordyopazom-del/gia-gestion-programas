export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Dashboard Central</h1>
      <p className="text-slate-500 mb-8">Bienvenido a GIA Belarmina. Seleccione un módulo para comenzar.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder Card 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <span className="text-blue-600 font-bold text-xl">1</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Programa Adulto Mayor</h2>
          <p className="text-sm text-slate-500">Gestión de alertas y coberturas EMPAM.</p>
        </div>

        {/* Placeholder Card 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <span className="text-emerald-600 font-bold text-xl">2</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Programa Respiratorio</h2>
          <p className="text-sm text-slate-500">Seguimiento de ficha clínica ERA/IRA.</p>
        </div>

        {/* Placeholder Card 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <span className="text-purple-600 font-bold text-xl">3</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Oportunidad de Atención</h2>
          <p className="text-sm text-slate-500">Cruce inteligente con agenda diaria.</p>
        </div>
      </div>
    </div>
  );
}
