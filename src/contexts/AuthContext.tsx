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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Ensure profile exists for existing session
      if (session?.user) {
        console.log("👤 Existing session found, ensuring profile exists...");
        try {
          await ensureUserProfile();
          console.log("✅ User profile ensured for existing session");
        } catch (error) {
          console.error(
            "❌ Error ensuring user profile for existing session:",
            error
          );
        }
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle sign in - ensure user profile exists
      if (event === "SIGNED_IN" && session?.user) {
        console.log("👤 User signed in, ensuring profile exists...");
        try {
          await ensureUserProfile();
          console.log("✅ User profile ensured");
        } catch (error) {
          console.error("❌ Error ensuring user profile:", error);
        }
      }

      // Handle sign out - keep localStorage data since it's our primary storage
      if (event === "SIGNED_OUT") {
        // Note: We DON'T clear localStorage anymore since it's our primary storage
        // and we want data to persist when users log back in
        console.log(
          "User signed out, but keeping localStorage data for next login"
        );
      }
    });

    return () => subscription.unsubscribe();
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

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

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
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
