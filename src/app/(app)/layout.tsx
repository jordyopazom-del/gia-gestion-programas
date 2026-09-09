import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { Toaster } from "react-hot-toast";

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
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          success: {
            style: {
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontWeight: '700',
              fontSize: '13px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            iconTheme: { primary: '#16a34a', secondary: '#f0fdf4' },
          },
          error: {
            style: {
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontWeight: '700',
              fontSize: '13px',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
          },
        }}
      />
    </div>
  );
}
