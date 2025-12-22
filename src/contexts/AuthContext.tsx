
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, companyName) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        // This is the core logic. If Supabase client's token refresh fails,
        // it will trigger this event with a null session.
        if (_event === 'TOKEN_REFRESHED' && !session) {
            // The refresh token is invalid. Force a full sign-out.
            console.error("Invalid refresh token. Forcing user logout.");
            supabase.auth.signOut();
        } 
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Ошибка входа: ${error.message}`);
  };

  const signUp = async (email, password, companyName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName } },
    });
    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Пользователь с таким email уже существует.');
      }
      throw new Error(`Ошибка регистрации: ${error.message}`);
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Ошибка выхода: ${error.message}`);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  // Render children only when loading is complete
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
