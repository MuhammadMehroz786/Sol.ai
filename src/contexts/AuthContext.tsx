import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthMethodError = { message: string } | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthMethodError }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthMethodError }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthMethodError }>;
  updateProfile: (data: { displayName?: string; avatarUrl?: string }) => Promise<{ error: AuthMethodError }>;
  signOutAllDevices: () => Promise<{ error: AuthMethodError }>;
  deleteAccount: () => Promise<{ error: AuthMethodError }>;
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

  // Computed at render time — before any child effects can clear the URL hash.
  // Auth.tsx Effect 1 strips the hash immediately, so computing this inside
  // useEffect would always see an empty hash and set isAuthCallback = false,
  // causing getUser() to kill the recovery session mid-exchange.
  const isAuthCallback =
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token') ||
    window.location.hash.includes('type=recovery');

  const ensureProfileExists = async (authUser: User) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!existing) {
      // Create profile row — this covers OAuth, magic-link, and any signup path
      const meta = authUser.user_metadata || {};
      await supabase.from('profiles').upsert({
        user_id: authUser.id,
        email: authUser.email,
        display_name: meta.display_name || authUser.email?.split('@')[0] || 'User',
      }, { onConflict: 'user_id' });
    } else if (existing.email !== authUser.email) {
      // Keep email in sync if the user changed it via Supabase
      await supabase
        .from('profiles')
        .update({ email: authUser.email })
        .eq('user_id', authUser.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Auto-create profile for any sign-in method (OAuth, magic link, email)
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer to avoid Supabase client deadlock inside the listener
          setTimeout(() => ensureProfileExists(session.user), 0);
        }

        // Session expired — clear local state so ProtectedRoute redirects to /auth
        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
        }
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    // THEN check for existing session + verify the user still exists server-side.
    // getSession() reads from localStorage (stale if user was deleted from Supabase),
    // so we follow up with getUser() which hits the server to confirm validity.
    //
    // Skip the server check during auth callback flows (password reset, magic link, etc.)
    // — the URL will contain ?code= (PKCE) or #access_token (implicit). Supabase is
    // mid-exchange at this point and calling getUser() on the partial session would
    // kill it, causing "Auth session missing" on the set-password form.
    // NOTE: isAuthCallback is computed at render time (above) so child effects
    // clearing the hash don't affect this check.
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session && !isAuthCallback) {
          const { error } = await supabase.auth.getUser();
          if (error) {
            // User no longer exists on the server (deleted from dashboard, etc.)
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
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
    const redirectUrl = `${window.location.origin}/auth`;

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

    // Check for error
    if (error) {
      return { error };
    }

    // Check if user already exists (Supabase returns user but with identities empty for existing users)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        error: {
          message: 'User already registered',
          name: 'AuthApiError',
          status: 400
        }
      };
    }

    // Profile is created via ensureProfileExists() on the SIGNED_IN event
    // after the user confirms their email — no insert needed here.
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const updateProfile = async (data: { displayName?: string; avatarUrl?: string }) => {
    // Update auth user metadata
    const metadata: Record<string, string> = {};
    if (data.displayName !== undefined) metadata.display_name = data.displayName;
    if (data.avatarUrl !== undefined) metadata.avatar_url = data.avatarUrl;

    const { error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) return { error: authError };

    // Update profiles table
    if (user) {
      const profileUpdate: Record<string, string> = {};
      if (data.displayName !== undefined) profileUpdate.display_name = data.displayName;

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', user.id);

        if (profileError) {
          // Don't fail — auth metadata was updated successfully
        }
      }
    }

    return { error: null };
  };

  const signOutAllDevices = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    return { error };
  };

  const deleteAccount = async () => {
    if (!user) return { error: { message: 'No user logged in' } };

    // Delete all user-owned data (non-blocking; best-effort before auth user removal)
    const tables = [
      'voice_profiles',
      'content_outputs',
      'signals_ranked',
      'signals',
      'agent_health_checks',
      'agent_monitoring_stats',
      'system_alerts',
      'agent_fallback_events',
      'profiles',
    ] as const;

    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', user.id).catch(() => {});
    }

    // Delete the auth user itself so the email can be re-registered
    const { error: rpcError } = await supabase.rpc('delete_current_user');
    if (rpcError) {
      return { error: rpcError };
    }

    // Session is invalidated after auth user deletion; sign out to clear local state
    await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
    return { error: null };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updatePassword,
    updateProfile,
    signOutAllDevices,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};