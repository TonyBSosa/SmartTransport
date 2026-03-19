import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, CalendarCheck, ClipboardList, BarChart3, Database,
  ChevronLeft, ChevronRight, Search, Bus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import DataSourceFilter from "@/components/DataSourceFilter";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Reservas", path: "/reservas", icon: CalendarCheck },
  { label: "Asistencia", path: "/asistencia", icon: ClipboardList },
  { label: "Analítica", path: "/analitica", icon: BarChart3 },
  { label: "Procesamiento", path: "/procesamiento", icon: Database },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const currentTitle = navItems.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed top-0 left-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 z-30 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
          <Bus className="h-6 w-6 text-sidebar-primary shrink-0" />
          {!collapsed && <span className="font-display font-semibold text-sm tracking-tight">SmartTransport</span>}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className={`flex-1 transition-all duration-200 ${collapsed ? "ml-16" : "ml-60"}`}>
        <header className="sticky top-0 z-20 h-14 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>SmartTransport</span>
            <span>/</span>
            <span className="text-foreground font-medium">{currentTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <DataSourceFilter />
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar empleado o ruta..." className="pl-9 h-9 text-sm bg-background" />
            </div>
          </div>
        </header>

        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

