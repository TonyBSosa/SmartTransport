import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { normalizeUserRole, UserRole } from '@/lib/userRoles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserRecord {
  id: string;
  uid: string;
  email: string;
  rol: UserRole | null;
  legacyRole: string;
  hasLegacyShape: boolean;
}

function buildUserDocument(params: { uid: string; email: string; rol: UserRole }) {
  return {
    uid: params.uid,
    email: params.email.trim(),
    rol: params.rol,
  };
}

export default function Users() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('empleado');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const usuarioActual = user?.email || 'usuario';

  const loadUsers = async () => {
    setLoading(true);

    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const loaded: UserRecord[] = querySnapshot.docs.map((snapshot) => {
        const data = snapshot.data();
        const normalizedRole = normalizeUserRole(data.rol ?? data.role);

        return {
          id: snapshot.id,
          uid: String(data.uid ?? snapshot.id),
          email: String(data.email ?? ''),
          rol: normalizedRole,
          legacyRole: String(data.role ?? ''),
          hasLegacyShape: snapshot.id !== String(data.uid ?? snapshot.id) || !data.rol || !!data.role,
        };
      });

      setUsers(loaded);
    } catch (err) {
      console.error('[Users] error cargando usuarios:', err);
      setError('No se pudieron cargar los usuarios desde Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void loadUsers();
  }, [isAdmin]);

  const resetForm = () => {
    setUid('');
    setEmail('');
    setPassword('');
    setSelectedRole('empleado');
  };

  const persistUserDocument = async (params: { uid: string; email: string; rol: UserRole }) => {
    console.log('[Users] antes de guardar en Firestore users/{uid}:', params);

    await setDoc(doc(db, 'users', params.uid), buildUserDocument(params), { merge: true });

    console.log('[Users] Firestore guardado correctamente en users/{uid}:', params.uid);
  };

  const createUserInAuth = async (params: { email: string; password: string }) => {
    console.log('[Users] antes de crear usuario en Auth:', { email: params.email.trim() });

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email.trim(),
          password: params.password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    console.log('[Users] respuesta de Auth signUp:', data);

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error creando usuario en Auth.');
    }

    if (!data.localId) {
      throw new Error('Auth no devolvió un uid válido.');
    }

    console.log('[Users] usuario creado en Auth con uid:', data.localId);
    return String(data.localId);
  };

  const handleCreateOrUpdate = async () => {
    const normalizedRole = normalizeUserRole(selectedRole);

    if (!normalizedRole) {
      setError('El rol debe ser admin, empleado o conductor.');
      return;
    }

    const trimmedUid = uid.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const isUpdateMode = !!trimmedUid && !trimmedPassword;
    const isCreateMode = !!trimmedEmail && !!trimmedPassword;

    if (!isUpdateMode && !isCreateMode) {
      setError(
        'Para crear un usuario ingresa email, contraseña y rol. Para actualizar rol ingresa uid y rol.'
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isUpdateMode) {
        const existingUser = users.find((item) => item.uid === trimmedUid || item.id === trimmedUid);
        const resolvedEmail = trimmedEmail || existingUser?.email || '';

        await persistUserDocument({
          uid: trimmedUid,
          email: resolvedEmail,
          rol: normalizedRole,
        });

        setSuccessMessage(`Rol actualizado correctamente en users/${trimmedUid}.`);
      } else {
        const newUid = await createUserInAuth({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        try {
          await persistUserDocument({
            uid: newUid,
            email: trimmedEmail,
            rol: normalizedRole,
          });
          setSuccessMessage(`Usuario creado correctamente. UID: ${newUid}`);
        } catch (firestoreError: unknown) {
          console.error('[Users] Auth creó el usuario pero Firestore falló:', {
            uid: newUid,
            email: trimmedEmail,
            error: firestoreError,
          });

          throw new Error(
            `El usuario se creó en Auth (uid: ${newUid}) pero falló guardar users/${newUid} en Firestore. Corrige esto antes de usar la app móvil.`
          );
        }
      }

      await loadUsers();
      resetForm();
    } catch (createError: unknown) {
      console.error('[Users] error creando/actualizando usuario:', createError);
      setError(
        createError instanceof Error
          ? createError.message
          : 'Error creando o actualizando usuario.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este documento de Firestore?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      await loadUsers();
      setSuccessMessage(`Documento users/${id} eliminado de Firestore.`);
    } catch (deleteError) {
      console.error('[Users] error borrando usuario:', deleteError);
      setError('No se pudo eliminar el documento del usuario en Firestore.');
    }
  };

  const filteredUsers = useMemo(() => users.filter((item) => item.uid !== user?.uid), [users, user]);
  const malformedUsers = useMemo(
    () => filteredUsers.filter((item) => item.hasLegacyShape),
    [filteredUsers]
  );

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
          <CardTitle>Crear usuario o actualizar rol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Crea usuario nuevo con email + contraseña + rol. Para actualizar solo el rol, usa uid + rol.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="user-uid">UID existente</Label>
              <Input
                id="user-uid"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                placeholder="uid del usuario para actualizar"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@tuempresa.com"
              />
            </div>
            <div>
              <Label htmlFor="user-password">Contraseña</Label>
              <Input
                id="user-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Completa solo al crear"
              />
            </div>
            <div>
              <Label htmlFor="role-select">Rol</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Selecciona rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="empleado">empleado</SelectItem>
                  <SelectItem value="conductor">conductor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateOrUpdate} disabled={saving || !selectedRole}>
                {saving ? 'Guardando...' : 'Guardar rol'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {malformedUsers.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Se detectaron {malformedUsers.length} documentos `users` con forma legacy o incompleta.
          Revisa el script `npm run migrate:users -- --dry-run`.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left">Doc ID</th>
              <th className="px-4 py-3 text-left">UID</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">rol</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando usuarios...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              filteredUsers.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.uid}</td>
                  <td className="px-4 py-3">{item.email || 'Sin email'}</td>
                  <td className="px-4 py-3">{item.rol || 'Sin rol válido'}</td>
                  <td className="px-4 py-3">
                    {item.hasLegacyShape ? 'Legacy / revisar' : 'OK'}
                    {item.legacyRole ? ` (role: ${item.legacyRole})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => handleDelete(item.id)}
                    >
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
