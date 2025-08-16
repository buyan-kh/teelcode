// src/components/RightSidebar.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { leetcodeProblems } from "../data/leetcode-problems";
import { useData } from "../contexts/DataContext";

type RatingValue =
  | "yum"
  | "desirable"
  | "challenging"
  | "incomprehensible"
  | "exhausting";

const GRADUATED_SET_KEY = "recallGraduatedIds";

export function RightSidebar() {
  // Use shared data hook instead of localStorage
  const { problemRatings, problemRecalls } = useData();

  // Debug: Track when problemRatings changes
  useEffect(() => {
    console.log("📊 problemRatings changed in Sidebar:", problemRatings);
  }, [problemRatings]);
  // Placeholder for future metrics (used previously for Graduations)
  const [, /* graduatedSet */ setGraduatedSet] = useState<
    Record<number, boolean>
  >({});
  const [, setNowTs] = useState<number>(() => Date.now());

  // Use shared problemRecalls from useSupabaseData instead of local state
  // const [recalls, setRecalls] = useState<...>({}); // REMOVED - using shared state

  // Load graduated set from localStorage (not yet in Supabase)
  useEffect(() => {
    const loadGraduatedSet = () => {
      try {
        const g = JSON.parse(localStorage.getItem(GRADUATED_SET_KEY) || "{}");
        setGraduatedSet(g || {});
      } catch {
        setGraduatedSet({});
      }
    };

    loadGraduatedSet();
  }, []);

  // Tick every minute so due labels update without reload
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalProblems = leetcodeProblems.length;

  const counts = useMemo(() => {
    const c = {
      yum: 0,
      desirable: 0,
      challenging: 0,
      incomprehensible: 0,
      exhausting: 0,
    };
    Object.values(problemRatings).forEach((value) => {
      if (value && c[value as RatingValue] !== undefined) {
        c[value as RatingValue]++;
      }
    });
    return c;
  }, [problemRatings]);

  // Solved = any rated except "exhausting"
  const solvedCount = useMemo(() => {
    const totalRated = Object.keys(problemRatings).length;
    return Math.max(0, totalRated - (counts.exhausting || 0));
  }, [problemRatings, counts.exhausting]);

  // Debug: Track re-renders
  useEffect(() => {
    console.log("🔁 RightSidebar re-rendered with:", {
      ratingsCount: Object.keys(problemRatings).length,
      counts,
      solvedCount,
    });
  }, [problemRatings, counts, solvedCount]);

  const progressPct = useMemo(() => {
    if (totalProblems === 0) return 0;
    return Math.min(100, Math.round((solvedCount / totalProblems) * 100));
  }, [solvedCount, totalProblems]);

  // Recalls list with due dates
  const recallList = useMemo(() => {
    const now = Date.now();
    const entries = Object.entries(problemRecalls).map(([idStr, entry]) => {
      const id = Number(idStr);
      const daysDelay = entry.type === "incomprehensible" ? 5 : 3; // 🥦 5 days, 🍋 3 days
      const dueAt = entry.assignedAt + daysDelay * 24 * 60 * 60 * 1000;
      const isDue = now >= dueAt;
      const problem = leetcodeProblems.find((p) => p.id === id);
      return {
        id,
        title: problem?.title || `Problem #${id}`,
        type: entry.type,
        assignedAt: entry.assignedAt,
        dueAt,
        isDue,
      };
    });
    return entries.sort((a, b) => {
      if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
      return a.dueAt - b.dueAt;
    });
  }, [problemRecalls]);

  // Keeping graduatedSet in state for potential future sidebar widgets

  return (
    <aside className="w-full">
      {/* Solid white container */}
      <div className="relative mt-2 rounded-[2rem] border border-white/25 bg-white shadow-[0_10px_30px_-12px_rgba(31,38,135,0.1)] p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-2rem)]">
        {/* Progress */}

        {/* Recalls */}
        <div className="relative">
          <h2 className="text-2xl mb-4 font-sf">Today</h2>
          <div className="space-y-3">
            <h3 className="text-base font-medium text-purple-600 mb-2">
              <a
                href="#/recall"
                className="underline decoration-pink-400/60 underline-offset-4 hover:decoration-pink-500"
              >
                Recalls
              </a>
            </h3>
            <div className="space-y-4">
              {recallList.filter((r) => r.isDue).slice(0, 2).length === 0 && (
                <Card className="bg-white border border-white/20 shadow-sm rounded-2xl">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    no problems due today
                  </CardContent>
                </Card>
              )}
              {recallList
                .filter((r) => r.isDue)
                .slice(0, 2)
                .map((r) => (
                  <Card
                    key={r.id}
                    onClick={() => {
                      try {
                        window.dispatchEvent(
                          new CustomEvent("open-problem", {
                            detail: { id: r.id },
                          })
                        );
                      } catch {}
                    }}
                    className="cursor-pointer bg-white border border-white/20 shadow-sm rounded-2xl hover:bg-gray-50"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <span className="text-xs text-muted-foreground mr-2">
                              {r.id}
                            </span>
                            {r.title} {r.type === "challenging" ? "🍋" : "🥦"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            due today
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>

        <Card className="bg-white border border-white/20 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <h3 className="text-sm font-bold text-blue-600 mb-2">
              Current solved
            </h3>
            <p className="text-lg font-semibold">
              {solvedCount} / {totalProblems}
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        {/* ELO display removed */}

        {/* Rating breakdown */}
        <Card className="bg-blue-600/10 border border-white/20 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-4">Ratings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>🍎 Yum</span>
                <span className="font-semibold">{counts.yum}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🍏 Desirable</span>
                <span className="font-semibold">{counts.desirable}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🍋 Challenging</span>
                <span className="font-semibold">{counts.challenging}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>🥦 Incomprehensible</span>
                <span className="font-semibold">{counts.incomprehensible}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graduations card removed per request */}
      </div>
    </aside>
  );
}
