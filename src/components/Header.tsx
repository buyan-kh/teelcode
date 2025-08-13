// src/components/Header.tsx
import { useEffect, useState } from "react";

const PROFILE_KEY = "userProfile";
function readProfileName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return "there";
    const parsed = JSON.parse(raw);
    const name = (parsed?.name as string) || "there";
    return name.trim() || "there";
  } catch {
    return "there";
  }
}

export function Header() {
  const [name, setName] = useState<string>(() => readProfileName());

  useEffect(() => {
    const onChange = () => setName(readProfileName());
    window.addEventListener("profile-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("profile-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return (
    <header className="mb-3 font-sf">
      <div className="rounded-2xl bg-white px-6 py-5 shadow-sm border">
        <h1 className="text-3xl md:text-4xl font-sf">Good Morning, {name}!</h1>
        <p className="text-muted-foreground mt-2 font-sf">
          What do you plan to do today?
        </p>
      </div>
    </header>
  );
}
