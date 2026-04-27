import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/actions/userActions";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
