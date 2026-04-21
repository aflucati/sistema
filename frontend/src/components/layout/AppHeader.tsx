import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

const MagaluLogo = () => (
  <svg viewBox="0 0 1026 305" className="h-6 w-auto">
    <defs>
      <linearGradient id="magalu-grad" y1="284" x2="1026" y2="284" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fbe53b" />
        <stop offset=".17" stopColor="#ff4f01" />
        <stop offset=".35" stopColor="#ff14b3" />
        <stop offset=".55" stopColor="#8000ff" />
        <stop offset=".8" stopColor="#00c1ff" />
        <stop offset="1" stopColor="#17f036" />
      </linearGradient>
    </defs>
    <rect fill="url(#magalu-grad)" y="264" width="1026" height="40" rx="8" />
    <text x="100" y="220" fill="white" fontSize="200" fontWeight="700" fontFamily="Inter, sans-serif">magalog</text>
  </svg>
);

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  return (
    <>
      <div className="magalu-gradient-bar" />
      <header
        className="fixed top-1 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
        style={{ backgroundColor: "hsl(var(--header-bg))" }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-primary-foreground hover:bg-primary-foreground/10"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "hsl(var(--header-foreground))" }}>
            magalog
          </span>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Prazos
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              0
            </span>
          </Button>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            U
          </div>
        </div>
      </header>
    </>
  );
}
