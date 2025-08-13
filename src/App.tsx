// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { ProblemsList } from "./components/ProblemsList";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { RightSidebar } from "./components/RightSidebar";
import { ProfileCard } from "./components/ProfileCard";
import { RecallPage } from "./components/RecallPage";
import { MarathonPage } from "./components/MarathonPage";
import { Card, CardContent } from "./components/ui/card";

export type AppRoute = "home" | "recall" | "my-list" | "marathon" | "mock";

function getRouteFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const route = (hash || "home").toLowerCase();
  if (route === "my list") return "my-list";
  const valid: AppRoute[] = ["home", "recall", "my-list", "marathon", "mock"];
  return valid.includes(route as AppRoute) ? (route as AppRoute) : "home";
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromHash());

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (next: AppRoute) => {
    window.location.hash = `/${next}`;
  };

  const content = useMemo(() => {
    switch (route) {
      case "home":
        return <ProblemsList />;
      case "recall":
        return <RecallPage />;
      case "my-list":
        return <ProblemsList filterStarredOnly />;
      case "marathon":
        return <MarathonPage />;
      case "mock":
        return (
          <div className="rounded-2xl bg-white/80 p-8 text-lg font-sf">
            Mock page
          </div>
        );
      default:
        return <ProblemsList />;
    }
  }, [route]);

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Left Sidebar */}
      <Sidebar active={route} onNavigate={navigate} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0">{content}</div>
      </main>

      {/* Right Column: Profile (separate) + Right Sidebar content */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6 py-6 self-start">
        <ProfileCard />
        <RightSidebar />
      </div>
    </div>
  );
}

// Simple My List page that shows starred problems from storage
function MyListPage() {
  let starred: Record<number, boolean> = {};
  try {
    starred = JSON.parse(localStorage.getItem("starredProblems") || "{}");
  } catch {
    starred = {};
  }
  const starredIds = Object.entries(starred)
    .filter(([, is]) => !!is)
    .map(([id]) => Number(id));

  if (starredIds.length === 0) {
    return (
      <Card className="rounded-2xl bg-white/85">
        <CardContent className="p-8 font-sf">
          No starred problems yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl bg-white/85">
      <CardContent className="p-6 font-sf">
        <h3 className="text-lg font-semibold mb-4">My Starred Problems</h3>
        <ul className="list-disc pl-5 space-y-2">
          {starredIds.map((id) => (
            <li key={id}>Problem #{id}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
