"use client";

import { useState } from "react";
import { initDatabase } from "@/actions/dbInit";
import { Database, CheckCircle, XCircle } from "lucide-react";

export default function DbSetupClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const handleInit = async () => {
    setLoading(true);
    setResult(null);
    
    const response = await initDatabase();
    setResult(response);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-4">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inicialización de Base de Datos</h1>
            <p className="text-slate-500">Fabricación del Esquema Clínico GIA en PostgreSQL</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-2">Tablas a crear (si no existen):</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
            <li><code className="bg-slate-200 px-1 rounded">gia_usuarios</code>: Profesionales clínicos.</li>
            <li><code className="bg-slate-200 px-1 rounded">gia_pacientes</code>: Padrón maestro territorial.</li>
            <li><code className="bg-slate-200 px-1 rounded">gia_empam</code>: Registros del Programa Adulto Mayor.</li>
            <li><code className="bg-slate-200 px-1 rounded">gia_respiratorio</code>: Fichas del Programa ERA/IRA.</li>
          </ul>
        </div>

        <button
          onClick={handleInit}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 cursor-pointer"
        >
          {loading ? "Ejecutando Scripts SQL..." : "Ejecutar Inyección Estructural GIA"}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg flex items-start ${result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {result.success ? <CheckCircle className="mr-3 h-5 w-5 shrink-0" /> : <XCircle className="mr-3 h-5 w-5 shrink-0" />}
            <div>
              <p className="font-medium">{result.success ? '¡Éxito!' : 'Error de Configuración'}</p>
              <p className="text-sm mt-1">{result.message || result.error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
