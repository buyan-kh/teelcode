// src/components/Header.tsx
import { Input } from "./ui/input";
import { Bell, Menu, Search } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between mb-6 pb-4">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm shadow-sm hover:bg-white"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hinted search text"
            aria-label="Search problems"
            className="w-full rounded-full pl-9 h-10 border bg-white/70 backdrop-blur-sm shadow-sm"
          />
        </div>
      </div>

      {/* Right: Bell */}
      <div className="flex items-center gap-4">
        <button
          aria-label="Notifications"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/60 backdrop-blur-sm shadow-sm hover:bg-white"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
