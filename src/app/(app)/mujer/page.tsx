import { Suspense } from "react";
import { getMujerDashboardData, getEmbarazadasData } from "@/actions/mujerActions";
import { getCurrentUser, UserProfile } from "@/lib/currentUser";
import MujerClientView from "./MujerClientView";
import SkeletonDashboard from "@/components/SkeletonDashboard";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

async function MujerDataWrapper({ user }: { user: UserProfile }) {
  const data = await getMujerDashboardData();
  const embarazadasData = await getEmbarazadasData();
  return <MujerClientView initialData={data.data || []} initialEmbarazadasData={embarazadasData.data || []} user={user} />;
}

export default async function MujerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("mujer");
  if (!hasAccess) redirect("/dashboard");

  return (
    <Suspense fallback={<SkeletonDashboard title="Programa de la Mujer" subtitle="Gestión clínica y seguimientos ginecológicos..." />}>
      <MujerDataWrapper user={user} />
    </Suspense>
  );
}
