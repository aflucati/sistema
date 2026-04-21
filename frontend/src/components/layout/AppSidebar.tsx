import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Clock,
  Save,
  Upload,
  Search,
  HelpCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/gestao-prazos", icon: Clock, label: "Gestão de Prazos" },
  { to: "/salvar-padrao", icon: Save, label: "Salvar Padrão" },
  { to: "/importar-ajuste", icon: Upload, label: "Importar Ajuste" },
  { to: "/consulta", icon: Search, label: "Consulta" },
  { to: "/ajuda", icon: HelpCircle, label: "Ajuda" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-[calc(4px+3.5rem)] left-0 bottom-0 z-40 bg-card border-r border-border transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } w-56 md:w-56`}
      >
        <div className="flex items-center justify-between p-3 md:hidden">
          <span className="text-sm font-semibold text-foreground">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
