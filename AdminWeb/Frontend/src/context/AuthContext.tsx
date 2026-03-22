import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { normalizeUserRole, UserRole } from '@/lib/userRoles';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (uid: string, role: UserRole | null, email?: string) => Promise<void>;
  createOrUpdateUserRole: (uid: string, role: UserRole | null, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['admin@smarttransport.com', 'ale.xavala1980@gmail.com'];

function canAutoAssignAdmin(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email);
}

async function syncUserRecord(params: {
  uid: string;
  email?: string | null;
  role: UserRole;
}) {
  const { uid, email, role } = params;

  console.log('[AuthContext] guardando users/{uid}:', {
    uid,
    email: email ?? '',
    rol: role,
  });

  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      email: email ?? '',
      rol: role,
    },
    { merge: true }
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          let resolvedRole = normalizeUserRole(data.rol ?? data.role);

          if (!resolvedRole && canAutoAssignAdmin(currentUser.email)) {
            resolvedRole = 'admin';
          }

          if (resolvedRole) {
            await syncUserRecord({
              uid: currentUser.uid,
              email: currentUser.email,
              role: resolvedRole,
            });
          }

          setRole(resolvedRole);
        } else {
          const autoRole = canAutoAssignAdmin(currentUser.email) ? 'admin' : null;

          if (autoRole) {
            await syncUserRecord({
              uid: currentUser.uid,
              email: currentUser.email,
              role: autoRole,
            });
          }

          setRole(autoRole);
        }
      } catch (error) {
        console.error('[AuthContext] error cargando rol de usuario:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setUserRole = async (uid: string, newRole: UserRole | null, email?: string) => {
    if (!newRole) {
      throw new Error('El rol es obligatorio.');
    }

    await syncUserRecord({ uid, email, role: newRole });

    if (user?.uid === uid) {
      setRole(newRole);
    }
  };

  const createOrUpdateUserRole = async (uid: string, newRole: UserRole | null, email?: string) => {
    if (!newRole) {
      throw new Error('El rol es obligatorio.');
    }

    await syncUserRecord({ uid, email, role: newRole });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin: role === 'admin',
        loading,
        signIn,
        logout,
        setUserRole,
        createOrUpdateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
