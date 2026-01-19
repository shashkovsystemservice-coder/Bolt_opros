
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, companyName) => Promise<any>;
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
    // This single, robust handler processes any authentication event.
    const processAuth = async (session: Session | null) => {
      let userToSet = session?.user ?? null;

      // General Healing Logic for ANY user.
      if (userToSet && userToSet.user_metadata?.company_name && !userToSet.user_metadata?.company_id) {
        console.log(`Unhealed user detected: ${userToSet.email}. Attempting to heal.`);
        
        const { data: company, error: findError } = await supabase
          .from('companies')
          .select('id')
          .eq('name', userToSet.user_metadata.company_name)
          .maybeSingle();

        if (findError) {
            console.error("Error fetching company during healing:", findError);
        } else if (company) {
          console.log(`Found company ID: ${company.id} for company "${userToSet.user_metadata.company_name}". Updating user metadata.`);
          const { data: updated, error: updateError } = await supabase.auth.updateUser({
            data: { ...userToSet.user_metadata, company_id: company.id }
          });

          if (updated.user && !updateError) {
            // Use the user object returned from the update operation to avoid race conditions.
            userToSet = updated.user;
            console.log("User healed successfully.");
          } else if (updateError) {
            console.error("Error updating user during healing:", updateError);
          }
        } else {
          // This is the key log: the company name in metadata does not exist in the companies table.
          console.warn(`Could not find company named "${userToSet.user_metadata.company_name}" to heal user. The name might be incorrect in the user's metadata.`);
        }
      }

      // Set the final state for user and session, and, most importantly, stop loading.
      setUser(userToSet);
      setSession(session);
      setLoading(false);
    };

    // 1. Handle initial session on page load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      processAuth(session);
    });

    // 2. Listen for subsequent auth state changes (sign in, sign out).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Set loading to true on auth change to show loader while processing.
        setLoading(true);
        processAuth(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Run this entire setup only once on mount.

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Ошибка входа: ${error.message}`);
  }, []);

  const signUp = useCallback(async (email, password, companyName) => {
    if (!companyName) {
      throw new Error('Название компании обязательно для регистрации.');
    }

    let { data: existingCompany, error: findError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .maybeSingle();

    if (findError) throw new Error(`Ошибка при поиске компании: ${findError.message}`);

    let companyId = existingCompany?.id;

    // If company does not exist, create it.
    if (!companyId) {
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({ name: companyName, email: email })
        .select('id')
        .single();
      
      if (createError) throw new Error(`Ошибка при создании новой компании: ${createError.message}`);
      companyId = newCompany.id;
    }

    // Sign up user with the correct company_id from the start.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
          company_id: companyId,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        throw new Error('Пользователь с таким email уже существует.');
      }
      throw new Error(`Ошибка регистрации: ${signUpError.message}`);
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Ошибка выхода: ${error.message}`);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }), [user, session, loading, signIn, signUp, signOut]);

  // Render children only when not loading. This prevents rendering with incomplete user data.
  // The DashboardLayout will show a loading screen controlled by the `loading` state.
  return (
    <AuthContext.Provider value={value}>
      {children}
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
