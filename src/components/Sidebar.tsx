"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Target,
  LogOut,
  Activity,
  Shield
} from "lucide-react";
import { logoutAction } from "@/actions/authActions";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard Central", href: "/dashboard", icon: LayoutDashboard },
  { name: "Población y Directorio", href: "/directorio", icon: Users },
  { name: "Programa Adulto Mayor", href: "/empam", icon: Activity },
  { name: "Programa Respiratorio", href: "/respiratorio", icon: Stethoscope },
  { name: "Oportunidad de Atención", href: "/oportunidad", icon: Target },
];

const adminNavigation = [
  { name: "Administración de Accesos", href: "/admin/usuarios", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-6">
        <Activity className="h-6 w-6 text-blue-600 mr-2" />
        <span className="text-lg font-bold text-slate-800">GIA Health</span>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Gestión Clínica
          </p>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-md px-2 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}

          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mt-8 mb-4">
            Ajustes Sistema
          </p>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center rounded-md px-2 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center mb-4">
          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
            PF
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-700">Profesional</p>
            <p className="text-xs font-medium text-slate-500">Clínico</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400 group-hover:text-red-500" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
