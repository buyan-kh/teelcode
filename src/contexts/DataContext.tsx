import React, { createContext, useContext } from "react";
import { useSupabaseData } from "../hooks/useSupabaseData";
import { useLocalStorageSync } from "../hooks/useLocalStorageSync";
import * as supabaseService from "../lib/supabaseService";

interface DataContextType {
  // Data states
  userProfile: supabaseService.UserProfile | null;
  problemRatings: Record<number, string>;
  starredProblems: Record<number, boolean>;
  problemRecalls: Record<number, { type: string; assignedAt: number }>;
  marathonSessions: Record<string, supabaseService.MarathonSession>;
  eloGains: Record<number, number>;

  // Loading states
  isLoading: boolean;
  isDataMigrated: boolean;

  // Update functions
  updateProblemRating: (
    problemId: number,
    rating: string | null,
    notes?: string
  ) => Promise<boolean>;
  updateStarredProblem: (
    problemId: number,
    isStarred: boolean
  ) => Promise<boolean>;
  updateProblemRecall: (
    problemId: number,
    recallType: "challenging" | "incomprehensible" | null
  ) => Promise<boolean>;
  updateUserProfile: (
    updates: Partial<supabaseService.UserProfile>
  ) => Promise<boolean>;
  createMarathonSession: (
    session: Omit<
      supabaseService.MarathonSession,
      "id" | "user_id" | "created_at" | "updated_at"
    >
  ) => Promise<string | null>;
  updateMarathonSession: (
    sessionId: string,
    updates: Partial<supabaseService.MarathonSession>
  ) => Promise<boolean>;
  deleteMarathonSession: (sessionId: string) => Promise<boolean>;
  updateEloGain: (
    problemId: number,
    eloGain: number,
    problemElo: number
  ) => Promise<boolean>;
  deleteEloGain: (problemId: number) => Promise<boolean>;

  // Utility functions
  refreshData: () => Promise<void>;
  migrateLegacyData: () => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const supabaseData = useSupabaseData();

  // Enable automatic localStorage ↔ Supabase sync
  useLocalStorageSync();

  return (
    <DataContext.Provider value={supabaseData}>{children}</DataContext.Provider>
  );
}
