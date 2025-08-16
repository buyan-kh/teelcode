import { supabase } from "./supabaseClient";

// Types for our data structures
export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProblemRating {
  id: string;
  user_id: string;
  problem_id: number;
  rating:
    | "yum"
    | "desirable"
    | "challenging"
    | "incomprehensible"
    | "exhausting";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StarredProblem {
  id: string;
  user_id: string;
  problem_id: number;
  created_at: string;
}

export interface ProblemRecall {
  id: string;
  user_id: string;
  problem_id: number;
  recall_type: "challenging" | "incomprehensible";
  assigned_at: string;
  due_date?: string;
}

export interface MarathonSession {
  id: string;
  user_id: string;
  title?: string;
  status: "planning" | "running" | "completed";
  messages: any[];
  suggestions: number[];
  solved_map: Record<number, boolean>;
  elapsed_ms: number;
  preference?: string;
  completed_at?: string;
  best_time?: number;
  ever_completed: boolean;
  attempt_number: number;
  created_at: string;
  updated_at: string;
}

// ELO Gain interface removed

// ===== USER PROFILE OPERATIONS =====

export async function ensureUserProfile(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    console.log(`🔍 Checking if profile exists for user: ${user.id}`);

    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingProfile) {
      console.log(`✅ Profile found for user: ${user.id}`);
      return existingProfile;
    }

    // If profile doesn't exist, create it
    if (fetchError && fetchError.code === "PGRST116") {
      console.log(`🆕 Creating new profile for user: ${user.id}`);

      const newProfile = {
        id: user.id,
        username: user.email?.split("@")[0] || "user",
        full_name:
          user.user_metadata?.full_name || user.email || "Anonymous User",
        avatar_url: user.user_metadata?.avatar_url || null,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert([newProfile])
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating user profile:", createError);
        return null;
      }

      console.log(`✅ Profile created successfully for user: ${user.id}`);
      return createdProfile;
    }

    console.error("❌ Error fetching user profile:", fetchError);
    return null;
  } catch (error) {
    console.error("❌ Error in ensureUserProfile:", error);
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  return ensureUserProfile();
}

export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Ensure profile exists first
    const profile = await ensureUserProfile();
    if (!profile) {
      console.error("❌ Could not ensure user profile exists");
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("❌ Error updating user profile:", error);
      return false;
    }

    console.log(`✅ Updated user profile:`, updates);
    return true;
  } catch (error) {
    console.error("❌ Error in updateUserProfile:", error);
    return false;
  }
}

// ===== PROBLEM RATINGS OPERATIONS =====

export async function getUserProblemRatings(): Promise<Record<number, string>> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("problem_ratings")
      .select("problem_id, rating")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching problem ratings:", error);
      return {};
    }

    // Convert to the format expected by the app
    const ratingsMap: Record<number, string> = {};
    data.forEach((item) => {
      ratingsMap[item.problem_id] = item.rating;
    });

    return ratingsMap;
  } catch (error) {
    console.error("Error in getUserProblemRatings:", error);
    return {};
  }
}

export async function updateProblemRating(
  problemId: number,
  rating: string | null,
  notes?: string,
  userId?: string // Accept userId as parameter
): Promise<boolean> {
  try {
    console.log(
      `🔥 updateProblemRating called: problemId=${problemId}, rating="${rating}" (type: ${typeof rating}), notes=${notes}, userId=${userId}`
    );

    if (!userId) {
      console.log(`🔥 No userId provided - returning false`);
      return false;
    }

    console.log(`🔥 Using provided userId: ${userId}`);

    if (rating === null) {
      // Delete the rating
      const { error } = await supabase
        .from("problem_ratings")
        .delete()
        .eq("user_id", userId)
        .eq("problem_id", problemId);

      if (error) {
        console.error("Error deleting problem rating:", error);
        return false;
      }
    } else {
      // Upsert the rating
      console.log(
        `🔥 About to upsert rating: user=${userId}, problem=${problemId}, rating=${rating}`
      );

      console.log(`🔥 Using correct upsert syntax with onConflict...`);

      // Correct upsert without .select() and with onConflict
      const { error } = await supabase.from("problem_ratings").upsert(
        {
          user_id: userId,
          problem_id: problemId,
          rating: rating,
          notes: notes || null,
        },
        {
          onConflict: "user_id,problem_id", // Critical: tells Supabase how to handle duplicates
        }
      );

      if (error) {
        console.error("❌ Error upserting problem rating:", error);
        console.error("❌ Full error:", JSON.stringify(error, null, 2));
        return false;
      }

      console.log(`✅ Successfully upserted rating for problem ${problemId}`);
    }

    return true;
  } catch (error) {
    console.error("Error in updateProblemRating:", error);
    return false;
  }
}

