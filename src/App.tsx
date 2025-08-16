// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { ProblemsList } from "./components/ProblemsList";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { RightSidebar } from "./components/RightSidebar";
import { ProfilePage } from "./components/ProfilePage";
import { RecallPage } from "./components/RecallPage";
import { MarathonPage } from "./components/MarathonPage";
import { LoadingScreen } from "./components/LoadingScreen";
import { useData } from "./contexts/DataContext";
import { useAuth } from "./contexts/AuthContext";
// import { DataMigrationBanner } from "./components/DataMigrationBanner"; // Not needed with auto-sync
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
  const { user, loading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useData();

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

  // Show loading screen when user is authenticated but data is still loading
  if (user && dataLoading) {
    return <LoadingScreen message="Loading your data..." />;
  }

  return (
    <div className="h-screen flex">
      {/* Left sidebar */}
      <div className="w-[260px] flex-shrink-0 overflow-y-auto sticky top-0 h-screen py-8 px-3">
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
      <main className="flex-1 min-w-0 px-6 pt-8 pb-0 flex flex-col">
        <Header />
        {/* One and only scroll area for center column */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[860px] w-full mx-auto">{content}</div>
        </div>
      </main>

      {/* Right sidebar */}
      <div className="w-[320px] flex-shrink-0 overflow-y-auto sticky top-0 h-screen py-6">
        <RightSidebar />
      </div>
    </div>
  );
}

// (deprecated) kept previously for reference
