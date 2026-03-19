import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import { DataSourceFilterProvider } from "@/context/DataSourceFilterContext";
import Dashboard from "@/pages/Dashboard";
import Reservas from "@/pages/Reservas";
import Asistencia from "@/pages/Asistencia";
import Analitica from "@/pages/Analitica";
import Procesamiento from "@/pages/Procesamiento";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DataSourceFilterProvider>
        <BrowserRouter>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reservas" element={<Reservas />} />
              <Route path="/asistencia" element={<Asistencia />} />
              <Route path="/analitica" element={<Analitica />} />
              <Route path="/procesamiento" element={<Procesamiento />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </BrowserRouter>
      </DataSourceFilterProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
