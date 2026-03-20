import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Role = 'admin' | 'empleado' | 'conductor';
interface UserRecord { id: string; email?: string; role?: Role | null; }

export default function Users() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('empleado');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const usuarioActual = user?.email || 'usuario';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const loaded: UserRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loaded.push({ id: docSnap.id, email: data.email, role: data.role as Role | null });
      });
      setUsers(loaded);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  const handleCreateOrUpdate = async () => {
    if (!email || !password || !selectedRole) {
      setError('Email, contraseña y rol son obligatorios');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = data.error?.message || 'Error creando usuario';
        throw new Error(message);
      }

      const newUid = data.localId;

      await setDoc(doc(db, 'users', newUid), { email, role: selectedRole }, { merge: true });

      await loadUsers();

      setUid(newUid);
      setEmail('');
      setPassword('');
      setSelectedRole('empleado');
    } catch (e: any) {
      console.error('Error creando/actualizando usuario:', e);
      setError(e.message || 'Error creando usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      await loadUsers();
    } catch (error) {
      console.error('Error borrando usuario:', error);
    }
  };

  const filteredUsers = useMemo(() => users.filter((u) => u.id !== user?.uid), [users, user]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Acceso denegado</h1>
        <p>Solo el administrador puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Gestión de Usuarios</h1>
      <p className="text-sm text-muted-foreground">Conectado como: {usuarioActual}</p>
      <Card>
        <CardHeader>
          <CardTitle>Crear / actualizar rol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="user-uid">UID</Label>
              <Input id="user-uid" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="uid del usuario" />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@tuempresa.com" />
            </div>
            <div>
              <Label htmlFor="user-password">Contraseña</Label>
              <Input id="user-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="********" />
            </div>
            <div>
              <Label htmlFor="role-select">Rol</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as Role)}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="empleado">Empleado</SelectItem>
                  <SelectItem value="conductor">Conductor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateOrUpdate} disabled={saving || !uid || !selectedRole}>
                {saving ? 'Guardando...' : 'Guardar rol'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Cargando usuarios...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No hay usuarios registrados.</td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3">{u.email || 'Sin email'}</td>
                  <td className="px-4 py-3">{u.role || 'Sin rol'}</td>
                  <td className="px-4 py-3">
                    <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={() => handleDelete(u.id)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
