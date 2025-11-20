import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('Initial session check:', session?.user?.email || 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error checking session:', error);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    // Step 1: Create the auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });

    // Log detailed information for debugging
    console.log('Signup response:', { data, error });

    // Check for error
    if (error) {
      console.error('Signup error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error
      });
      return { error };
    }

    // Check if user already exists (Supabase returns user but with identities empty for existing users)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.log('User already exists - identities array is empty');
      return {
        error: {
          message: 'User already registered',
          name: 'AuthApiError',
          status: 400
        } as any
      };
    }

    console.log('Auth user created successfully:', data);

    // Step 2: Create the profile if user was created
    if (data.user) {
      const profileData = {
        user_id: data.user.id,
        email: data.user.email,
        display_name: displayName || data.user.email?.split('@')[0] || 'User',
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't return this error - user was created successfully
        // The profile can be created later if needed
      } else {
        console.log('Profile created successfully');
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};