import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

type UserRole = 'admin' | 'empleado' | 'conductor' | null;

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <p className="text-lg font-semibold">Acceso denegado</p>
          <p className="text-sm text-muted-foreground">Tu cuenta no tiene un rol asignado. Contacta a un administrador.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <p className="text-lg font-semibold">No estás autorizado</p>
          <p className="text-sm text-muted-foreground">Tu rol actual no permite acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}