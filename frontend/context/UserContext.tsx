import React, { createContext, useContext, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

type Role = 'empleado' | 'conductor' | null;

interface UserContextType {
  role: Role;
  telefono: string;
  nombre: string;
  isAuthenticated: boolean;
  setRole: (role: Role) => void;
  setTelefono: (tel: string) => void;
  setNombre: (name: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  role: null,
  telefono: '',
  nombre: '',
  isAuthenticated: false,
  setRole: () => {},
  setTelefono: () => {},
  setNombre: () => {},
  login: async () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (email: string, password: string) => {
    if (email.trim() === '' || password.trim() === '') {
      throw new Error('Correo y contraseña son requeridos');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setIsAuthenticated(true);
      setNombre(userCredential.user.displayName || email.split('@')[0]);
      setTelefono('');
    } catch (error: any) {
      console.error('Firebase auth error:', error);
      const errorCode = error.code;
      
      if (errorCode === 'auth/user-not-found') {
        throw new Error('Usuario no encontrado');
      } else if (errorCode === 'auth/wrong-password') {
        throw new Error('Contraseña incorrecta');
      } else if (errorCode === 'auth/invalid-email') {
        throw new Error('Correo inválido');
      } else {
        throw new Error(error.message || 'Error al autenticar');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setRole(null);
      setNombre('');
      setTelefono('');
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        role,
        telefono,
        nombre,
        isAuthenticated,
        setRole,
        setTelefono,
        setNombre,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
