import { getRespiratorioData } from "@/actions/respiratorioActions";
import { getCurrentUser } from "@/actions/userActions";
import RespiratorioClientView from "./RespiratorioClientView";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function RespiratorioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getRespiratorioData();

  return <RespiratorioClientView data={data} user={user} />;
}
