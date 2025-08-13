// src/components/RightSidebar.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { leetcodeProblems } from "../data/leetcode-problems";

type RatingValue =
  | "yum"
  | "desirable"
  | "challenging"
  | "incomprehensible"
  | "exhausting";
type RatingMap = Record<number, RatingValue>;

const RATING_KEY = "problemRatings";
const RECALL_KEY = "problemRecalls";
const GRADUATED_SET_KEY = "recallGraduatedIds";

function readRatings(): RatingMap {
  try {
    const raw = JSON.parse(localStorage.getItem(RATING_KEY) || "{}");
    // Filter to only known rating values
    const allowed = new Set([
      "yum",
      "desirable",
      "challenging",
      "incomprehensible",
      "exhausting",
    ]);
    const result: RatingMap = {};
    for (const [k, v] of Object.entries(raw)) {
      if (allowed.has(v as string)) result[Number(k)] = v as RatingValue;
    }
    return result;
  } catch {
    return {} as RatingMap;
  }
}

export function RightSidebar() {
  const [ratings, setRatings] = useState<RatingMap>({});
  const [recalls, setRecalls] = useState<
    Record<
      number,
      { type: "challenging" | "incomprehensible"; assignedAt: number }
    >
  >({});
  // Placeholder for future metrics (used previously for Graduations)
  const [, /* graduatedSet */ setGraduatedSet] = useState<
    Record<number, boolean>
  >({});
  const [, setNowTs] = useState<number>(() => Date.now());

  // Load on mount and subscribe to changes (same-tab and cross-tab)
  useEffect(() => {
    const loadAll = () => {
      setRatings(readRatings());
      try {
        const r = JSON.parse(localStorage.getItem(RECALL_KEY) || "{}");
        setRecalls(r || {});
      } catch {
        setRecalls({});
      }
      // We still keep this in state for future use, but no longer render it here
      try {
        const g = JSON.parse(localStorage.getItem(GRADUATED_SET_KEY) || "{}");
        setGraduatedSet(g || {});
      } catch {
        setGraduatedSet({});
      }
    };

    loadAll();

    const onRatingsChange = () => loadAll();
    const onRecallsChange = () => loadAll();
    window.addEventListener("problem-ratings-changed", onRatingsChange);
    window.addEventListener("problem-recalls-changed", onRecallsChange);
    window.addEventListener("storage", onRatingsChange);
    return () => {
      window.removeEventListener("problem-ratings-changed", onRatingsChange);
      window.removeEventListener("problem-recalls-changed", onRecallsChange);
      window.removeEventListener("storage", onRatingsChange);
    };
  }, []);

  // Tick every minute so due labels update without reload
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalProblems = leetcodeProblems.length;

  const counts = useMemo(() => {
    const initial = {
      yum: 0,
      desirable: 0,
      challenging: 0,
      incomprehensible: 0,
      exhausting: 0,
    } as Record<RatingValue, number>;
    for (const value of Object.values(ratings)) {
      initial[value] += 1;
    }
    return initial;
  }, [ratings]);

  // Solved = any rated except "exhausting"
  const solvedCount = useMemo(() => {
    const totalRated = Object.keys(ratings).length;
    return Math.max(0, totalRated - (counts.exhausting || 0));
  }, [ratings, counts.exhausting]);

  const progressPct = useMemo(() => {
    if (totalProblems === 0) return 0;
    return Math.min(100, Math.round((solvedCount / totalProblems) * 100));
  }, [solvedCount, totalProblems]);

  // Recalls list with due dates
  const recallList = useMemo(() => {
    const now = Date.now();
    const entries = Object.entries(recalls).map(([idStr, entry]) => {
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
  }, [recalls]);

  // Keeping graduatedSet in state for potential future sidebar widgets

  return (
    <aside className="ml-10 w-72 flex-shrink-0">
      {/* Solid white container */}
      <div className="relative mt-4 md:mt-6 rounded-[2rem] border border-white/25 bg-white shadow-[0_10px_30px_-12px_rgba(31,38,135,0.1)] p-6 space-y-8 overflow-y-auto max-h-[clamp(50rem,65dvh,44rem)]">
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
            <h3 className="text-sm font-medium mb-2">Current solved</h3>
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

        {/* Rating breakdown */}
        <Card className="bg-white border border-white/20 shadow-sm rounded-2xl">
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
              <div className="flex items-center justify-between">
                <span>🧊 Mentally exhausting</span>
                <span className="font-semibold">{counts.exhausting}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graduations card removed per request */}
      </div>
    </aside>
  );
}
