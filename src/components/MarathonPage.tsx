// src/components/MarathonPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { leetcodeProblems } from "../data/leetcode-problems";

type Preference = "lemon" | "broccoli" | "surprise" | "text";

type ChatMessage = { role: "user" | "bot"; text: string };

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

export function MarathonPage() {
  const [prompt, setPrompt] = useState("");
  const [preference, setPreference] = useState<Preference | null>(null);
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [startReady, setStartReady] = useState(false);

  // timer
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    lastTickRef.current = performance.now();
    const id = requestAnimationFrame(function tick(now) {
      if (lastTickRef.current != null) {
        setElapsedMs((prev) => prev + (now - lastTickRef.current!));
      }
      lastTickRef.current = now;
      if (running) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);

  const generate = (pref: Preference | null) => {
    setIsLoading(true);
    setPreference(pref);

    let pool = leetcodeProblems;
    if (pref === "lemon") {
      pool = leetcodeProblems.filter(
        (p) => p.eloScore >= 1500 && p.eloScore <= 2100
      );
    } else if (pref === "broccoli") {
      pool = leetcodeProblems.filter((p) => p.eloScore >= 2100);
    } else if (pref === "text") {
      const t = prompt.toLowerCase();
      if (/(easy|warm|basic)/.test(t))
        pool = leetcodeProblems.filter((p) => p.eloScore < 1400);
      else if (/(medium|dp|tree|graph|challenge|lemon)/.test(t))
        pool = leetcodeProblems.filter(
          (p) => p.eloScore >= 1500 && p.eloScore <= 2100
        );
      else if (/(hard|broccoli|advanced|tough)/.test(t))
        pool = leetcodeProblems.filter((p) => p.eloScore >= 2100);
    }

    const picks = pickRandom(pool, 10).map((p) => p.id);
    setTimeout(() => {
      setSuggestions(picks);
      setIsLoading(false);
    }, 150);
  };

  const items = useMemo(() => {
    const map = new Map(leetcodeProblems.map((p) => [p.id, p]));
    return suggestions.map((id) => map.get(id)!).filter(Boolean);
  }, [suggestions]);

  const readyText = "Ok, ready when you are. Press Start.";

  const submitPrompt = () => {
    if (!prompt.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: prompt.trim() }]);
    setPrompt("");
    setStartReady(false);
    generate("text");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: readyText }]);
      setStartReady(true);
    }, 100);
  };

  const onStart = () => {
    if (suggestions.length === 0) generate(preference ?? "surprise");
    setStarted(true);
    setRunning(true);
    setElapsedMs(0);
  };

  const onStop = () => {
    setRunning(false);
    setStarted(false);
    setElapsedMs(0);
    setStartReady(false);
    setMessages([]);
    setSuggestions([]);
  };

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center gap-8">
      {/* Center blob */}
      <div className="mt-6 w-40 h-40 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 blur-[1px] shadow" />

      {!started && (
        <>
          {/* Chat bubbles (simple) */}
          <div className="w-full max-w-3xl flex flex-col gap-4 px-4">
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
          </div>

          {/* Preset buttons directly above chat input */}
          <div className="flex items-center justify-center gap-3">
            <Button
              className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50"
              variant="outline"
              onClick={() => {
                setMessages((p) => [
                  ...p,
                  { role: "user", text: "include 🍋" },
                ]);
                setStartReady(false);
                generate("lemon");
                setTimeout(() => {
                  setMessages((prev) => [
                    ...prev,
                    { role: "bot", text: readyText },
                  ]);
                  setStartReady(true);
                }, 80);
              }}
            >
              include 🍋
            </Button>
            <Button
              className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50"
              variant="outline"
              onClick={() => {
                setMessages((p) => [
                  ...p,
                  { role: "user", text: "include 🥦" },
                ]);
                setStartReady(false);
                generate("broccoli");
                setTimeout(() => {
                  setMessages((prev) => [
                    ...prev,
                    { role: "bot", text: readyText },
                  ]);
                  setStartReady(true);
                }, 80);
              }}
            >
              include 🥦
            </Button>
            <Button
              className="rounded-full h-9 px-4 bg-white border hover:bg-gray-50"
              variant="outline"
              onClick={() => {
                setMessages((p) => [
                  ...p,
                  { role: "user", text: "surprise me 🌶️" },
                ]);
                setStartReady(false);
                generate("surprise");
                setTimeout(() => {
                  setMessages((prev) => [
                    ...prev,
                    { role: "bot", text: readyText },
                  ]);
                  setStartReady(true);
                }, 80);
              }}
            >
              surprise me 🌶️
            </Button>
          </div>

          {/* Start button appears only after bot reply */}
          {startReady && (
            <Button
              className="rounded-full h-12 px-10 bg-[#A9D6FF] text-black"
              onClick={onStart}
            >
              Start
            </Button>
          )}

          {/* Chat input */}
          <div className="w-full max-w-3xl flex items-center gap-2 px-4 pb-4">
            <Input
              placeholder="Tell the AI what you want (topics, difficulty, etc.)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-12 rounded-full bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPrompt();
              }}
            />
            <Button
              className="h-12 rounded-full px-6"
              onClick={submitPrompt}
              disabled={isLoading}
            >
              Send
            </Button>
          </div>
        </>
      )}

      {started && (
        <>
          {/* Stopwatch bar */}
          <div className="w-full max-w-5xl rounded-full bg-white shadow-sm px-4 py-2 flex items-center justify-between">
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
          <div className="w-full max-w-5xl bg-white/85 rounded-2xl p-4 md:p-6 space-y-3">
            {items.map((p, idx) => (
              <div key={p.id} className="rounded-xl border bg-white px-4 py-3">
                <div className="font-sf text-sm font-semibold">
                  {idx + 1}. {p.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  🧭 {p.eloScore}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
