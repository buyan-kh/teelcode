import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { ensureUserProfile } from "../lib/supabaseService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData?: { username?: string; full_name?: string }
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signInWithGitHub: () => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log("🔥 AuthProvider rendering, loading:", true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Helper to cache auth state in localStorage
  const cacheAuthState = (session: Session | null) => {
    if (session?.user) {
      localStorage.setItem(
        "supabase_auth_cache",
        JSON.stringify({
          user: session.user,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          cached_at: Date.now(),
        })
      );
    } else {
      localStorage.removeItem("supabase_auth_cache");
    }
  };

  useEffect(() => {
    if (initialized) {
      console.log("🔥 Already initialized, skipping...");
      return;
    }

    let isMounted = true; // Prevent state updates if unmounted
    console.log("🔥 Starting initialization...");

    const getInitialSession = async () => {
      if (!isMounted) return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;

        if (session && isMounted) {
          console.log("✅ Session from Supabase:", session.user.email);
          setSession(session);
          setUser(session.user);
          cacheAuthState(session); // ✅ Only cache here
          setLoading(false);
          setInitialized(true);
          return;
        }
      } catch (error) {
        console.error("❌ Failed to get session", error);
      }

      // Try restore from cache
      try {
        const cached = localStorage.getItem("supabase_auth_cache");
        if (!cached || !isMounted) return;

        const parsed = JSON.parse(cached);
        const { access_token, refresh_token, expires_at } = parsed;

        if (expires_at * 1000 < Date.now()) {
          localStorage.removeItem("supabase_auth_cache");
          setLoading(false);
          return;
        }

        const { data: restoreData, error: restoreError } =
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

        if (restoreError) throw restoreError;

        const restoredSession = restoreData.session;
        if (restoredSession && isMounted) {
          console.log(
            "✅ Restored session from cache:",
            restoredSession.user.email
          );
          setSession(restoredSession);
          setUser(restoredSession.user);
          cacheAuthState(restoredSession); // ✅ Cache after restore
          setLoading(false);
          setInitialized(true);
        }
      } catch (err) {
        console.error("❌ Failed to restore session", err);
        localStorage.removeItem("supabase_auth_cache");
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔐 Auth state changed:", event, session?.user?.email);

      // Always update state for SIGNED_IN/SIGNED_OUT events
      if (
        isMounted &&
        (event === "SIGNED_IN" || event === "SIGNED_OUT" || initialized)
      ) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }

      if (event === "SIGNED_IN" && session?.user) {
        ensureUserProfile().catch(console.error);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData?: { username?: string; full_name?: string }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {},
        },
      });

      if (error) {
        console.error("Sign up error:", error);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Sign up exception:", error);
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Sign in exception:", error);
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://teelcode.vercel.app",
        },
      });

      if (error) {
        console.error("Google sign in error:", error);
        return { user: null, error };
      }

      // Track OAuth signup attempt
      console.log("🔍 Google OAuth initiated");

      // OAuth redirects to provider, so we return success
      return { user: null, error: null };
    } catch (error) {
      console.error("Google sign in exception:", error);
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const signInWithGitHub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: "https://teelcode.vercel.app",
        },
      });

      if (error) {
        console.error("GitHub sign in error:", error);
        return { user: null, error };
      }

      // Track OAuth signup attempt
      console.log("🔍 GitHub OAuth initiated");

      // OAuth redirects to provider, so we return success
      return { user: null, error: null };
    } catch (error) {
      console.error("GitHub sign in exception:", error);
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      // Clear cached session on sign out
      localStorage.removeItem("supabase_auth_cache");

      if (error) {
        console.error("Sign out error:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Sign out exception:", error);
      return {
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("Reset password error:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Reset password exception:", error);
      return {
        error: {
          message: "An unexpected error occurred",
          name: "UnexpectedError",
        } as AuthError,
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