// ===== STARRED PROBLEMS OPERATIONS =====

export async function getUserStarredProblems(): Promise<
  Record<number, boolean>
> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("starred_problems")
      .select("problem_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching starred problems:", error);
      return {};
    }

    // Convert to the format expected by the app
    const starredMap: Record<number, boolean> = {};
    data.forEach((item) => {
      starredMap[item.problem_id] = true;
    });

    return starredMap;
  } catch (error) {
    console.error("Error in getUserStarredProblems:", error);
    return {};
  }
}

export async function updateStarredProblem(
  problemId: number,
  isStarred: boolean
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    if (isStarred) {
      // Add to starred
      const { error } = await supabase.from("starred_problems").upsert(
        {
          user_id: user.id,
          problem_id: problemId,
        },
        {
          onConflict: "user_id,problem_id",
        }
      );

      if (error) {
        console.error("Error starring problem:", error);
        return false;
      }
    } else {
      // Remove from starred
      const { error } = await supabase
        .from("starred_problems")
        .delete()
        .eq("user_id", user.id)
        .eq("problem_id", problemId);

      if (error) {
        console.error("Error unstarring problem:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in updateStarredProblem:", error);
    return false;
  }
}

// ===== PROBLEM RECALLS OPERATIONS =====

export async function getUserProblemRecalls(): Promise<
  Record<number, { type: string; assignedAt: number }>
> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("problem_recalls")
      .select("problem_id, recall_type, assigned_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching problem recalls:", error);
      return {};
    }

    // Convert to the format expected by the app
    const recallsMap: Record<number, { type: string; assignedAt: number }> = {};
    data.forEach((item) => {
      recallsMap[item.problem_id] = {
        type: item.recall_type,
        assignedAt: new Date(item.assigned_at).getTime(),
      };
    });

    return recallsMap;
  } catch (error) {
    console.error("Error in getUserProblemRecalls:", error);
    return {};
  }
}

export async function updateProblemRecall(
  problemId: number,
  recallType: "challenging" | "incomprehensible" | null
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    if (recallType === null) {
      // Remove from recalls
      const { error } = await supabase
        .from("problem_recalls")
        .delete()
        .eq("user_id", user.id)
        .eq("problem_id", problemId);

      if (error) {
        console.error("Error removing problem recall:", error);
        return false;
      }
    } else {
      // Add/update recall
      const { error } = await supabase.from("problem_recalls").upsert(
        {
          user_id: user.id,
          problem_id: problemId,
          recall_type: recallType,
          assigned_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,problem_id",
        }
      );

      if (error) {
        console.error("Error updating problem recall:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in updateProblemRecall:", error);
    return false;
  }
}

// ===== MARATHON SESSIONS OPERATIONS =====

export async function getUserMarathonSessions(): Promise<
  Record<string, MarathonSession>
> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("marathon_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching marathon sessions:", error);
      return {};
    }

    // Convert to the format expected by the app
    const sessionsMap: Record<string, MarathonSession> = {};
    data.forEach((session) => {
      sessionsMap[session.id] = session;
    });

    return sessionsMap;
  } catch (error) {
    console.error("Error in getUserMarathonSessions:", error);
    return {};
  }
}

export async function createMarathonSession(
  session: Omit<MarathonSession, "id" | "user_id" | "created_at" | "updated_at">
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("marathon_sessions")
      .insert({
        ...session,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating marathon session:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Error in createMarathonSession:", error);
    return null;
  }
}

export async function updateMarathonSession(
  sessionId: string,
  updates: Partial<MarathonSession>
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("marathon_sessions")
      .update(updates)
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating marathon session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateMarathonSession:", error);
    return false;
  }
}

