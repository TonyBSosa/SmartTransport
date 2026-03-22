import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarCheck, ClipboardList, BarChart3, Database,
  ChevronLeft, ChevronRight, Search, Bus, LogOut, Users, Settings, Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import DataSourceFilter from "@/components/DataSourceFilter";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "empleado", "conductor"], color: "text-blue-600" },
  { label: "Reservas", path: "/reservas", icon: CalendarCheck, roles: ["admin", "empleado", "conductor"], color: "text-green-600" },
  { label: "Asistencia", path: "/asistencia", icon: ClipboardList, roles: ["admin", "empleado", "conductor"], color: "text-purple-600" },
  { label: "Analítica", path: "/analitica", icon: BarChart3, roles: ["admin", "empleado", "conductor"], color: "text-orange-600" },
  { label: "Procesamiento", path: "/procesamiento", icon: Database, roles: ["admin", "empleado", "conductor"], color: "text-indigo-600" },
  { label: "Importar datos", path: "/importar-datos", icon: Upload, roles: ["admin"], color: "text-teal-600" },
  { label: "Gestión de usuarios", path: "/users", icon: Users, roles: ["admin"], color: "text-red-600" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user, role } = useAuth();
  const currentTitle = navItems.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-xl flex flex-col transition-all duration-300 ease-out z-30 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Header with gradient */}
        <div className="flex items-center gap-3 px-6 h-16 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg">
          <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Bus className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-display font-bold text-sm tracking-tight">SmartTransport</span>
              <div className="text-xs opacity-90 font-medium">Sistema de Transporte</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(role ?? ''))
            .map((item) => {
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ease-out ${
                    active
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border-l-4 border-blue-600"
                      : "text-gray-700 hover:bg-blue-50/50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className={`h-5 w-5 shrink-0 transition-all ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {active && !collapsed && (
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-blue-50 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </aside>

      <div className={`flex-1 transition-all duration-300 ease-out ${collapsed ? "ml-16" : "ml-64"}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 font-medium">SmartTransport</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-bold">{currentTitle}</span>
            </div>
            {role === 'admin' && (
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 ml-2">
                <Settings className="w-3 h-3 mr-1.5" />
                Admin
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-6">
            <DataSourceFilter />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                className="pl-10 h-10 text-sm bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg transition-all"
              />
            </div>
            <div className="flex items-center gap-3 text-sm border-l border-gray-200 pl-6">
              <div className="text-right">
                <div className="text-gray-900 font-semibold">{user?.email?.split('@')[0]}</div>
                <div className="text-gray-500 text-xs capitalize font-medium">{role}</div>
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {user?.email?.[0]?.toUpperCase()}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="p-8 min-h-[calc(100vh-4rem)]">
          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

