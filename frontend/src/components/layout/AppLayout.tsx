import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="pt-[calc(4px+3.5rem)] md:ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
