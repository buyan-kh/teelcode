// src/components/ProfileCard.tsx
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const onChange = () => setProfile(readProfile());
    window.addEventListener("profile-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("profile-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const imgSrc = profile.avatarDataUrl
    ? profile.avatarDataUrl
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile.name
      )}&background=DDD&color=111`;

  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <img
          src={imgSrc}
          alt={profile.name}
          className="w-10 h-10 rounded-full"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold truncate max-w-[12rem]">
            {profile.name}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-[12rem]">
            {profile.email}
          </p>
        </div>
      </div>
    </div>
  );
}
