import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type UserRole = 'admin' | 'empleado' | 'conductor' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (uid: string, role: UserRole) => Promise<void>;
  createOrUpdateUserRole: (uid: string, role: UserRole, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          let resolvedRole = (data.role as UserRole) ?? null;
          const adminEmails = [
            'admin@smarttransport.com', 
            'ale.xavala1980@gmail.com'
          ];
          
          if (!resolvedRole && currentUser.email && adminEmails.includes(currentUser.email)) {
            resolvedRole = 'admin';
            await setDoc(doc(db, 'users', currentUser.uid), { role: resolvedRole, email: currentUser.email }, { merge: true });
          }

          setRole(resolvedRole);
        } else {
          // Auto-assign admin role to emails if no role set
          const adminEmails = ['admin@smarttransport.com', 'ale.xavala1980@gmail.com'];
          const autoRole: UserRole = currentUser.email && adminEmails.includes(currentUser.email) ? 'admin' : null;
          if (autoRole) {
            await setDoc(doc(db, 'users', currentUser.uid), { role: autoRole, email: currentUser.email }, { merge: true });
          }
          setRole(autoRole);
        }
      } catch (error) {
        console.error('Error cargando role de usuario:', error);
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

  const setUserRole = async (uid: string, newRole: UserRole) => {
    await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
    if (user?.uid === uid) {
      setRole(newRole);
    }
  };

  const createOrUpdateUserRole = async (uid: string, newRole: UserRole, email?: string) => {
    await setDoc(doc(db, 'users', uid), { role: newRole, email }, { merge: true });
  };

  const value = {
    user,
    role,
    isAdmin: role === 'admin',
    loading,
    signIn,
    logout,
    setUserRole,
    createOrUpdateUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};