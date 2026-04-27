import { getEmpamDashboardData } from "@/actions/empamActions";
import EmpamClientView from "./EmpamClientView";
import { Activity, Plus } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/actions/userActions";

export default async function EmpamDashboardPage() {
  const data = await getEmpamDashboardData();
  const user = await getCurrentUser();

  const canCreate = user?.rol !== "ADMINISTRATIVO";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mr-4">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel Analítico EMPAM</h1>
            <p className="text-slate-500">Gestión Clínica del Programa Adulto Mayor</p>
          </div>
        </div>
        {canCreate && (
          <div>
            <Link href="/empam/nuevo" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium shadow-sm transition">
              <Plus size={18} className="mr-2" /> Nuevo Ingreso EMPAM
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <EmpamClientView data={data as any} user={user!} />
      </div>
    </div>
  );
}
