import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-60 -right-60 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-60 -left-60 w-96 h-96 bg-gradient-to-br from-indigo-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo/Brand section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-lg mb-6">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            SmartTransport
          </h1>
          <p className="text-gray-600 text-lg font-medium">Sistema Inteligente de Transporte</p>
        </div>

        <Card className="bg-white border border-gray-200 rounded-3xl shadow-xl">
          <CardHeader className="space-y-1 pb-8 pt-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-center text-gray-900 font-bold">Acceso Seguro</CardTitle>
            </div>
            <CardDescription className="text-center text-gray-600 text-base">
              Ingresa tus credenciales para acceder al panel
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-800 font-semibold">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 transition-all duration-200 rounded-lg text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-800 font-semibold">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as any)}
                  required
                  className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 transition-all duration-200 rounded-lg text-base"
                />
              </div>
              {error && (
                <Alert className="border border-red-300 bg-red-50 rounded-lg">
                  <AlertDescription className="text-red-700 font-semibold">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg text-base"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Iniciar sesión
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8 font-medium">
          SmartTransport © 2024 • Sistema de Transporte Empresarial
        </p>
      </div>
    </div>
  );
}