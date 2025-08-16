// src/components/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const GRADUATED_SET_KEY = "recallGraduatedIds";

function readGraduatedSet(): Record<number, boolean> {
  try {
    return JSON.parse(localStorage.getItem(GRADUATED_SET_KEY) || "{}");
  } catch {
    return {} as Record<number, boolean>;
  }
}

export function ProfilePage() {
  const [graduatedSet, setGraduatedSet] = useState<Record<number, boolean>>({});
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();

  useEffect(() => {
    const load = () => setGraduatedSet(readGraduatedSet());
    load();
    const onChange = () => load();
    window.addEventListener("problem-recalls-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("problem-recalls-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const graduatedCount = useMemo(
    () => Object.keys(graduatedSet).length,
    [graduatedSet]
  );

  // profile storage helpers
  const PROFILE_KEY = "userProfile";
  const loadProfile = () => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return { name: "", email: "", avatarDataUrl: undefined };
      const parsed = JSON.parse(raw);
      return {
        name: parsed.name || "",
        email: parsed.email || "",
        avatarDataUrl: parsed.avatarDataUrl || undefined,
      };
    } catch {
      return { name: "", email: "", avatarDataUrl: undefined };
    }
  };

  useEffect(() => {
    const p = loadProfile();
    setName(p.name);
    setEmail(p.email);
    setAvatarPreview(p.avatarDataUrl);
  }, []);

  const persistProfile = (data: {
    name: string;
    email: string;
    avatarDataUrl?: string;
  }) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    try {
      window.dispatchEvent(new Event("profile-changed"));
    } catch {}
  };

  const onAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : undefined;
      setAvatarPreview(url);
      persistProfile({ name, email, avatarDataUrl: url });
    };
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    persistProfile({ name, email, avatarDataUrl: avatarPreview });
  };

  return (
    <div className="rounded-2xl bg-white/85 p-6 font-sf space-y-6">
      <h1 className="text-2xl ">Profile</h1>

      {/* Profile form */}
      <Card className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={
                avatarPreview ||
                "https://ui-avatars.com/api/?name=&background=DDD&color=111"
              }
              alt="avatar preview"
              className="w-16 h-16 rounded-full object-cover border"
            />
            <div>
              <label className="text-sm block mb-1">
                Upload profile picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onAvatarChange(e.target.files?.[0] || null)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm block mb-1">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={onSave}>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* Graduations */}
      <Card className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-2">Graduations</h3>
          <p className="text-lg font-semibold">{graduatedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Problems that improved from 🍋/🥦 to 🍎/🍏
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
