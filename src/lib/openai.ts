/**
 * This runs in the browser. Provide VITE_OPENAI_API_KEY in your env
 * for local/dev usage only. For production at scale, proxy this request
 * through your own backend to avoid exposing the API key to clients.
 */

export type MarathonPlan = {
  count?: number; // default 10
  minElo?: number; // 0-4000
  maxElo?: number; // 0-4000
  includeTopics?: string[]; // case-insensitive contains
  excludeTopics?: string[];
};

const DEFAULT_PLAN: Required<Pick<MarathonPlan, "count">> & MarathonPlan = {
  count: 10,
  minElo: undefined,
  maxElo: undefined,
  includeTopics: undefined,
  excludeTopics: undefined,
};

export async function analyzeMarathonPrompt(
  prompt: string,
  preference: "lemon" | "broccoli" | "surprise" | "text" | null
): Promise<MarathonPlan> {
  // IMPORTANT: In production we will call Supabase Edge Function instead
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) {
    return DEFAULT_PLAN;
  }

  const system =
    "You convert a user's coding practice preferences into a compact JSON filter. " +
    "Return ONLY JSON, no prose. Unknown fields should be omitted. " +
    "Fields: count (int, default 10), minElo (int), maxElo (int), includeTopics (string[]), excludeTopics (string[]). " +
    "Elo scale: <1400 easy, 1400-2000 medium, 2000+ hard. EXACT TOPIC NAMES (use these exactly): Array, BFS, Backtracking, Biconnected Component, Binary Indexed Tree, Binary Search, Binary Search Tree, Binary Tree, Bit Manipulation, Bitmask, Brainteaser, Combinatorics, Counting, Counting Sort, DFS, Data Stream, Design, Divide and Conquer, Doubly-Linked List, Dynamic Programming, Enumeration, Eulerian Circuit, Game Theory, Geometry, Graph, Greedy, Hash Function, Hash Table, Heap (Priority Queue), Interactive, Iterator, Line Sweep, Linked List, Math, Matrix, Memoization, Merge Sort, Minimum Spanning Tree, Monotonic Queue, Monotonic Stack, Number Theory, Ordered Set, Prefix Sum, Probability and Statistics, Queue, Quickselect, Radix Sort, Randomized, Recursion, Rolling Hash, Segment Tree, Shortest Path, Simulation, Sliding Window, Sort, Sorting, Stack, String, String Matching, Strongly Connected Component, Suffix Array, Topological Sort, Tree, Trie, Two Pointers, Union Find. " +
    "Do NOT infer Elo bounds from 'lemon' or 'broccoli' preferences; those map to the user's own ratings and are filtered client-side. " +
    "IMPORTANT ELO PARSING RULES: " +
    "- '2000+ elo' or '2000+' sets minElo to 2000 " +
    "- 'above 1800' sets minElo to 1800 " +
    "- 'below 1500' sets maxElo to 1500 " +
    "- 'easy' sets maxElo to 1400 " +
    "- 'medium' sets minElo to 1400 and maxElo to 2000 " +
    "- 'hard' sets minElo to 2000 " +
    "- Always set minElo/maxElo for ANY numeric ELO mentions or difficulty levels. " +
    "IMPORTANT TOPIC PARSING RULES: " +
    "- 'dp problems' or 'dynamic programming' → includeTopics: ['Dynamic Programming'] " +
    "- 'tree problems' → includeTopics: ['Tree'] " +
    "- 'graph problems' → includeTopics: ['Graph'] " +
    "- 'array problems' → includeTopics: ['Array'] " +
    "- 'heap problems' → includeTopics: ['Heap (Priority Queue)'] " +
    "- 'binary search problems' → includeTopics: ['Binary Search'] " +
    "- 'dfs problems' → includeTopics: ['DFS'] " +
    "- 'bfs problems' → includeTopics: ['BFS'] " +
    "- 'greedy problems' → includeTopics: ['Greedy'] " +
    "- 'backtracking problems' → includeTopics: ['Backtracking'] " +
    "- 'two pointers problems' → includeTopics: ['Two Pointers'] " +
    "- 'sliding window problems' → includeTopics: ['Sliding Window'] " +
    "- 'bit manipulation problems' → includeTopics: ['Bit Manipulation'] " +
    "- 'union find problems' → includeTopics: ['Union Find'] " +
    "- 'trie problems' → includeTopics: ['Trie'] " +
    "- 'segment tree problems' → includeTopics: ['Segment Tree'] " +
    "- 'shortest path problems' → includeTopics: ['Shortest Path'] " +
    "- CRITICAL: Always use EXACT topic names from the provided list. Never abbreviate or modify them.";

  const user = [
    `Preference: ${preference ?? "none"}`,
    `Prompt: ${prompt}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "MarathonPlan",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                count: { type: "integer", minimum: 1, maximum: 100 },
                minElo: { type: "integer", minimum: 0, maximum: 4000 },
                maxElo: { type: "integer", minimum: 0, maximum: 4000 },
                includeTopics: { type: "array", items: { type: "string" } },
                excludeTopics: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI API Error: ${res.status}`);
      const errorText = await res.text();
      console.error("Error details:", errorText);
      throw new Error(`OpenAI HTTP ${res.status}`);
    }

    const json = await res.json();
    console.log("OpenAI API Response:", json);

    // Chat Completions API returns { choices: [{ message: { content } }] }
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("No content in OpenAI response");
      return DEFAULT_PLAN;
    }

    console.log("OpenAI Raw Content:", content);
    const parsed = JSON.parse(content);
    console.log("Parsed Plan:", parsed);
    const plan: MarathonPlan = { ...DEFAULT_PLAN, ...parsed };
    return plan;
  } catch (err) {
    console.warn("OpenAI marathon analysis failed, using defaults", err);
    return DEFAULT_PLAN;
  }
}

// Simple streaming chat helper using Chat Completions API.
// Calls onToken for each text delta. Returns when stream completes.
export async function streamConversationalReply(args: {
  system: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onToken: (text: string) => void;
}): Promise<void> {
  // IMPORTANT: In production we will call Supabase Edge Function instead
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) return;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "system", content: args.system }, ...args.history],
      temperature: 0.6,
    }),
  });

  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.replace(/^data:\s*/, "");
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") {
          args.onToken(delta);
        } else if (Array.isArray(delta)) {
          for (const seg of delta) {
            if (typeof seg?.text === "string") args.onToken(seg.text);
          }
        }
      } catch {}
    }
  }
}
