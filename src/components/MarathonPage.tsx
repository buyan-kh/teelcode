// src/components/MarathonPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { leetcodeProblems, LeetCodeProblem } from "../data/leetcode-problems";
import {
  analyzeMarathonPrompt,
  streamConversationalReply,
} from "../lib/openai";
import { ProblemModal } from "./ProblemModal";
import { Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  checkAndUpdateChatLimit,
  getChatLimitInfo,
} from "../lib/supabaseService";

type Preference = "lemon" | "broccoli" | "surprise" | "text";

type ChatMessage = { role: "user" | "bot"; text: string };

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  status: "planning" | "running" | "completed";
  messages: ChatMessage[];
  suggestions: number[];
  solvedMap: Record<number, boolean>;
  elapsedMs: number;
  preference?: Preference | null;
  completedAt?: number; // timestamp when all problems were solved
  congratsShown?: boolean; // whether congrats message was already shown
  bestTime?: number; // best completion time in ms
  everCompleted?: boolean; // true if this session was ever completed (for green border)
  attemptNumber?: number; // current attempt number (1, 2, 3, etc.)
  deleted?: boolean; // soft delete flag - hides from UI but preserves data
};

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function formatHMS(totalMs: number) {
  const totalSec = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatCompletionTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) {
    return `${totalSec}s`;
  } else if (totalSec < 3600) {
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

// ELO calculation removed - no longer tracking user ELO

export function MarathonPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [preference, setPreference] = useState<Preference | null>(null);
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hi! What kind of problems do you want to marathon today? You can mention topics, difficulty limits, or constraints.",
    },
  ]);
  const [assistantStreaming, setAssistantStreaming] = useState<string>("");
  const [solvedMap, setSolvedMap] = useState<Record<number, boolean>>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [startReady, setStartReady] = useState(false);
  const [chatLimitInfo, setChatLimitInfo] = useState<{
    used: number;
    remaining: number;
    resetDate: string;
  }>({
    used: 0,
    remaining: 3,
    resetDate: new Date().toISOString().split("T")[0],
  });

  // Chat history state
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>(
    {}
  );
  const [currentChatId, setCurrentChatId] = useState<string>("");

  // Problem modal state
  const [selectedProblem, setSelectedProblem] =
    useState<LeetCodeProblem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [problemNotes, setProblemNotes] = useState<Record<number, string>>({});
  const [problemRatings, setProblemRatings] = useState<
    Record<number, string | null>
  >({});

  // Solved problems tracking (no ELO calculation)
  const [solvedProblems, setSolvedProblems] = useState<Set<number>>(new Set());

  // Load existing ratings and ELO data from global storage on mount and listen for changes
  useEffect(() => {
    const loadRatings = () => {
      try {
        const RATING_KEY = "problemRatings";
        const existingRatings = JSON.parse(
          localStorage.getItem(RATING_KEY) || "{}"
        );
        setProblemRatings(existingRatings);
      } catch (error) {
        console.warn("Failed to load existing ratings:", error);
      }
    };

    const loadSolvedData = () => {
      try {
        const SOLVED_KEY = "solvedProblems";
        const savedSolved = localStorage.getItem(SOLVED_KEY);

        if (savedSolved) {
          const solvedArray = JSON.parse(savedSolved);
          setSolvedProblems(new Set(solvedArray));
        }
      } catch (error) {
        console.warn("Failed to load solved problems data:", error);
      }
    };

    // Load initial data
    loadRatings();
    loadSolvedData();

    // Listen for rating changes from other components (like homepage)
    const handleRatingChange = () => loadRatings();
    window.addEventListener("problem-ratings-changed", handleRatingChange);
    window.addEventListener("storage", handleRatingChange);

    return () => {
      window.removeEventListener("problem-ratings-changed", handleRatingChange);
      window.removeEventListener("storage", handleRatingChange);
    };
  }, []);

  // Load chat limit info when user changes
  useEffect(() => {
    if (user?.id) {
      getChatLimitInfo(user.id).then(setChatLimitInfo);
    }
  }, [user?.id]);

  // timer
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  // Chat scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  useEffect(() => {
    // Load chat sessions and initialize
    const SESS_KEY = "marathonSessions";
    const CURR_KEY = "marathonCurrentSessionId";
    try {
      const curr = localStorage.getItem(CURR_KEY);
      const sessions = JSON.parse(localStorage.getItem(SESS_KEY) || "{}");

      // Migrate existing completed sessions to have everCompleted flag
      const migratedSessions = { ...sessions };
      Object.keys(migratedSessions).forEach((sessionId) => {
        const session = migratedSessions[sessionId];
        if (session && session.everCompleted === undefined) {
          // Check if this session is actually completed
          const isActuallyCompleted =
            session.suggestions.length > 0 &&
            Object.values(session.solvedMap).filter(Boolean).length ===
              session.suggestions.length;

          if (isActuallyCompleted) {
            migratedSessions[sessionId] = {
              ...session,
              everCompleted: true,
              bestTime: session.bestTime || session.elapsedMs || 0,
            };
          }
        }
      });

      setChatSessions(migratedSessions);

      // Save migrated sessions back to localStorage if any changes were made
      if (JSON.stringify(migratedSessions) !== JSON.stringify(sessions)) {
        localStorage.setItem(SESS_KEY, JSON.stringify(migratedSessions));
      }

      if (curr && sessions[curr]) {
        // Load existing session
        loadChatSession(curr, sessions[curr]);
      } else {
        // Create new session
        createNewChatSession();
      }
    } catch {
      createNewChatSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNewChatSession = () => {
    const id = crypto.randomUUID();
    const defaultMessages = [
      {
        role: "bot" as const,
        text: "Hi! What kind of problems do you want to marathon today? You can mention topics, difficulty limits, or constraints.",
      },
    ];

    const newSession: ChatSession = {
      id,
      title: `Chat ${Object.keys(chatSessions).length + 1}`,
      createdAt: Date.now(),
      status: "planning",
      messages: defaultMessages,
      suggestions: [],
      solvedMap: {},
      elapsedMs: 0,
      preference: null,
    };

    const SESS_KEY = "marathonSessions";
    const CURR_KEY = "marathonCurrentSessionId";

    const updatedSessions = { ...chatSessions, [id]: newSession };
    setChatSessions(updatedSessions);
    localStorage.setItem(SESS_KEY, JSON.stringify(updatedSessions));
    localStorage.setItem(CURR_KEY, id);

    loadChatSession(id, newSession);
  };

  const loadChatSession = (id: string, session: ChatSession) => {
    setCurrentChatId(id);
    setSessionId(id);
    setMessages(session.messages);
    setSuggestions(session.suggestions);
    setSolvedMap(session.solvedMap);
    setElapsedMs(session.elapsedMs);
    setPreference(session.preference || null);
    setStarted(false);
    setRunning(false);
    setStartReady(session.suggestions.length > 0);
  };

  // Persist current session on key state changes
  useEffect(() => {
    if (!sessionId || !currentChatId) return;
    try {
      const SESS_KEY = "marathonSessions";
      const currentSessions = JSON.parse(
        localStorage.getItem(SESS_KEY) || "{}"
      );

      const existingSession = currentSessions[sessionId];

      // Don't update if session is marked as deleted
      if (existingSession?.deleted) return;

      const updatedSession: ChatSession = {
        id: sessionId,
        title:
          existingSession?.title ??
          `Chat ${Object.keys(currentSessions).length}`,
        createdAt: existingSession?.createdAt ?? Date.now(),
        status: started
          ? "running"
          : suggestions.length > 0
          ? "completed"
          : "planning",
        messages,
        suggestions,
        solvedMap,
        elapsedMs,
        preference,
        // Preserve existing fields that should never be lost
        completedAt: existingSession?.completedAt,
        congratsShown: existingSession?.congratsShown,
        bestTime: existingSession?.bestTime,
        everCompleted: existingSession?.everCompleted,
        attemptNumber: existingSession?.attemptNumber,
        deleted: existingSession?.deleted,
      };

      const updatedSessions = {
        ...currentSessions,
        [sessionId]: updatedSession,
      };
      setChatSessions(updatedSessions);
      localStorage.setItem(SESS_KEY, JSON.stringify(updatedSessions));
    } catch {}
  }, [
    sessionId,
    currentChatId,
    messages,
    suggestions,
    solvedMap,
    elapsedMs,
    started,
    preference,
  ]);

  useEffect(() => {
    if (!running) return;

    let animationId: number;
    let startTime = performance.now();
    let pausedTime = elapsedMs;

    function tick(now: number) {
      const currentElapsed = pausedTime + (now - startTime);
      setElapsedMs(currentElapsed);
      animationId = requestAnimationFrame(tick);
    }

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [running]);

  const generateFromConversation = async (
    pref: Preference | null,
    conversationText: string
  ) => {
    if (!user?.id) {
      alert("Please log in to use the AI marathon feature.");
      return;
    }

    // Check chat limit before proceeding
    const { allowed, remaining } = await checkAndUpdateChatLimit(user.id);
    if (!allowed) {
      alert(
        "You've reached your daily limit of 3 AI marathon requests. Please try again tomorrow!"
      );
      return;
    }

    setIsLoading(true);
    setPreference(pref);

    // Update chat limit info
    setChatLimitInfo((prev) => ({ ...prev, remaining }));

    // Ask OpenAI to convert the conversation context + preference into a filter plan
    const plan = await analyzeMarathonPrompt(conversationText, pref);

    // Debug: Log the plan to see what AI generated
    console.log("AI Generated Plan:", plan);
    console.log("Using conversation context:", conversationText);

    // Debug: If plan seems empty, show what we expected
    if (
      !plan.minElo &&
      !plan.maxElo &&
      (!plan.includeTopics || plan.includeTopics.length === 0)
    ) {
      console.warn(
        "⚠️ AI plan seems empty! Expected filters were not applied."
      );
      console.warn(
        "This might indicate OpenAI API issues or parsing problems."
      );

      // Manual override for testing - detect common patterns and fix topic names
      const text = conversationText.toLowerCase();

      // Topic mapping for common abbreviations/variations
      const topicMap: Record<string, string> = {
        dp: "Dynamic Programming",
        "dynamic programming": "Dynamic Programming",
        dfs: "DFS",
        bfs: "BFS",
        tree: "Tree",
        graph: "Graph",
        array: "Array",
        string: "String",
        heap: "Heap (Priority Queue)",
        "binary search": "Binary Search",
        greedy: "Greedy",
        backtracking: "Backtracking",
        "two pointers": "Two Pointers",
        "sliding window": "Sliding Window",
        "bit manipulation": "Bit Manipulation",
        "union find": "Union Find",
        trie: "Trie",
        "segment tree": "Segment Tree",
      };

      // Find matching topic
      const foundTopic = Object.entries(topicMap).find(([key, _]) =>
        text.includes(key)
      );

      if (text.includes("2000+") && foundTopic) {
        console.log(
          `🔧 Applying manual override for '2000+ ${foundTopic[0]}' request`
        );
        plan.minElo = 2000;
        plan.includeTopics = [foundTopic[1]];
      } else if (foundTopic) {
        console.log(
          `🔧 Applying manual override for '${foundTopic[0]}' request`
        );
        plan.includeTopics = [foundTopic[1]];
      } else if (text.includes("2000+")) {
        console.log("🔧 Applying manual override for '2000+' request");
        plan.minElo = 2000;
      }
    }

    // Apply the same filtering logic as generate()
    let pool = leetcodeProblems;
    if (plan.minElo != null)
      pool = pool.filter((p) => p.eloScore >= plan.minElo!);
    if (plan.maxElo != null)
      pool = pool.filter((p) => p.eloScore <= plan.maxElo!);

    const includes = (plan.includeTopics || [])
      .map((t) => t.toLowerCase())
      .filter(Boolean);
    const excludes = (plan.excludeTopics || [])
      .map((t) => t.toLowerCase())
      .filter(Boolean);

    if (includes.length > 0) {
      pool = pool.filter((p) =>
        includes.every((kw) =>
          p.topics.some((t) => t.toLowerCase().includes(kw))
        )
      );
    }
    if (excludes.length > 0) {
      pool = pool.filter(
        (p) =>
          !p.topics.some((t) =>
            excludes.some((kw) => t.toLowerCase().includes(kw))
          )
      );
    }

    // Debug: Log topic filtering
    if (includes.length > 0) {
      console.log(`Applied includeTopics filter:`, includes);
    }
    if (excludes.length > 0) {
      console.log(`Applied excludeTopics filter:`, excludes);
    }

    // Debug: Log pool size after filtering
    console.log(`Pool size after filtering: ${pool.length} problems`);
    if (plan.minElo != null) {
      console.log(`Applied minElo filter: >= ${plan.minElo}`);
    }
    if (plan.maxElo != null) {
      console.log(`Applied maxElo filter: <= ${plan.maxElo}`);
    }

    // Fallback if the filter is too strict
    if (pool.length === 0) {
      console.log("No problems found with filters, using all problems");
      pool = leetcodeProblems;
    }

    const count = Math.min(Math.max(plan.count ?? 10, 1), 100);
    const picks = pickRandom(pool, count).map((p) => p.id);

    // Debug: Log selected problems ELO scores and topics
    const selectedProblems = picks
      .map((id) => leetcodeProblems.find((p) => p.id === id))
      .filter(Boolean);
    console.log(
      "Selected problem ELO scores:",
      selectedProblems.map((p) => p?.eloScore || 0).sort((a, b) => a - b)
    );
    console.log(
      "Selected problem topics:",
      selectedProblems.map((p) => ({
        title: p?.title || "Unknown",
        topics: p?.topics || [],
      }))
    );

    setSuggestions(picks);
    setIsLoading(false);

    // Update chat title if this is the first time generating problems
    if (
      currentChatId &&
      chatSessions[currentChatId]?.suggestions.length === 0
    ) {
      const newTitle = generateChatTitle(messages);
      const updatedSession = {
        ...chatSessions[currentChatId],
        title: newTitle,
      };
      setChatSessions((prev) => ({ ...prev, [currentChatId]: updatedSession }));
    }
  };

  const generate = async (pref: Preference | null) => {
    if (!user?.id) {
      alert("Please log in to use the AI marathon feature.");
      return;
    }

    // Check chat limit before proceeding
    const { allowed, remaining } = await checkAndUpdateChatLimit(user.id);
    if (!allowed) {
      alert(
        "You've reached your daily limit of 3 AI marathon requests. Please try again tomorrow!"
      );
      return;
    }

    setIsLoading(true);
    setPreference(pref);

    // Update chat limit info
    setChatLimitInfo((prev) => ({ ...prev, remaining }));

    // Ask OpenAI to convert the prompt + preference into a filter plan
    const plan = await analyzeMarathonPrompt(prompt, pref);

    // Debug: Log the plan to see what AI generated
    console.log("AI Generated Plan:", plan);
    console.log("Original user prompt:", prompt);

    // Debug: If plan seems empty, show what we expected
    if (
      !plan.minElo &&
      !plan.maxElo &&
      (!plan.includeTopics || plan.includeTopics.length === 0)
    ) {
      console.warn(
        "⚠️ AI plan seems empty! Expected filters were not applied."
      );
      console.warn(
        "This might indicate OpenAI API issues or parsing problems."
      );

      // Manual override for testing - detect common patterns and fix topic names
      const text = prompt.toLowerCase();

      // Topic mapping for common abbreviations/variations
      const topicMap: Record<string, string> = {
        dp: "Dynamic Programming",
        "dynamic programming": "Dynamic Programming",
        dfs: "DFS",
        bfs: "BFS",
        tree: "Tree",
        graph: "Graph",
        array: "Array",
        string: "String",
        heap: "Heap (Priority Queue)",
        "binary search": "Binary Search",
        greedy: "Greedy",
        backtracking: "Backtracking",
        "two pointers": "Two Pointers",
        "sliding window": "Sliding Window",
        "bit manipulation": "Bit Manipulation",
        "union find": "Union Find",
        trie: "Trie",
        "segment tree": "Segment Tree",
      };

      // Find matching topic
      const foundTopic = Object.entries(topicMap).find(([key, _]) =>
        text.includes(key)
      );

      if (text.includes("2000+") && foundTopic) {
        console.log(
          `🔧 Applying manual override for '2000+ ${foundTopic[0]}' request`
        );
        plan.minElo = 2000;
        plan.includeTopics = [foundTopic[1]];
      } else if (foundTopic) {
        console.log(
          `🔧 Applying manual override for '${foundTopic[0]}' request`
        );
        plan.includeTopics = [foundTopic[1]];
      } else if (text.includes("2000+")) {
        console.log("🔧 Applying manual override for '2000+' request");
        plan.minElo = 2000;
      }
    }

    let pool = leetcodeProblems;
    if (plan.minElo != null)
      pool = pool.filter((p) => p.eloScore >= plan.minElo!);
    if (plan.maxElo != null)
      pool = pool.filter((p) => p.eloScore <= plan.maxElo!);

    const includes = (plan.includeTopics || [])
      .map((t) => t.toLowerCase())
      .filter(Boolean);
    const excludes = (plan.excludeTopics || [])
      .map((t) => t.toLowerCase())
      .filter(Boolean);

    if (includes.length > 0) {
      pool = pool.filter((p) =>
        includes.every((kw) =>
          p.topics.some((t) => t.toLowerCase().includes(kw))
        )
      );
    }
    if (excludes.length > 0) {
      pool = pool.filter(
        (p) =>
          !p.topics.some((t) =>
            excludes.some((kw) => t.toLowerCase().includes(kw))
          )
      );
    }

    // Debug: Log topic filtering
    if (includes.length > 0) {
      console.log(`Applied includeTopics filter:`, includes);
    }
    if (excludes.length > 0) {
      console.log(`Applied excludeTopics filter:`, excludes);
    }

    // Debug: Log pool size after filtering
    console.log(`Pool size after filtering: ${pool.length} problems`);
    if (plan.minElo != null) {
      console.log(`Applied minElo filter: >= ${plan.minElo}`);
    }
    if (plan.maxElo != null) {
      console.log(`Applied maxElo filter: <= ${plan.maxElo}`);
    }

    // Fallback if the filter is too strict
    if (pool.length === 0) {
      console.log("No problems found with filters, using all problems");
      pool = leetcodeProblems;
    }

    const count = Math.min(Math.max(plan.count ?? 10, 1), 100);
    const picks = pickRandom(pool, count).map((p) => p.id);

    // Debug: Log selected problems ELO scores and topics
    const selectedProblems = picks
      .map((id) => leetcodeProblems.find((p) => p.id === id))
      .filter(Boolean);
    console.log(
      "Selected problem ELO scores:",
      selectedProblems.map((p) => p?.eloScore || 0).sort((a, b) => a - b)
    );
    console.log(
      "Selected problem topics:",
      selectedProblems.map((p) => ({
        title: p?.title || "Unknown",
        topics: p?.topics || [],
      }))
    );

    setSuggestions(picks);
    setIsLoading(false);

    // Update chat title if this is the first time generating problems
    if (
      currentChatId &&
      chatSessions[currentChatId]?.suggestions.length === 0
    ) {
      const newTitle = generateChatTitle(messages);
      const updatedSession = {
        ...chatSessions[currentChatId],
        title: newTitle,
      };
      setChatSessions((prev) => ({ ...prev, [currentChatId]: updatedSession }));
    }
  };

  const items = useMemo(() => {
    const map = new Map(leetcodeProblems.map((p) => [p.id, p]));
    return suggestions
      .map((id) => map.get(id))
      .filter((p): p is LeetCodeProblem => p !== undefined);
  }, [suggestions]);

  const readyText = "Ok, ready when you are. Press Start.";
  const systemPrompt =
    "You are Marathon Buddy, a concise, upbeat coach that helps choose a set of coding problems for a focused session. " +
    "Ask short, specific questions. Keep replies under 2 short sentences. " +
    "Workflow: 1) Greet and ask what kind of problems they'd like (topics/difficulty/constraints). " +
    "2) After each user message, summarize the intent briefly and ask: 'Before we start, anything you'd like to add or change? If not, say: go ahead.' " +
    "3) When the user says 'go ahead' or similar, stop and let the app generate the list. " +
    "Do not list problems yourself. Avoid long explanations.";

  const runConversationTurn = async (userText: string) => {
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setStartReady(false);
    setAssistantStreaming("");

    // Build chat history for the model
    const history = [
      ...messages.map((m) => ({
        role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      })),
      { role: "user" as const, content: userText },
    ];

    let acc = "";
    await streamConversationalReply({
      system: systemPrompt,
      history,
      onToken: (t) => {
        acc += t;
        setAssistantStreaming((prev) => prev + t);
      },
    });

    // Clear the streaming state and add the final message
    setAssistantStreaming("");
    setMessages((prev) => [...prev, { role: "bot", text: acc }]);

    // Only proceed if the USER explicitly says to go ahead, not if AI mentions "ready"
    const proceedRegex =
      /(go ahead|start|looks good|let's go|lets go|ready|go|goo|yes)/i;
    if (proceedRegex.test(userText)) {
      // Extract requirements from conversation history instead of current prompt
      const conversationContext = messages
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" ");

      console.log(
        "Using conversation context for generation:",
        conversationContext
      );
      await generateFromConversation("text", conversationContext);
      setStartReady(true);
      setMessages((prev) => [...prev, { role: "bot", text: readyText }]);
    }
  };

  const submitPrompt = async () => {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    setPrompt("");
    await runConversationTurn(text);
  };

  const onRetry = () => {
    const currentSession = chatSessions[currentChatId];

    if (currentSession) {
      // Create new attempt: reset solved map but keep best time
      const updatedSession = {
        ...currentSession,
        solvedMap: {}, // Reset all solved states
        elapsedMs: 0, // Reset current elapsed time
        status: "running" as const,
        congratsShown: false, // Allow new completion message
        attemptNumber: (currentSession.attemptNumber || 0) + 1,
        // Keep bestTime and everCompleted as they are
      };

      setChatSessions((prev) => ({
        ...prev,
        [currentChatId]: updatedSession,
      }));

      // Update local state
      setSolvedMap({});
      setElapsedMs(0);
    }

    // Start fresh marathon
    setStarted(true);
    setRunning(true);
    startedAtRef.current = Date.now();
  };

  const onStart = () => {
    if (suggestions.length === 0) generate(preference ?? "surprise");

    // Check if this is a completed session
    const currentSession = chatSessions[currentChatId];
    const isCompleted = currentSession && isSessionCompleted(currentSession);

    setStarted(true);

    if (isCompleted) {
      // For completed sessions, don't restart timer or reset elapsed time
      setRunning(false);
      // Keep the existing elapsedMs from the session
    } else {
      // For new/incomplete sessions, start fresh
      setRunning(true);
      setElapsedMs(0);
      startedAtRef.current = Date.now();
    }
  };

  const onStop = () => {
    setRunning(false);
    setStarted(false);
    startedAtRef.current = null;
    // Keep elapsed time and all chat data, just stop the session
    // The problems and chat should remain, and start button should be available
  };

  // Check if all problems are solved and trigger congratulations
  useEffect(() => {
    if (!started || items.length === 0) return;

    const currentSession = chatSessions[currentChatId];

    // Don't trigger completion logic if session is already completed
    const isAlreadyCompleted =
      currentSession &&
      (currentSession.congratsShown ||
        (currentSession.suggestions.length > 0 &&
          Object.values(currentSession.solvedMap).filter(Boolean).length ===
            currentSession.suggestions.length));
    if (isAlreadyCompleted) {
      return;
    }

    const solvedCount = Object.values(solvedMap).filter(Boolean).length;
    const totalCount = items.length;

    if (solvedCount === totalCount && solvedCount > 0) {
      // All problems solved! Stop the marathon and go back to chat
      setRunning(false);
      setStarted(false);

      // Update current session with completion data
      if (currentSession && !currentSession.congratsShown) {
        const completedAt = Date.now();
        const currentTime = elapsedMs;
        const existingBestTime = currentSession.bestTime;
        const newBestTime =
          !existingBestTime || currentTime < existingBestTime
            ? currentTime
            : existingBestTime;

        const updatedSession = {
          ...currentSession,
          status: "completed" as const,
          completedAt,
          congratsShown: true,
          elapsedMs: currentTime, // Store the final elapsed time
          bestTime: newBestTime, // Update best time if this is faster
          everCompleted: true, // Mark that this session was ever completed
        };

        setChatSessions((prev) => ({
          ...prev,
          [currentChatId]: updatedSession,
        }));

        // Add congratulations message with time info
        const isNewBest = !existingBestTime || currentTime < existingBestTime;
        const timeText = formatCompletionTime(currentTime);
        const congratsMessage =
          isNewBest && existingBestTime
            ? `Congrats! You've solved all of them! ✅ New best time: ${timeText}!`
            : `Congrats! You've solved all of them! ✅ Time: ${timeText}`;

        setMessages((prev) => [
          ...prev,
          { role: "bot", text: congratsMessage },
        ]);
      }
    }
  }, [
    solvedMap,
    items.length,
    started,
    chatSessions,
    currentChatId,
    elapsedMs,
  ]);

  // Auto-scroll chat to bottom when new messages arrive, but respect user scrolling
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    };

    if (!isUserScrolling) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages, assistantStreaming, isUserScrolling]);

  // Always scroll to bottom when component mounts or chat changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    };

    // Initial scroll and reset user scrolling state
    requestAnimationFrame(scrollToBottom);
    setIsUserScrolling(false);
  }, [currentChatId]);

  // Handle scroll detection to know if user is manually scrolling
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

    // If user scrolled away from bottom, stop auto-scrolling
    // If user scrolled back to bottom, resume auto-scrolling
    setIsUserScrolling(!isAtBottom);
  };

  const openProblemModal = (problem: LeetCodeProblem) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  const closeProblemModal = () => {
    setIsModalOpen(false);
    setSelectedProblem(null);
  };

  const handleProblemNotesChange = (notes: string) => {
    if (selectedProblem) {
      setProblemNotes((prev) => ({ ...prev, [selectedProblem.id]: notes }));
    }
  };

  const handleProblemRatingChange = (rating: string | null) => {
    if (selectedProblem) {
      const problemId = selectedProblem.id;
      const previousRating = problemRatings[problemId];

      // Determine if problem was previously solved and if it's solved now
      const wasSolved = previousRating !== null && previousRating !== "icecube";
      const isSolvedNow = rating !== null && rating !== "icecube";

      // Update local state
      setProblemRatings((prev) => ({ ...prev, [problemId]: rating }));

      // Update solved tracking based on solve state change
      if (!wasSolved && isSolvedNow) {
        // Problem newly solved - just track it
        setSolvedProblems((prev) => new Set([...prev, problemId]));

        // Persist solved problems
        const updatedSolvedArray = [...solvedProblems, problemId];
        localStorage.setItem(
          "solvedProblems",
          JSON.stringify(updatedSolvedArray)
        );

        console.log(`✅ Marathon: Problem ${problemId} solved!`);
      } else if (wasSolved && !isSolvedNow) {
        // Problem unrated/unsolved - remove from solved
        setSolvedProblems((prev) => {
          const updated = new Set(prev);
          updated.delete(problemId);
          return updated;
        });

        // Persist solved problems
        const updatedSolved = [...solvedProblems].filter(
          (id) => id !== problemId
        );
        localStorage.setItem("solvedProblems", JSON.stringify(updatedSolved));

        console.log(`❌ Marathon: Problem ${problemId} unrated!`);
      }

      // Sync with global ratings storage (same as homepage)
      try {
        const RATING_KEY = "problemRatings";
        const currentRatings = JSON.parse(
          localStorage.getItem(RATING_KEY) || "{}"
        );
        const nextRatings = { ...currentRatings };

        if (rating === null) {
          delete nextRatings[problemId];
        } else {
          nextRatings[problemId] = rating;
        }

        localStorage.setItem(RATING_KEY, JSON.stringify(nextRatings));

        // Notify other components about the rating change
        window.dispatchEvent(new Event("problem-ratings-changed"));
      } catch (error) {
        console.warn("Failed to sync rating to global storage:", error);
      }
    }
  };

  const switchToChat = (chatId: string) => {
    if (chatSessions[chatId]) {
      const CURR_KEY = "marathonCurrentSessionId";
      localStorage.setItem(CURR_KEY, chatId);
      loadChatSession(chatId, chatSessions[chatId]);
    }
  };

  const deleteChatSession = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering switchToChat

    // Immediately persist the deletion to localStorage to prevent revival
    const SESS_KEY = "marathonSessions";
    const currentSessions = JSON.parse(localStorage.getItem(SESS_KEY) || "{}");

    // Mark as deleted in localStorage first
    if (currentSessions[id]) {
      currentSessions[id].deleted = true;
      localStorage.setItem(SESS_KEY, JSON.stringify(currentSessions));
    }

    // Update state with deletion
    setChatSessions((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          deleted: true,
        },
      };

      // If we're deleting the current chat, switch to another one
      if (currentChatId === id) {
        const remainingChats = Object.values(updated).filter(
          (session) => session.id !== id && !session.deleted
        );

        if (remainingChats.length > 0) {
          const mostRecent = remainingChats.sort(
            (a, b) => b.createdAt - a.createdAt
          )[0];
          // Use setTimeout to avoid state update conflicts
          setTimeout(() => switchToChat(mostRecent.id), 0);
        } else {
          // No remaining chats, create a new one
          setTimeout(() => createNewChatSession(), 0);
        }
      }

      return updated;
    });
  };

  const generateChatTitle = (messages: ChatMessage[]): string => {
    // Find the first user message that's not a preset button
    const userMessage = messages.find(
      (m) =>
        m.role === "user" &&
        !["include 🍋", "include 🥦", "surprise me 🌶️"].includes(m.text)
    );

    if (userMessage) {
      return (
        userMessage.text.slice(0, 30) +
        (userMessage.text.length > 30 ? "..." : "")
      );
    }

    return `Chat ${Object.keys(chatSessions).length}`;
  };

  const isSessionCompleted = (session: ChatSession): boolean => {
    if (session.suggestions.length === 0) return false;

    const solvedCount = Object.values(session.solvedMap).filter(Boolean).length;
    return solvedCount === session.suggestions.length;
  };

  return (
    <div className="h-full flex">
      {/* Chat History Sidebar */}
      <div className="w-48 md:w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full mr-4 rounded-2xl">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sf font-semibold text-lg">Chat History</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={createNewChatSession}
              className="h-8 px-3 text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              New
            </Button>
          </div>
        </div>

        {/* Chat List - Separate scroll container with matching height */}
        <div
          className="overflow-y-auto p-2 space-y-1"
          style={{ maxHeight: "55vh" }}
        >
          {Object.values(chatSessions)
            .filter((session) => !session.deleted) // Hide deleted sessions
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((session) => (
              <div
                key={session.id}
                onClick={() => switchToChat(session.id)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${(() => {
                  console.log(
                    `🎨 Session ${session.id.slice(-8)} everCompleted:`,
                    session.everCompleted
                  );
                  if (currentChatId === session.id) {
                    return session.everCompleted
                      ? "bg-green-50 border border-green-500"
                      : "bg-blue-100 border border-blue-200";
                  } else {
                    return session.everCompleted
                      ? "bg-white hover:bg-green-50 border border-green-500"
                      : "bg-white hover:bg-gray-100 border border-gray-200";
                  }
                })()}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-sf text-sm font-medium truncate">
                      {generateChatTitle(session.messages)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {session.suggestions.length > 0
                        ? `${session.suggestions.length} problems`
                        : "Planning"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          session.everCompleted
                            ? "bg-green-500"
                            : session.status === "running"
                            ? "bg-orange-400"
                            : session.status === "completed"
                            ? "bg-blue-400"
                            : "bg-gray-400"
                        }`}
                      />
                      {/* Delete icon */}
                      <button
                        onClick={(e) => deleteChatSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all duration-200"
                        title="Delete chat"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="text-gray-400 hover:text-red-500"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Sidebar bottom spacer to match main content structure */}
        <div className="flex-shrink-0 p-4">
          <div className="text-xs text-gray-400 text-center">
            {
              Object.values(chatSessions).filter((session) => !session.deleted)
                .length
            }{" "}
            total sessions
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {!started && (
          <>
            {/* Center blob - only show for new chats with no messages */}
            {messages.length === 1 && (
              <div className="flex-shrink-0 flex justify-center pt-6 pb-4">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 blur-[1px] shadow" />
              </div>
            )}

            {/* Chat container with proper scrolling */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto px-4 pb-4"
              style={{ maxHeight: "50vh" }}
            >
              {/* Chat bubbles container */}
              <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={m.role === "user" ? "self-end" : "self-start"}
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "rounded-full border bg-white px-4 py-2 shadow-sm"
                          : "rounded-2xl border border-orange-200 bg-rose-50 px-5 py-4"
                      }
                    >
                      <span className="font-sf text-sm">{m.text}</span>
                    </div>
                  </div>
                ))}
                {assistantStreaming && (
                  <div className="self-start">
                    <div className="rounded-2xl border border-orange-200 bg-rose-50 px-5 py-4">
                      <span className="font-sf text-sm whitespace-pre-wrap">
                        {assistantStreaming}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed bottom section - buttons and input */}
            <div className="flex-shrink-0 flex flex-col items-center gap-4 px-4 pb-4">
              {/* Preset buttons directly above chat input */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50 font-sf text-black"
                  onClick={() => {
                    runConversationTurn("include 🍋");
                  }}
                >
                  include 🍋
                </Button>
                <Button
                  className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50 font-sf text-black"
                  onClick={() => {
                    runConversationTurn("include 🥦");
                  }}
                >
                  include 🥦
                </Button>
                <Button
                  className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50 font-sf text-black"
                  onClick={() => {
                    runConversationTurn("surprise me 🌶️");
                  }}
                >
                  surprise me 🌶️
                </Button>
              </div>

              {/* Start/Retry button appears when problems exist */}
              {(startReady || suggestions.length > 0) && (
                <div className="flex items-center gap-3">
                  {(() => {
                    const currentSession = chatSessions[currentChatId];
                    const isCompleted =
                      currentSession && isSessionCompleted(currentSession);
                    return (
                      <Button
                        className="rounded-full h-12 px-10 bg-[#A9D6FF] text-black font-sf"
                        onClick={isCompleted ? onRetry : onStart}
                      >
                        {isCompleted ? "Retry" : "Start"}
                      </Button>
                    );
                  })()}
                  {/* Show best time for any session that has it */}
                  {(() => {
                    const currentSession = chatSessions[currentChatId];
                    const bestTime = currentSession?.bestTime;

                    // Show best time if it exists, regardless of completion status
                    return bestTime ? (
                      <div className="text-sm text-gray-600 font-medium">
                        Best: {formatCompletionTime(bestTime)}
                        {currentSession.attemptNumber &&
                          currentSession.attemptNumber > 1 && (
                            <span className="text-gray-400 ml-1">
                              (Attempt #{currentSession.attemptNumber})
                            </span>
                          )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Chat limit info */}
              <div className="w-full max-w-3xl px-4 pb-2">
                <div className="text-sm text-gray-600 text-center">
                  AI requests remaining today:{" "}
                  <span className="font-semibold">
                    {chatLimitInfo.remaining}
                  </span>
                  {chatLimitInfo.remaining === 0 && (
                    <span className="text-red-500 ml-2">
                      • Limit reached, try again tomorrow!
                    </span>
                  )}
                </div>
              </div>

              {/* Chat input */}
              <div className="w-full max-w-3xl flex items-center gap-2 px-4 pb-4">
                <Input
                  placeholder="Tell the AI what you want (topics, difficulty, etc.)"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-12 rounded-full !bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitPrompt();
                  }}
                  disabled={chatLimitInfo.remaining === 0}
                />
                <Button
                  className="h-12 rounded-full px-6"
                  onClick={submitPrompt}
                  disabled={isLoading || chatLimitInfo.remaining === 0}
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        )}

        {started && (
          <>
            {/* Stopwatch bar */}
            <div className="flex-shrink-0 w-full max-w-5xl mx-auto mb-3 rounded-full bg-white shadow-sm px-4 py-2 flex items-center justify-between">
              <div className="font-sf text-base">stopwatch</div>
              <div className="rounded-full bg-gray-100 px-4 py-1 font-sf">
                {formatHMS(elapsedMs)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="h-8 rounded-full bg-[#EAE8FF] text-black px-4"
                  variant="outline"
                  onClick={() => setRunning((r) => !r)}
                >
                  {running ? "pause" : "resume"}
                </Button>
                <Button
                  className="h-8 rounded-full bg-[#FFD988] text-black px-4"
                  variant="outline"
                  onClick={onStop}
                >
                  stop
                </Button>
              </div>
              <div className="font-sf text-base">
                total {items.length || 10} problems
              </div>
            </div>

            {/* Problems list */}
            <div
              className="w-full max-w-5xl mx-auto bg-white/85 rounded-2xl p-4 md:p-6 overflow-y-auto"
              style={{ maxHeight: "60vh" }}
            >
              <div className="space-y-3">
                {items.map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-xl border bg-white px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => openProblemModal(p)}
                  >
                    <div className="font-sf text-sm font-semibold">
                      {idx + 1}. {p.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      🧭 {p.eloScore}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={solvedMap[p.id] ? "default" : "outline"}
                        className="h-7 px-3 rounded-full"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation(); // Prevent modal from opening
                          setSolvedMap((prev) => ({
                            ...prev,
                            [p.id]: !prev[p.id],
                          }));
                        }}
                      >
                        {solvedMap[p.id] ? "solved" : "mark solved"}
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-sm text-muted-foreground">
                  solved {Object.values(solvedMap).filter(Boolean).length} /{" "}
                  {items.length}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Problem Modal */}
        <ProblemModal
          problem={selectedProblem}
          isOpen={isModalOpen}
          onClose={closeProblemModal}
          notes={selectedProblem ? problemNotes[selectedProblem.id] || "" : ""}
          onNotesChange={handleProblemNotesChange}
          rating={
            selectedProblem ? problemRatings[selectedProblem.id] || null : null
          }
          onRatingChange={handleProblemRatingChange}
        />
      </div>
    </div>
  );
}
