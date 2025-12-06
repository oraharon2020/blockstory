'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Business {
  id: string;
  name: string;
  logo_url?: string;
  role: 'owner' | 'admin' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  businesses: Business[];
  currentBusiness: Business | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentBusiness: (business: Business) => void;
  refreshBusinesses: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const SUPABASE_URL = 'https://gvpobzhluzmsdcgrytmj.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cG9iemhsdXptc2RjZ3J5dG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjY2ODEsImV4cCI6MjA4MDUwMjY4MX0.-Pj9GeSPXUl_b4XdW5lfTIjJTynI1VdfEP8-ZiNHu4M';

  // Load businesses for user using direct fetch
  const loadBusinesses = async (userId: string) => {
    try {
      console.log('📂 Loading businesses for user:', userId);
      
      // Get user_businesses with business details
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_businesses?user_id=eq.${userId}&select=role,business:businesses(id,name,logo_url)`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          }
        }
      );
      
      const data = await response.json();
      console.log('📂 User businesses data:', data);

      const userBusinesses: Business[] = (data || [])
        .filter((item: any) => item.business)
        .map((item: any) => ({
          id: item.business.id,
          name: item.business.name,
          logo_url: item.business.logo_url,
          role: item.role,
        }));

      console.log('📂 Parsed businesses:', userBusinesses);
      setBusinesses(userBusinesses);

      // Load saved business from localStorage or use first one
      const savedBusinessId = localStorage.getItem('currentBusinessId');
      const savedBusiness = userBusinesses.find(b => b.id === savedBusinessId);
      
      if (savedBusiness) {
        setCurrentBusinessState(savedBusiness);
      } else if (userBusinesses.length > 0) {
        setCurrentBusinessState(userBusinesses[0]);
        localStorage.setItem('currentBusinessId', userBusinesses[0].id);
      }

      return userBusinesses;
    } catch (error) {
      console.error('Error loading businesses:', error);
      return [];
    }
  };

  const refreshBusinesses = async () => {
    if (user) {
      await loadBusinesses(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadBusinesses(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadBusinesses(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setBusinesses([]);
          setCurrentBusinessState(null);
          localStorage.removeItem('currentBusinessId');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBusinesses([]);
    setCurrentBusinessState(null);
    localStorage.removeItem('currentBusinessId');
  };

  const setCurrentBusiness = (business: Business) => {
    setCurrentBusinessState(business);
    localStorage.setItem('currentBusinessId', business.id);
  };

  const value = {
    user,
    session,
    businesses,
    currentBusiness,
    loading,
    signIn,
    signUp,
    signOut,
    setCurrentBusiness,
    refreshBusinesses,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
