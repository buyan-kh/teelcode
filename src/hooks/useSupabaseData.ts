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

  // Loading states
  isLoading: boolean;

  // Update functions (with optimistic updates)
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

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Load all user data from Supabase (database is source of truth)
  const loadUserData = useCallback(async () => {
    if (!user) {
      // Clear data when no user
      setUserProfile(null);
      setProblemRatings({});
      setStarredProblems({});
      setProblemRecalls({});
      setMarathonSessions({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log("📥 Loading user data from Supabase...");

      const [profile, ratings, starred, recalls, sessions] = await Promise.all([
        supabaseService.getCurrentUserProfile(),
        supabaseService.getUserProblemRatings(),
        supabaseService.getUserStarredProblems(),
        supabaseService.getUserProblemRecalls(),
        supabaseService.getUserMarathonSessions(),
      ]);

      // MERGE Supabase data with existing localStorage data (don't overwrite!)
      setUserProfile(profile);

      // For ratings, starred, recalls - merge with existing localStorage
      setProblemRatings((prev) => {
        const merged = { ...prev, ...ratings };
        localStorage.setItem("problemRatings", JSON.stringify(merged));
        return merged;
      });

      setStarredProblems((prev) => {
        const merged = { ...prev, ...starred };
        localStorage.setItem("starredProblems", JSON.stringify(merged));
        return merged;
      });

      setProblemRecalls((prev) => {
        const merged = { ...prev, ...recalls };
        localStorage.setItem("problemRecalls", JSON.stringify(merged));
        return merged;
      });

      setMarathonSessions((prev) => {
        const merged = { ...prev, ...sessions };
        localStorage.setItem("marathonSessions", JSON.stringify(merged));
        return merged;
      });

      console.log("💾 Merged and cached data to localStorage");

      console.log("✅ User data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load data on user change
  useEffect(() => {
    if (!authLoading) {
      // Load from cache first for instant UI, then load fresh data
      if (user) {
        try {
          const cachedRatings = localStorage.getItem("problemRatings");
          const cachedStarred = localStorage.getItem("starredProblems");
          const cachedRecalls = localStorage.getItem("problemRecalls");
          const cachedSessions = localStorage.getItem("marathonSessions");

          if (cachedRatings) setProblemRatings(JSON.parse(cachedRatings));
          if (cachedStarred) setStarredProblems(JSON.parse(cachedStarred));
          if (cachedRecalls) setProblemRecalls(JSON.parse(cachedRecalls));
          if (cachedSessions) setMarathonSessions(JSON.parse(cachedSessions));

          console.log("⚡ Loaded cached data for instant UI");
        } catch (error) {
          console.warn("Failed to load cached data:", error);
        }
      }

      // Load fresh data from database
      loadUserData();
    }
  }, [user, authLoading, loadUserData]);

  // Optimistic update functions (update UI first, then database)
  const updateProblemRating = useCallback(
    async (problemId: number, rating: string | null, notes?: string) => {
      console.log(`🔄 Updating problem ${problemId} rating to: ${rating}`);

      // Store previous value for potential rollback
      const previousRating = problemRatings[problemId] || null;

      // 1. Optimistic update - Update UI immediately
      console.log("🎯 Before update:", { ...problemRatings });
      setProblemRatings((prev) => {
        const next = { ...prev };
        if (rating === null) {
          delete next[problemId];
        } else {
          next[problemId] = rating;
        }
        console.log("🎯 After update:", next);
        return next;
      });

      // 2. Update database
      try {
        console.log(
          `🚀 About to call supabaseService.updateProblemRating(${problemId}, "${rating}", ${notes}, ${user?.id})`
        );
        const success = await supabaseService.updateProblemRating(
          problemId,
          rating,
          notes,
          user?.id // Pass user ID from auth context
        );
        console.log(
          `🚀 supabaseService.updateProblemRating returned: ${success}`
        );

        if (success) {
          // Update localStorage cache
          const currentRatings = { ...problemRatings };
          if (rating === null) {
            delete currentRatings[problemId];
          } else {
            currentRatings[problemId] = rating;
          }
          localStorage.setItem(
            "problemRatings",
            JSON.stringify(currentRatings)
          );
          console.log(`✅ Problem ${problemId} rating updated successfully`);
          return true;
        } else {
          throw new Error("Database update failed");
        }
      } catch (error) {
        console.error(
          `❌ Failed to update problem ${problemId} rating:`,
          error
        );

        // 3. Rollback optimistic update on failure
        setProblemRatings((prev) => {
          const newRatings = { ...prev };
          if (previousRating === null) {
            delete newRatings[problemId];
          } else {
            newRatings[problemId] = previousRating;
          }
          return newRatings;
        });

        return false;
      }
    },
    [problemRatings]
  );

  const updateStarredProblem = useCallback(
    async (problemId: number, isStarred: boolean) => {
      console.log(`🔄 Updating problem ${problemId} starred to: ${isStarred}`);

      const previousStarred = starredProblems[problemId] || false;

      // Optimistic update
      setStarredProblems((prev) => ({ ...prev, [problemId]: isStarred }));

      try {
        const success = await supabaseService.updateStarredProblem(
          problemId,
          isStarred
        );

        if (success) {
          const currentStarred = { ...starredProblems, [problemId]: isStarred };
          localStorage.setItem(
            "starredProblems",
            JSON.stringify(currentStarred)
          );
          console.log(`✅ Problem ${problemId} starred updated successfully`);
          return true;
        } else {
          throw new Error("Database update failed");
        }
      } catch (error) {
        console.error(
          `❌ Failed to update problem ${problemId} starred:`,
          error
        );

        // Rollback
        setStarredProblems((prev) => ({
          ...prev,
          [problemId]: previousStarred,
        }));
        return false;
      }
    },
    [starredProblems]
  );

  const updateProblemRecall = useCallback(
    async (
      problemId: number,
      recallType: "challenging" | "incomprehensible" | null
    ) => {
      console.log(`🔄 Updating problem ${problemId} recall to: ${recallType}`);

      const previousRecall = problemRecalls[problemId] || null;

      // Optimistic update
      setProblemRecalls((prev) => {
        const newRecalls = { ...prev };
        if (recallType === null) {
          delete newRecalls[problemId];
        } else {
          newRecalls[problemId] = {
            type: recallType,
            assignedAt: Date.now(),
          };
        }
        return newRecalls;
      });

      try {
        const success = await supabaseService.updateProblemRecall(
          problemId,
          recallType
        );

        if (success) {
          const currentRecalls = { ...problemRecalls };
          if (recallType === null) {
            delete currentRecalls[problemId];
          } else {
            currentRecalls[problemId] = {
              type: recallType,
              assignedAt: Date.now(),
            };
          }
          localStorage.setItem(
            "problemRecalls",
            JSON.stringify(currentRecalls)
          );
          console.log(`✅ Problem ${problemId} recall updated successfully`);
          return true;
        } else {
          throw new Error("Database update failed");
        }
      } catch (error) {
        console.error(
          `❌ Failed to update problem ${problemId} recall:`,
          error
        );

        // Rollback
        setProblemRecalls((prev) => {
          const newRecalls = { ...prev };
          if (previousRecall === null) {
            delete newRecalls[problemId];
          } else {
            newRecalls[problemId] = previousRecall;
          }
          return newRecalls;
        });
        return false;
      }
    },
    [problemRecalls]
  );

  const updateUserProfile = useCallback(
    async (updates: Partial<supabaseService.UserProfile>) => {
      console.log("🔄 Updating user profile:", updates);

      const previousProfile = userProfile;

      // Optimistic update
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));

      try {
        const success = await supabaseService.updateUserProfile(updates);

        if (success) {
          console.log("✅ User profile updated successfully");
          return true;
        } else {
          throw new Error("Database update failed");
        }
      } catch (error) {
        console.error("❌ Failed to update user profile:", error);

        // Rollback
        setUserProfile(previousProfile);
        return false;
      }
    },
    [userProfile]
  );

  const createMarathonSession = useCallback(
    async (
      session: Omit<
        supabaseService.MarathonSession,
        "id" | "user_id" | "created_at" | "updated_at"
      >
    ) => {
      console.log("🔄 Creating marathon session:", session);

      try {
        const sessionId = await supabaseService.createMarathonSession(session);

        if (sessionId) {
          // Refresh data to get the new session
          await loadUserData();
          console.log("✅ Marathon session created successfully");
          return sessionId;
        } else {
          throw new Error("Failed to create session");
        }
      } catch (error) {
        console.error("❌ Failed to create marathon session:", error);
        return null;
      }
    },
    [loadUserData]
  );

  const updateMarathonSession = useCallback(
    async (
      sessionId: string,
      updates: Partial<supabaseService.MarathonSession>
    ) => {
      console.log(`🔄 Updating marathon session ${sessionId}:`, updates);

      const previousSession = marathonSessions[sessionId];

      // Optimistic update
      setMarathonSessions((prev) => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], ...updates },
      }));

      try {
        const success = await supabaseService.updateMarathonSession(
          sessionId,
          updates
        );

        if (success) {
          const currentSessions = {
            ...marathonSessions,
            [sessionId]: { ...marathonSessions[sessionId], ...updates },
          };
          localStorage.setItem(
            "marathonSessions",
            JSON.stringify(currentSessions)
          );
          console.log(`✅ Marathon session ${sessionId} updated successfully`);
          return true;
        } else {
          throw new Error("Database update failed");
        }
      } catch (error) {
        console.error(
          `❌ Failed to update marathon session ${sessionId}:`,
          error
        );

        // Rollback
        setMarathonSessions((prev) => ({
          ...prev,
          [sessionId]: previousSession,
        }));
        return false;
      }
    },
    [marathonSessions]
  );

  const deleteMarathonSession = useCallback(
    async (sessionId: string) => {
      console.log(`🔄 Deleting marathon session ${sessionId}`);

      const previousSession = marathonSessions[sessionId];

      // Optimistic update
      setMarathonSessions((prev) => {
        const newSessions = { ...prev };
        delete newSessions[sessionId];
        return newSessions;
      });

      try {
        const success = await supabaseService.deleteMarathonSession(sessionId);

        if (success) {
          const currentSessions = { ...marathonSessions };
          delete currentSessions[sessionId];
          localStorage.setItem(
            "marathonSessions",
            JSON.stringify(currentSessions)
          );
          console.log(`✅ Marathon session ${sessionId} deleted successfully`);
          return true;
        } else {
          throw new Error("Database delete failed");
        }
      } catch (error) {
        console.error(
          `❌ Failed to delete marathon session ${sessionId}:`,
          error
        );

        // Rollback
        setMarathonSessions((prev) => ({
          ...prev,
          [sessionId]: previousSession,
        }));
        return false;
      }
    },
    [marathonSessions]
  );

  return {
    // Data states
    userProfile,
    problemRatings,
    starredProblems,
    problemRecalls,
    marathonSessions,

    // Loading states
    isLoading: isLoading || authLoading,

    // Update functions
    updateProblemRating,
    updateStarredProblem,
    updateProblemRecall,
    updateUserProfile,
    createMarathonSession,
    updateMarathonSession,
    deleteMarathonSession,

    // Utility functions
    refreshData: loadUserData,
  };
}
