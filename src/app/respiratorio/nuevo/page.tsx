import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import NuevoRespiratorioClient from "./NuevoRespiratorioClient";

export const dynamic = 'force-dynamic';

export default async function NuevoRespiratorioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NuevoRespiratorioClient user={user} />;
}
