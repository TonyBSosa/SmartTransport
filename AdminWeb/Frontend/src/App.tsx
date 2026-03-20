import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { DataSourceFilterProvider } from "@/context/DataSourceFilterContext";
import Dashboard from "@/pages/Dashboard";
import Reservas from "@/pages/Reservas";
import Asistencia from "@/pages/Asistencia";
import Analitica from "@/pages/Analitica";
import Procesamiento from "@/pages/Procesamiento";
import Users from "@/pages/Users";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DataSourceFilterProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "empleado", "conductor"]}>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/reservas"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "empleado", "conductor"]}>
                              <Reservas />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/asistencia"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "empleado", "conductor"]}>
                              <Asistencia />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/analitica"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "empleado", "conductor"]}>
                              <Analitica />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/procesamiento"
                          element={
                            <ProtectedRoute allowedRoles={["admin", "empleado", "conductor"]}>
                              <Procesamiento />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/users"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <Users />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </DataSourceFilterProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