export async function deleteMarathonSession(
  sessionId: string
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("marathon_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting marathon session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteMarathonSession:", error);
    return false;
  }
}

// ===== ELO OPERATIONS REMOVED =====

// ELO functions removed

// ===== UTILITY FUNCTIONS =====

export async function migrateLegacyData(): Promise<boolean> {
  try {
    console.log("🔄 Starting legacy data migration...");

    // Migrate problem ratings
    const legacyRatings = JSON.parse(
      localStorage.getItem("problemRatings") || "{}"
    );
    for (const [problemId, rating] of Object.entries(legacyRatings)) {
      if (rating && typeof rating === "string") {
        await updateProblemRating(Number(problemId), rating);
      }
    }

    // Migrate starred problems
    const legacyStarred = JSON.parse(
      localStorage.getItem("starredProblems") || "{}"
    );
    for (const [problemId, isStarred] of Object.entries(legacyStarred)) {
      if (isStarred) {
        await updateStarredProblem(Number(problemId), true);
      }
    }

    // Migrate recalls
    const legacyRecalls = JSON.parse(
      localStorage.getItem("problemRecalls") || "{}"
    );
    for (const [problemId, recall] of Object.entries(legacyRecalls)) {
      if (recall && typeof recall === "object" && (recall as any).type) {
        await updateProblemRecall(Number(problemId), (recall as any).type);
      }
    }

    // ELO migration removed - no longer tracking user ELO

    console.log("✅ Legacy data migration completed");
    return true;
  } catch (error) {
    console.error("❌ Error during legacy data migration:", error);
    return false;
  }
}

// ===== CHAT LIMIT OPERATIONS =====

export async function checkAndUpdateChatLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    console.log(`🔍 Checking chat limit for user: ${userId}`);

    // Get current profile with chat limit info
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("daily_chat_count, last_chat_reset_date")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Error fetching profile for chat limit:", error);
      return { allowed: false, remaining: 0 };
    }

    const today = new Date().toISOString().split("T")[0];

    // Reset counter if it's a new day
    if (profile.last_chat_reset_date !== today) {
      console.log(`🔄 Resetting chat count for new day: ${today}`);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          daily_chat_count: 1,
          last_chat_reset_date: today,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error resetting chat count:", updateError);
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: 2 }; // 3 total - 1 used = 2 remaining
    }

    // Check if user has reached limit (3 per day)
    if (profile.daily_chat_count >= 3) {
      console.log(`❌ Chat limit reached for user: ${userId}`);
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    const { error: incrementError } = await supabase
      .from("profiles")
      .update({ daily_chat_count: profile.daily_chat_count + 1 })
      .eq("id", userId);

    if (incrementError) {
      console.error("❌ Error incrementing chat count:", incrementError);
      return { allowed: false, remaining: 0 };
    }

    const remaining = 3 - (profile.daily_chat_count + 1);
    console.log(`✅ Chat allowed. Remaining: ${remaining}`);

    return { allowed: true, remaining };
  } catch (error) {
    console.error("❌ Error in checkAndUpdateChatLimit:", error);
    return { allowed: false, remaining: 0 };
  }
}

export async function getChatLimitInfo(
  userId: string
): Promise<{ used: number; remaining: number; resetDate: string }> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("daily_chat_count, last_chat_reset_date")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Error fetching chat limit info:", error);
      return {
        used: 0,
        remaining: 3,
        resetDate: new Date().toISOString().split("T")[0],
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const used =
      profile.last_chat_reset_date === today ? profile.daily_chat_count : 0;
    const remaining = Math.max(0, 3 - used);

    return {
      used,
      remaining,
      resetDate: profile.last_chat_reset_date,
    };
  } catch (error) {
    console.error("❌ Error in getChatLimitInfo:", error);
    return {
      used: 0,
      remaining: 3,
      resetDate: new Date().toISOString().split("T")[0],
    };
  }
}
