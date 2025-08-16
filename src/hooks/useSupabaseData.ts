import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as supabaseService from "../lib/supabaseService";

interface UseSupabaseDataReturn {
  // Data states
  userProfile: supabaseService.UserProfile | null;
  problemRatings: Record<number, string>;
  starredProblems: Record<number, boolean>;
  problemRecalls: Record<number, { type: string; assignedAt: number }>;
  marathonSessions: Record<string, supabaseService.MarathonSession>;
  eloGains: Record<number, number>;

  // Loading states
  isLoading: boolean;

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
  // ELO gain functions removed

  // Utility functions
  refreshData: () => Promise<void>;
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const { user, loading: authLoading } = useAuth();

  // Data states
  const [userProfile, setUserProfile] =
    useState<supabaseService.UserProfile | null>(null);
  const [problemRatings, setProblemRatings] = useState<Record<number, string>>(
    {}
  );
  const [starredProblems, setStarredProblems] = useState<
    Record<number, boolean>
  >({});
  const [problemRecalls, setProblemRecalls] = useState<
    Record<number, { type: string; assignedAt: number }>
  >({});
  const [marathonSessions, setMarathonSessions] = useState<
    Record<string, supabaseService.MarathonSession>
  >({});
  const [eloGains, setEloGains] = useState<Record<number, number>>({});

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Load all user data from Supabase
  const loadUserData = useCallback(async () => {
    if (!user) {
      // Clear data when no user
      setUserProfile(null);
      setProblemRatings({});
      setStarredProblems({});
      setProblemRecalls({});
      setMarathonSessions({});
      setEloGains({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load all data in parallel
      const [profile, ratings, starred, recalls, sessions] = await Promise.all([
        supabaseService.getCurrentUserProfile(),
        supabaseService.getUserProblemRatings(),
        supabaseService.getUserStarredProblems(),
        supabaseService.getUserProblemRecalls(),
        supabaseService.getUserMarathonSessions(),
      ]);

      setUserProfile(profile);
      setProblemRatings(ratings);
      setStarredProblems(starred);
      setProblemRecalls(recalls);
      setMarathonSessions(sessions);
      setEloGains({}); // No ELO gains anymore

      // Migration is now handled automatically by useLocalStorageSync
      // No need for manual migration anymore
      console.log("📝 Auto-sync system handles data migration automatically");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load data when user changes
  useEffect(() => {
    if (!authLoading) {
      loadUserData();
    }
  }, [user, authLoading, loadUserData]);

  // Update functions with optimistic updates
  const updateProblemRating = useCallback(
    async (problemId: number, rating: string | null, notes?: string) => {
      // Optimistic update
      if (rating === null) {
        setProblemRatings((prev) => {
          const newRatings = { ...prev };
          delete newRatings[problemId];
          return newRatings;
        });
      } else {
        setProblemRatings((prev) => ({ ...prev, [problemId]: rating }));
      }

      const success = await supabaseService.updateProblemRating(
        problemId,
        rating,
        notes
      );

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  const updateStarredProblem = useCallback(
    async (problemId: number, isStarred: boolean) => {
      // Optimistic update
      if (isStarred) {
        setStarredProblems((prev) => ({ ...prev, [problemId]: true }));
      } else {
        setStarredProblems((prev) => {
          const newStarred = { ...prev };
          delete newStarred[problemId];
          return newStarred;
        });
      }

      const success = await supabaseService.updateStarredProblem(
        problemId,
        isStarred
      );

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  const updateProblemRecall = useCallback(
    async (
      problemId: number,
      recallType: "challenging" | "incomprehensible" | null
    ) => {
      // Optimistic update
      if (recallType === null) {
        setProblemRecalls((prev) => {
          const newRecalls = { ...prev };
          delete newRecalls[problemId];
          return newRecalls;
        });
      } else {
        setProblemRecalls((prev) => ({
          ...prev,
          [problemId]: {
            type: recallType,
            assignedAt: Date.now(),
          },
        }));
      }

      const success = await supabaseService.updateProblemRecall(
        problemId,
        recallType
      );

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  const updateUserProfileLocal = useCallback(
    async (updates: Partial<supabaseService.UserProfile>) => {
      // Optimistic update
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));

      const success = await supabaseService.updateUserProfile(updates);

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  const createMarathonSession = useCallback(
    async (
      session: Omit<
        supabaseService.MarathonSession,
        "id" | "user_id" | "created_at" | "updated_at"
      >
    ) => {
      const sessionId = await supabaseService.createMarathonSession(session);

      if (sessionId) {
        // Refresh sessions data
        const sessions = await supabaseService.getUserMarathonSessions();
        setMarathonSessions(sessions);
      }

      return sessionId;
    },
    []
  );

  const updateMarathonSession = useCallback(
    async (
      sessionId: string,
      updates: Partial<supabaseService.MarathonSession>
    ) => {
      // Optimistic update
      setMarathonSessions((prev) => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          ...updates,
        } as supabaseService.MarathonSession,
      }));

      const success = await supabaseService.updateMarathonSession(
        sessionId,
        updates
      );

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  const deleteMarathonSession = useCallback(
    async (sessionId: string) => {
      // Optimistic update
      setMarathonSessions((prev) => {
        const newSessions = { ...prev };
        delete newSessions[sessionId];
        return newSessions;
      });

      const success = await supabaseService.deleteMarathonSession(sessionId);

      if (!success) {
        // Revert optimistic update on failure
        await loadUserData();
      }

      return success;
    },
    [loadUserData]
  );

  // ELO gain functions removed

  // Migration is now handled automatically by useLocalStorageSync

  return {
    // Data states
    userProfile,
    problemRatings,
    starredProblems,
    problemRecalls,
    marathonSessions,
    eloGains,

    // Loading states
    isLoading: isLoading || authLoading,

    // Update functions
    updateProblemRating,
    updateStarredProblem,
    updateProblemRecall,
    updateUserProfile: updateUserProfileLocal,
    createMarathonSession,
    updateMarathonSession,
    deleteMarathonSession,
    // ELO gain functions removed

    // Utility functions
    refreshData: loadUserData,
  };
}
