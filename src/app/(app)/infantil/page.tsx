import { Suspense } from "react";
import { getInfantilDashboardData } from "@/actions/infantilActions";
import InfantilClientView from "./InfantilClientView";
import { Baby, Plus } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, UserProfile } from "@/actions/userActions";
import SkeletonDashboard from "@/components/SkeletonDashboard";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function InfantilDataWrapper({ user }: { user: UserProfile }) {
  const data = await getInfantilDashboardData();
  return <InfantilClientView data={data.data || []} user={user} />;
}

export default async function InfantilDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("infantil");
  if (!hasAccess) redirect("/dashboard");

  const canCreate = user.rol !== "ADMINISTRATIVO";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-pink-600 mr-4">
            <Baby size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tarjetero Programa Infantil</h1>
            <p className="text-slate-500">Gestión y control de la población infantil (0 a 9 años)</p>
          </div>
        </div>
        {canCreate && (
          <div>
            <Link href="/infantil/nuevo" className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-lg flex items-center font-medium shadow-sm transition">
              <Plus size={18} className="mr-2" /> Registrar Control
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <Suspense fallback={<SkeletonDashboard showHeader={false} />}>
          <InfantilDataWrapper user={user} />
        </Suspense>
      </div>
    </div>
  );
}
