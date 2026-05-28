import { getRespiratorioData } from "@/actions/respiratorioActions";
import { getCurrentUser } from "@/actions/userActions";
import RespiratorioClientView from "./RespiratorioClientView";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
// Refresh deploy: 2026-05-07

export default async function RespiratorioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("respiratorio");
  if (!hasAccess) redirect("/dashboard");

  const data = await getRespiratorioData();

  return <RespiratorioClientView data={data} user={user} />;
}
