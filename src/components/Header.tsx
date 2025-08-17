// src/components/Header.tsx
import { useAuth } from "../contexts/AuthContext";

export function Header() {
  const { user } = useAuth();

  // Get user name from auth context
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";

  return (
    <header className="mb-3 font-sf">
      <div className="rounded-2xl bg-white px-6 py-5 shadow-sm border">
        <h1 className="text-3xl md:text-4xl font-sf">
          Good Morning, {displayName}!
        </h1>
        <p className="text-muted-foreground mt-2 font-sf">
          How many problems do you want to solve today?
        </p>
      </div>
    </header>
  );
}
