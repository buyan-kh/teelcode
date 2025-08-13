// src/components/RecallPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { leetcodeProblems } from "../data/leetcode-problems";

type RecallType = "challenging" | "incomprehensible";
const RECALL_KEY = "problemRecalls";

function readRecalls(): Record<
  number,
  { type: RecallType; assignedAt: number }
> {
  try {
    return JSON.parse(localStorage.getItem(RECALL_KEY) || "{}");
  } catch {
    return {} as Record<number, { type: RecallType; assignedAt: number }>;
  }
}

export function RecallPage() {
  const [recalls, setRecalls] = useState<
    Record<number, { type: RecallType; assignedAt: number }>
  >({});

  useEffect(() => {
    const load = () => setRecalls(readRecalls());
    load();
    const onChange = () => load();
    window.addEventListener("problem-recalls-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("problem-recalls-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const now = Date.now();
  const toItems = (type: RecallType) => {
    const items = Object.entries(recalls)
      .filter(([, e]) => e.type === type)
      .map(([idStr, e]) => {
        const id = Number(idStr);
        const daysDelay = type === "incomprehensible" ? 5 : 3;
        const dueAt = e.assignedAt + daysDelay * 24 * 60 * 60 * 1000;
        const remainingDays = Math.ceil(
          (dueAt - Date.now()) / (24 * 60 * 60 * 1000)
        );
        const problem = leetcodeProblems.find((p) => p.id === id);
        let dueText = "due today";
        if (remainingDays > 1) dueText = `in ${remainingDays} days`;
        else if (remainingDays === 1) dueText = "tomorrow";
        else if (remainingDays <= 0) dueText = "due today";
        return {
          id,
          title: problem?.title || `Problem #${id}`,
          dueText,
        };
      })
      .sort((a, b) => a.id - b.id);
    return items;
  };

  const lemonItems = useMemo(() => toItems("challenging"), [recalls]);
  const broccoliItems = useMemo(() => toItems("incomprehensible"), [recalls]);

  const top5 = (arr: any[]) => arr.slice(0, 5);
  const renderFiveSlots = (
    items: { id: number; title: string; dueText: string }[],
    suffixEmoji: string
  ) => {
    const slots = new Array(5).fill(null).map((_, i) => items[i] || null);
    return (
      <div className="space-y-2 min-h-[240px]">
        {slots.map((item, idx) =>
          item ? (
            <div
              key={item.id}
              className="rounded-lg border bg-white/70 px-3 py-2 flex items-center justify-between text-sm"
            >
              <div className="truncate pr-3">
                <span className="text-muted-foreground mr-1">{item.id}.</span>
                <span className="truncate align-middle">
                  {item.title} {suffixEmoji}
                </span>
              </div>
              <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {item.dueText}
              </span>
            </div>
          ) : (
            <div
              key={`empty-${idx}`}
              className="rounded-lg border bg-white/70 px-3 py-2 flex items-center justify-between text-sm opacity-0 select-none"
            >
              <div className="truncate pr-3">placeholder</div>
              <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                placeholder
              </span>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Segmented header */}
      <div className="relative rounded-[3rem] border border-white/25 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-sm px-6 py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[3rem] bg-gradient-to-b from-white/30 via-white/10 to-transparent"
        />
        <div className="relative grid grid-cols-3 gap-6">
          <div className="h-12 rounded-full bg-white/70 flex items-center justify-center text-base font-sf">
            Alert
          </div>
          <div className="h-12 rounded-full bg-white/50 flex items-center justify-center text-base font-sf">
            lorem
          </div>
          <div className="h-12 rounded-full bg-white/50 flex items-center justify-center text-base font-sf">
            ipsum
          </div>
        </div>
      </div>

      {/* Two columns: Lemon (left), Broccoli (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lemon column */}
        <Card className="rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/30 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sf font-semibold">Lemon Problems</h3>
              <span className="text-xs text-muted-foreground">🍋</span>
            </div>
            {renderFiveSlots(top5(lemonItems), "🍋")}
            <div className="mt-4 flex justify-end">
              <Button
                asChild
                className="rounded-full bg-yellow-300/70 text-black hover:bg-yellow-300"
              >
                <a href="#/recall-lemon">See More &gt;</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Broccoli column */}
        <Card className="rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/30 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sf font-semibold">Broccoli Problems</h3>
              <span className="text-xs text-muted-foreground">🥦</span>
            </div>
            {renderFiveSlots(top5(broccoliItems), "🥦")}
            <div className="mt-4 flex justify-end">
              <Button
                asChild
                className="rounded-full bg-yellow-300/70 text-black hover:bg-yellow-300"
              >
                <a href="#/recall-broccoli">See More &gt;</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forgetting Curve card */}
      <Card className="rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/30 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-sf font-semibold mb-4">Forgetting Curve</h3>
          <div className="bg-white/70 rounded-xl border h-64 flex items-center justify-center">
            {/* Simple illustrative SVG curves */}
            <svg viewBox="0 0 600 200" className="w-11/12 h-48">
              <path
                d="M20,20 C200,30 260,60 580,180"
                stroke="#bbb"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M20,20 C180,40 240,80 580,180"
                stroke="#c7c7c7"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M20,20 C160,60 220,100 580,180"
                stroke="#d9d9d9"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
