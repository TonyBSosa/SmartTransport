import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  isPerfilCompleto,
  obtenerPerfil,
  obtenerUserRecord,
  UserProfile,
  UserRecord,
  UserRole,
} from '../lib/firestore';

interface UserContextType {
  authUser: User | null;
  userRecord: UserRecord | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  hasCompleteProfile: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  setAuthError: (message: string) => void;
}

const UserContext = createContext<UserContextType>({
  authUser: null,
  userRecord: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  isBootstrapping: true,
  hasCompleteProfile: false,
  authError: '',
  login: async () => {},
  logout: async () => {},
  refreshUserData: async () => {},
  setAuthError: () => {},
});

function mapAuthError(error: unknown) {
  const typedError = error as { code?: string; message?: string };

  switch (typedError?.code) {
    case 'auth/user-not-found':
      return 'Usuario no encontrado.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'Correo inválido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta nuevamente en unos minutos.';
    default:
      return typedError?.message || 'No se pudo iniciar sesión.';
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const clearSessionData = () => {
    setUserRecord(null);
    setProfile(null);
    setAuthError('');
  };

  const loadUserData = async (firebaseUser: User) => {
    console.log('[UserContext] cargando datos de usuario:', firebaseUser.uid);

    const foundUserRecord = await obtenerUserRecord(firebaseUser.uid);

    if (!foundUserRecord) {
      setUserRecord(null);
      setProfile(null);
      setAuthError('No se encontró el documento del usuario en Firestore.');
      console.warn('[UserContext] users/{uid} no existe:', firebaseUser.uid);
      return;
    }

    if (!foundUserRecord.rol) {
      setUserRecord(foundUserRecord);
      setProfile(null);
      setAuthError('El usuario no tiene un rol asignado.');
      console.warn('[UserContext] users/{uid} sin rol:', firebaseUser.uid);
      return;
    }

    const foundProfile =
      foundUserRecord.rol === 'empleado' ? await obtenerPerfil(firebaseUser.uid) : null;

    setUserRecord(foundUserRecord);
    setProfile(foundProfile);
    setAuthError('');
    console.log('[UserContext] datos cargados:', {
      uid: firebaseUser.uid,
      rol: foundUserRecord.rol,
      perfilCompleto: isPerfilCompleto(foundProfile),
    });
  };

  const refreshUserData = async () => {
    if (!auth.currentUser) {
      clearSessionData();
      return;
    }

    try {
      await loadUserData(auth.currentUser);
    } catch (error) {
      console.error('[UserContext] error recargando datos:', error);
      setAuthError('No se pudieron cargar los datos del usuario.');
      setUserRecord(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[UserContext] cambio de sesión:', firebaseUser?.uid ?? null);
      setAuthUser(firebaseUser);
      setIsBootstrapping(true);

      if (!firebaseUser) {
        clearSessionData();
        setIsBootstrapping(false);
        return;
      }

      try {
        await loadUserData(firebaseUser);
      } catch (error) {
        console.error('[UserContext] error al inicializar sesión:', error);
        setAuthError('No se pudieron cargar los datos del usuario.');
        setUserRecord(null);
        setProfile(null);
      } finally {
        setIsBootstrapping(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Correo y contraseña son requeridos.');
    }

    try {
      setAuthError('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error('[UserContext] error de autenticación:', error);
      throw new Error(mapAuthError(error));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearSessionData();
      setAuthUser(null);
    } catch (error) {
      console.error('[UserContext] error al cerrar sesión:', error);
      setAuthError('No se pudo cerrar la sesión.');
    }
  };

  const value = useMemo(
    () => ({
      authUser,
      userRecord,
      profile,
      role: userRecord?.rol ?? null,
      isAuthenticated: !!authUser,
      isBootstrapping,
      hasCompleteProfile: isPerfilCompleto(profile),
      authError,
      login,
      logout,
      refreshUserData,
      setAuthError,
    }),
    [authError, authUser, isBootstrapping, profile, userRecord]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
