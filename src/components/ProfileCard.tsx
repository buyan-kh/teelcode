// src/components/ProfileCard.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

type UserProfile = {
  name: string;
  email: string;
  avatarDataUrl?: string;
};

const PROFILE_KEY = "userProfile";

function readProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: "Steve Stone", email: "stevestone@email.com" };
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || "Steve Stone",
      email: parsed.email || "stevestone@email.com",
      avatarDataUrl: parsed.avatarDataUrl || undefined,
    };
  } catch {
    return { name: "Steve Stone", email: "stevestone@email.com" };
  }
}

export function ProfileCard() {
  const [profile, setProfile] = useState<UserProfile>(() => readProfile());
  const [showLogout, setShowLogout] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onChange = () => setProfile(readProfile());
    window.addEventListener("profile-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("profile-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const handleSignOut = async () => {
    console.log("🚪 Forcing logout by reloading page...");
    // Force logout by clearing everything and reloading
    localStorage.clear();
    window.location.reload();
  };

  // Use authenticated user email if available, fallback to stored profile
  const displayName = user?.user_metadata?.full_name || profile.name;
  const displayEmail = user?.email || profile.email;

  const imgSrc = profile.avatarDataUrl
    ? profile.avatarDataUrl
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        displayName
      )}&background=DDD&color=111`;

  return (
    <div className="px-4">
      <div
        className="relative group"
        onMouseEnter={() => setShowLogout(true)}
        onMouseLeave={() => setShowLogout(false)}
      >
        <div className="flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm transition-colors group-hover:bg-gray-50">
          <img
            src={imgSrc}
            alt={displayName}
            className="w-10 h-10 rounded-full"
          />
          <div className="leading-tight flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {displayEmail}
            </p>
          </div>

          {showLogout && (
            <Button
              onClick={handleSignOut}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
