import { Suspense } from "react";
import { getRespiratorioData } from "@/actions/respiratorioActions";
import { getCurrentUser, UserProfile } from "@/lib/currentUser";
import RespiratorioClientView from "./RespiratorioClientView";
import SkeletonDashboard from "@/components/SkeletonDashboard";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
// Refresh deploy: 2026-05-07

async function RespiratorioDataWrapper({ user }: { user: UserProfile }) {
  const data = await getRespiratorioData();
  return <RespiratorioClientView data={data} user={user} />;
}

export default async function RespiratorioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("respiratorio");
  if (!hasAccess) redirect("/dashboard");

  return (
    <Suspense fallback={<SkeletonDashboard title="Panel Respiratorio" subtitle="Gestionando registros y atenciones respiratorias..." />}>
      <RespiratorioDataWrapper user={user} />
    </Suspense>
  );
}
