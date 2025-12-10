
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Исправленный путь
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, companyName) => Promise<void>; // Add companyName here
  signOut: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (_event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in user
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) throw new Error(`Ошибка входа: ${error.message}`);
  };

  // =================================================================
  // THIS IS THE CORRECTED SIGN UP FUNCTION
  // =================================================================
  const signUp = async (email, password, companyName) => {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          company_name: companyName, // This line sends the company name to Supabase
        }
      }
    });

    if (error) {
      // Provide a more user-friendly error message
      if (error.message.includes('User already registered')) {
        throw new Error('Пользователь с таким email уже существует.');
      }
      throw new Error(`Ошибка регистрации: ${error.message}`);
    }
    
    // Although Supabase sends a confirmation email, for this app, we might
    // not require it, but the user is created. The trigger will handle the company creation.
    return data;
  };
  // =================================================================

  // Sign out user
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

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
