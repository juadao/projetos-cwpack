'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'Dono' | 'Admin' | 'Representante';

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  role: UserRole;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// UUID válido para o banco aceitar sem erros nas tabelas
const VALID_UUID = '00000000-0000-0000-0000-000000000001';

const MOCK_PROFILE: Profile = {
  id: VALID_UUID,
  user_id: VALID_UUID,
  email: 'admin@cwpack.com',
  username: 'admin',
  name: 'Administrador (Modo Aberto)',
  role: 'Dono',
};

const MOCK_USER = {
  id: VALID_UUID,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const MOCK_SESSION = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: MOCK_USER,
} as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session] = useState<Session | null>(MOCK_SESSION);
  const [user] = useState<User | null>(MOCK_USER);
  const [profile] = useState<Profile | null>(MOCK_PROFILE);
  const [loading] = useState(false);

  const signIn = async () => ({ error: null });
  const signOut = async () => {};

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}