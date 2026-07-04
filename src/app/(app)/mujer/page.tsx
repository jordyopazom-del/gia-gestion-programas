import { getMujerDashboardData } from "@/actions/mujerActions";
import { getCurrentUser } from "@/lib/currentUser";
import MujerClientView from "./MujerClientView";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function MujerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = user.rol === "ADMINISTRADOR" || user.accesos?.includes("mujer");
  if (!hasAccess) redirect("/dashboard");

  const data = await getMujerDashboardData();

  return (
    <MujerClientView 
      initialData={data.data || []} 
      user={user} 
    />
  );
}
