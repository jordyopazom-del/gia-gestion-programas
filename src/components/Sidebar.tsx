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
import { UserProfile } from "@/actions/userActions";

const navigation = [
  { name: "Dashboard Central", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMINISTRADOR", "ADMINISTRATIVO", "REFERENTE", "CLINICO"] },
  { name: "Población y Directorio", href: "/directorio", icon: Users, roles: ["ADMINISTRADOR", "ADMINISTRATIVO", "REFERENTE", "CLINICO"] },
  { name: "Oportunidad de Atención", href: "/oportunidad", icon: Target, roles: ["ADMINISTRADOR", "REFERENTE"] },
  { name: "Programa Adulto Mayor", href: "/empam", icon: Activity, roles: ["ADMINISTRADOR", "REFERENTE", "CLINICO"] },
  { name: "Programa Respiratorio", href: "/respiratorio", icon: Stethoscope, roles: ["ADMINISTRADOR", "REFERENTE", "CLINICO"] },
];

export default function Sidebar({ user }: { user: UserProfile }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  const filteredNav = navigation.filter(item => item.roles.includes(user.rol));

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white no-print">
      <div className="flex items-center mb-8 px-2 mt-6">
        <img src="/logo_cesfam.png" alt="Logo CESFAM" className="h-10 w-10 mr-3 object-contain" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-slate-800 leading-tight">GIA Belarmina</span>
          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Gestión Integral APS</span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Gestión Clínica
          </p>
          {filteredNav.map((item) => {
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

          {user.rol === "ADMINISTRADOR" && (
            <>
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mt-8 mb-4">
                Ajustes Sistema
              </p>
              <Link
                href="/admin/usuarios"
                className={`group flex items-center rounded-md px-2 py-2.5 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin/usuarios")
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Shield
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    pathname.startsWith("/admin/usuarios") ? "text-purple-600" : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
                Administración de Accesos
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center mb-4">
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            {user.nombre.substring(0, 2).toUpperCase()}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-bold text-slate-700 truncate" title={user.nombre}>{user.nombre}</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{user.rol}</p>
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
