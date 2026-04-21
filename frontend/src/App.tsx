import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import GestaoPrazosPage from "./pages/GestaoPrazosPage";
import SalvarPadraoPage from "./pages/SalvarPadraoPage";
import ImportarAjustePage from "./pages/ImportarAjustePage";
import ConsultaPage from "./pages/ConsultaPage";
import AjudaPage from "./pages/AjudaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/gestao-prazos" element={<GestaoPrazosPage />} />
            <Route path="/salvar-padrao" element={<SalvarPadraoPage />} />
            <Route path="/importar-ajuste" element={<ImportarAjustePage />} />
            <Route path="/consulta" element={<ConsultaPage />} />
            <Route path="/ajuda" element={<AjudaPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
