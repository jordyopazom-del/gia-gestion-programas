import { getEcicepDashboardData } from "@/actions/ecicepActions";
import EcicepClientView from "./EcicepClientView";
import { ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EcicepDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("ecicep");
  if (!hasAccess) redirect("/dashboard");

  const data = await getEcicepDashboardData();
  const canCreate = user.rol !== "ADMINISTRATIVO";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-4">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de Estratificación ECICEP</h1>
            <p className="text-slate-500">Cuidado Integral Centrado en la Persona y Gestión de la Multimorbilidad</p>
          </div>
        </div>
        {canCreate && (
          <div>
            <Link href="/ecicep/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium shadow-sm transition">
              <Plus size={18} className="mr-2" /> Nueva Estratificación
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <EcicepClientView data={data as any} user={user!} />
      </div>
    </div>
  );
}
