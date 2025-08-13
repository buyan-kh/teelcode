// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { ProblemsList } from "./components/ProblemsList";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { RightSidebar } from "./components/RightSidebar";
import { ProfilePage } from "./components/ProfilePage";
import { RecallPage } from "./components/RecallPage";
import { MarathonPage } from "./components/MarathonPage";
// import { Card, CardContent } from "./components/ui/card";

export type AppRoute =
  | "home"
  | "recall"
  | "recall-lemon"
  | "recall-broccoli"
  | "my-list"
  | "marathon"
  | "dashboard"
  | "profile"
  | "mock";

function getRouteFromHash(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const route = (hash || "home").toLowerCase().trim();
  const firstSeg = route.split(/[?#]/)[0];
  const seg = firstSeg.split("/")[0];
  if (route === "my list") return "my-list";
  // Support nested recall routes and future variants
  if (seg === "recall-lemon") return "recall-lemon";
  if (seg === "recall-broccoli") return "recall-broccoli";
  if (seg === "dashboard") return "dashboard";
  if (seg === "profile") return "profile";
  const valid: AppRoute[] = [
    "home",
    "recall",
    "recall-lemon",
    "recall-broccoli",
    "my-list",
    "marathon",
    "dashboard",
    "mock",
  ];
  return valid.includes(seg as AppRoute) ? (seg as AppRoute) : "home";
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
      case "recall-lemon":
        return <ProblemsList filterRecallType="challenging" />;
      case "recall-broccoli":
        return <ProblemsList filterRecallType="incomprehensible" />;
      case "my-list":
        return <ProblemsList filterStarredOnly />;
      case "marathon":
        return <MarathonPage />;
      case "dashboard":
        return (
          <div className="rounded-2xl bg-white/80 p-8 text-lg font-sf">
            dashboard page
          </div>
        );
      case "profile":
        return <ProfilePage />;
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
      {/* Left Column: Detached brand + sidebar */}
      <div className="ml-35 w-70 flex-shrink-0 flex flex-col gap-6 py-4 self-stretch overflow-y-auto">
        <Sidebar
          active={
            (route === "recall-lemon" || route === "recall-broccoli"
              ? "recall"
              : route) as any
          }
          onNavigate={navigate}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-1 pt-8 pb-0 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 min-h-0">{content}</div>
      </main>

      {/* Right Column: Right Sidebar content only */}
      <div className="mr-35 w-80 flex-shrink-0 flex flex-col gap-6 py-16 self-start max-h-screen overflow-y-auto">
        <RightSidebar />
      </div>
    </div>
  );
}

// (deprecated) kept previously for reference
