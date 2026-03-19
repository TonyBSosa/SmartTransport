import React, { createContext, useContext, useState } from 'react';

type Role = 'empleado' | 'conductor' | null;

interface UserContextType {
  role: Role;
  telefono: string;
  nombre: string;
  setRole: (role: Role) => void;
  setTelefono: (tel: string) => void;
  setNombre: (name: string) => void;
}

const UserContext = createContext<UserContextType>({
  role: null,
  telefono: '',
  nombre: '',
  setRole: () => {},
  setTelefono: () => {},
  setNombre: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');

  return (
    <UserContext.Provider value={{ role, telefono, nombre, setRole, setTelefono, setNombre }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
