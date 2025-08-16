import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as supabaseService from "../lib/supabaseService";

// Track which localStorage keys should be synced
const SYNC_KEYS = [
  "problemRatings",
  "starredProblems",
  "marathonSessions",
  "marathonCurrentSessionId",
  "problemRecalls",
  "solvedProblems",
];

// Track sync status to avoid infinite loops
const syncInProgress = new Set<string>();
const lastSyncValues = new Map<string, string>();

export function useLocalStorageSync() {
  const { user } = useAuth();
  const syncTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const initialSyncDone = useRef(false);

  // Debounced sync function to avoid too many API calls - separate timeout per key!
  const debouncedSync = useCallback((key: string, value: string | null) => {
    // Clear existing timeout for this specific key
    const existingTimeout = syncTimeoutsRef.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for this specific key
    const newTimeout = setTimeout(() => {
      syncToSupabase(key, value);
      syncTimeoutsRef.current.delete(key); // Clean up
    }, 500);

    syncTimeoutsRef.current.set(key, newTimeout);
    console.log(
      `⏰ Scheduled sync for ${key} in 500ms (${syncTimeoutsRef.current.size} pending)`
    );
  }, []);

  // Main sync function
  const syncToSupabase = async (key: string, value: string | null) => {
    if (!user || syncInProgress.has(key)) {
      return;
    }

    // Skip if value hasn't actually changed
    const lastValue = lastSyncValues.get(key);
    if (lastValue === value) {
      return;
    }

    try {
      syncInProgress.add(key);
      console.log(`🔄 Syncing ${key} to Supabase...`);
      console.log(
        `📤 Value to sync:`,
        value?.substring(0, 100) + (value && value.length > 100 ? "..." : "")
      );

      switch (key) {
        case "problemRatings":
          await syncProblemRatings(value);
          break;
        case "starredProblems":
          await syncStarredProblems(value);
          break;

        case "marathonSessions":
          await syncMarathonSessions(value);
          break;
        case "problemRecalls":
          await syncProblemRecalls(value);
          break;

        // marathonCurrentSessionId and solvedProblems don't need Supabase sync
        default:
          console.log(`ℹ️ Skipping sync for ${key} (no handler)`);
      }

      lastSyncValues.set(key, value || "");
      console.log(`✅ Successfully synced ${key}`);
    } catch (error) {
      console.error(`❌ Failed to sync ${key}:`, error);
    } finally {
      syncInProgress.delete(key);
    }
  };

  // Individual sync functions for each data type
  const syncProblemRatings = async (value: string | null) => {
    if (!value) {
      console.log("⏭️ Skipping problem ratings sync - value is null");
      return;
    }

    try {
      console.log("🔄 Starting problem ratings sync...");
      const ratings = JSON.parse(value);
      console.log(`📊 Local ratings:`, Object.keys(ratings).length, "problems");

      // Get current Supabase ratings
      const currentRatings = await supabaseService.getUserProblemRatings();
      console.log(
        `📊 Supabase ratings:`,
        Object.keys(currentRatings).length,
        "problems"
      );

      // Sync differences
      let updates = 0;
      for (const [problemId, rating] of Object.entries(ratings)) {
        if (currentRatings[Number(problemId)] !== rating) {
          console.log(`🔄 Updating rating for problem ${problemId}: ${rating}`);
          console.log(
            `📤 Calling supabaseService.updateProblemRating(${problemId}, "${rating}")`
          );

          try {
            const success = await supabaseService.updateProblemRating(
              Number(problemId),
              rating as string
            );
            if (success) {
              updates++;
              console.log(
                `✅ Successfully updated rating for problem ${problemId}`
              );
            } else {
              console.error(
                `❌ Failed to update rating for problem ${problemId} - updateProblemRating returned false`
              );
            }
          } catch (error) {
            console.error(
              `❌ Exception updating rating for problem ${problemId}:`,
              error
            );
          }
        } else {
          console.log(
            `⏭️ Skipping problem ${problemId} - rating unchanged (${rating})`
          );
        }
      }

      // Remove ratings that exist in Supabase but not in localStorage
      let removals = 0;
      for (const problemId of Object.keys(currentRatings)) {
        if (!(problemId in ratings)) {
          console.log(`🗑️ Removing rating for problem ${problemId}`);
          const success = await supabaseService.updateProblemRating(
            Number(problemId),
            null
          );
          if (success) {
            removals++;
          } else {
            console.error(
              `❌ Failed to remove rating for problem ${problemId}`
            );
          }
        }
      }

      console.log(
        `✅ Problem ratings sync complete: ${updates} updates, ${removals} removals`
      );
    } catch (error) {
      console.error("❌ Error syncing problem ratings:", error);
      throw error; // Re-throw to trigger retry mechanism if needed
    }
  };

  const syncStarredProblems = async (value: string | null) => {
    if (!value) return;

    try {
      const starred = JSON.parse(value);

      // Get current Supabase starred problems
      const currentStarred = await supabaseService.getUserStarredProblems();

      // Sync differences
      for (const [problemId, isStarred] of Object.entries(starred)) {
        if (isStarred && !currentStarred[Number(problemId)]) {
          await supabaseService.updateStarredProblem(Number(problemId), true);
        }
      }

      // Remove starred that exist in Supabase but not in localStorage
      for (const problemId of Object.keys(currentStarred)) {
        if (!starred[problemId]) {
          await supabaseService.updateStarredProblem(Number(problemId), false);
        }
      }
    } catch (error) {
      console.error("Error syncing starred problems:", error);
    }
  };

  // ELO sync function removed

  const syncMarathonSessions = async (value: string | null) => {
    if (!value) return;

    try {
      const sessions = JSON.parse(value);

      // Get current Supabase sessions
      const currentSessions = await supabaseService.getUserMarathonSessions();

      // Sync new/updated sessions
      for (const [sessionId, session] of Object.entries(sessions)) {
        const sessionData = session as any;

        if (!currentSessions[sessionId]) {
          // Create new session
          const newSessionId = await supabaseService.createMarathonSession({
            title: sessionData.title,
            status: sessionData.status || "planning",
            messages: sessionData.messages || [],
            suggestions: sessionData.suggestions || [],
            solved_map: sessionData.solvedMap || {},
            elapsed_ms: sessionData.elapsedMs || 0,
            preference: sessionData.preference,
            completed_at: sessionData.completedAt,
            best_time: sessionData.bestTime,
            ever_completed: sessionData.everCompleted || false,
            attempt_number: sessionData.attemptNumber || 1,
          });

          // If the session was created with a different ID, we'll need to handle that
          if (newSessionId && newSessionId !== sessionId) {
            console.log(
              `Session ${sessionId} created with new ID ${newSessionId}`
            );
          }
        } else {
          // Update existing session
          await supabaseService.updateMarathonSession(sessionId, {
            title: sessionData.title,
            status: sessionData.status,
            messages: sessionData.messages,
            suggestions: sessionData.suggestions,
            solved_map: sessionData.solvedMap,
            elapsed_ms: sessionData.elapsedMs,
            preference: sessionData.preference,
            completed_at: sessionData.completedAt,
            best_time: sessionData.bestTime,
            ever_completed: sessionData.everCompleted,
            attempt_number: sessionData.attemptNumber,
          });
        }
      }
    } catch (error) {
      console.error("Error syncing marathon sessions:", error);
    }
  };

  const syncProblemRecalls = async (value: string | null) => {
    if (!value) return;

    try {
      const recalls = JSON.parse(value);

      // Get current Supabase recalls
      const currentRecalls = await supabaseService.getUserProblemRecalls();

      // Sync differences
      for (const [problemId, recall] of Object.entries(recalls)) {
        const recallData = recall as any;
        if (recallData && recallData.type) {
          if (
            !currentRecalls[Number(problemId)] ||
            currentRecalls[Number(problemId)].type !== recallData.type
          ) {
            await supabaseService.updateProblemRecall(
              Number(problemId),
              recallData.type as "challenging" | "incomprehensible"
            );
          }
        }
      }

      // Remove recalls that exist in Supabase but not in localStorage
      for (const problemId of Object.keys(currentRecalls)) {
        if (!recalls[problemId]) {
          await supabaseService.updateProblemRecall(Number(problemId), null);
        }
      }
    } catch (error) {
      console.error("Error syncing problem recalls:", error);
    }
  };

  // ELO gains sync function removed

  // Initial sync from Supabase to localStorage when user logs in
  const initialSyncFromSupabase = useCallback(async () => {
    if (!user || initialSyncDone.current) return;

    console.log("🔄 Performing initial sync from Supabase to localStorage...");

    try {
      // Prevent localStorage change events from triggering sync during initial load
      SYNC_KEYS.forEach((key) => syncInProgress.add(key));

      // Load all data from Supabase
      const [
        problemRatings,
        starredProblems,
        problemRecalls,
        marathonSessions,
      ] = await Promise.all([
        supabaseService.getUserProblemRatings(),
        supabaseService.getUserStarredProblems(),
        supabaseService.getUserProblemRecalls(),
        supabaseService.getUserMarathonSessions(),
      ]);

      console.log(
        `📥 Loaded from Supabase: Ratings=${
          Object.keys(problemRatings).length
        }, Sessions=${Object.keys(marathonSessions).length}`
      );

      // ALWAYS update localStorage with Supabase data on login
      // This ensures cross-device sync works properly

      // Always sync problem ratings (even if empty, to clear local data)
      localStorage.setItem("problemRatings", JSON.stringify(problemRatings));
      lastSyncValues.set("problemRatings", JSON.stringify(problemRatings));

      // Always sync starred problems (even if empty, to clear local data)
      localStorage.setItem("starredProblems", JSON.stringify(starredProblems));
      lastSyncValues.set("starredProblems", JSON.stringify(starredProblems));

      // ELO sync removed

      // Always sync problem recalls (even if empty, to clear local data)
      const recallsForStorage: Record<string, any> = {};
      Object.entries(problemRecalls).forEach(([problemId, recall]) => {
        recallsForStorage[problemId] = {
          type: recall.type,
          assignedAt: recall.assignedAt,
        };
      });
      localStorage.setItem("problemRecalls", JSON.stringify(recallsForStorage));
      lastSyncValues.set("problemRecalls", JSON.stringify(recallsForStorage));

      // Always sync marathon sessions (even if empty, to clear local data)
      const sessionsForStorage: Record<string, any> = {};
      Object.entries(marathonSessions).forEach(([sessionId, session]) => {
        sessionsForStorage[sessionId] = {
          id: session.id,
          title: session.title,
          createdAt: new Date(session.created_at).getTime(),
          status: session.status,
          messages: session.messages,
          suggestions: session.suggestions,
          solvedMap: session.solved_map,
          elapsedMs: session.elapsed_ms,
          preference: session.preference,
          completedAt: session.completed_at,
          bestTime: session.best_time,
          everCompleted: session.ever_completed,
          attemptNumber: session.attempt_number,
        };
      });
      localStorage.setItem(
        "marathonSessions",
        JSON.stringify(sessionsForStorage)
      );
      lastSyncValues.set(
        "marathonSessions",
        JSON.stringify(sessionsForStorage)
      );

      // ELO gains sync removed

      initialSyncDone.current = true;
      console.log("✅ Initial sync completed");
      console.log(
        `📊 Synced data: Ratings=${
          Object.keys(problemRatings).length
        }, Starred=${Object.keys(starredProblems).length}, Sessions=${
          Object.keys(marathonSessions).length
        }`
      );

      // Trigger storage events to update components
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("problem-ratings-changed"));

      // Refresh page after initial sync to ensure all components reflect synced data
      console.log("🔄 Refreshing page to reflect synced data...");
      setTimeout(() => {
        window.location.reload();
      }, 1000); // 1 second delay to ensure all sync operations complete
    } catch (error) {
      console.error("❌ Initial sync failed:", error);
    } finally {
      // Re-enable sync tracking
      SYNC_KEYS.forEach((key) => syncInProgress.delete(key));
    }
  }, [user]);

  // Set up localStorage change monitoring
  useEffect(() => {
    if (!user) {
      initialSyncDone.current = false;
      return;
    }

    // Perform initial sync
    initialSyncFromSupabase();

    // Monitor localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !SYNC_KEYS.includes(e.key)) return;

      console.log(`📝 localStorage changed: ${e.key}`);
      debouncedSync(e.key, e.newValue);
    };

    // Monitor manual localStorage.setItem calls
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key: string, value: string) {
      const oldValue = localStorage.getItem(key);
      originalSetItem.call(localStorage, key, value);

      if (SYNC_KEYS.includes(key) && oldValue !== value) {
        console.log(
          `📝 localStorage manually updated: ${key}`,
          value?.substring(0, 50) + (value && value.length > 50 ? "..." : "")
        );
        console.log(`🔄 Will sync in 500ms...`);
        debouncedSync(key, value);
      }
    };

    // Add a manual force sync function for testing
    (window as any).forceSync = async () => {
      console.log("🔧 Manual force sync triggered...");
      for (const key of SYNC_KEYS) {
        const value = localStorage.getItem(key);
        if (value) {
          console.log(`🔧 Force syncing ${key}...`);
          await syncToSupabase(key, value);
        }
      }
      console.log("🔧 Manual force sync complete");
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      localStorage.setItem = originalSetItem;

      // Clear all pending sync timeouts
      syncTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      syncTimeoutsRef.current.clear();
    };
  }, [user, debouncedSync, initialSyncFromSupabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all pending sync timeouts on unmount
      syncTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      syncTimeoutsRef.current.clear();
    };
  }, []);
}
