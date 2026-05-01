import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Kanban,
  Stethoscope,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/profissionais", label: "Profissionais", icon: Stethoscope },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#09090f] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 bg-[#0e0e14] border-r border-zinc-800/60 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/60">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-zinc-100 text-sm tracking-tight">Clínica Odonto</span>
            <p className="text-[11px] text-zinc-500">Painel de Gestão</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                      : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 border border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-blue-400" : "text-zinc-600")} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-800/60">
          <p className="text-[11px] text-zinc-700 text-center">Sistema de Agendamentos v1.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0e0e14] border-b border-zinc-800/60 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-zinc-400">
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-zinc-100">Clínica Odonto</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
