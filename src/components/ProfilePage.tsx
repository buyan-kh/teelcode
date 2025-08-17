// src/components/ProfilePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { useAuth } from "../contexts/AuthContext";

const GRADUATED_SET_KEY = "recallGraduatedIds";

function readGraduatedSet(): Record<number, boolean> {
  try {
    return JSON.parse(localStorage.getItem(GRADUATED_SET_KEY) || "{}");
  } catch {
    return {} as Record<number, boolean>;
  }
}

export function ProfilePage() {
  const { user } = useAuth();
  const [graduatedSet, setGraduatedSet] = useState<Record<number, boolean>>({});

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

  return (
    <div className="rounded-2xl bg-white/85 p-6 font-sf space-y-6">
      <h1 className="text-2xl ">Profile</h1>

      {/* User Info */}
      <Card className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm block mb-1 text-gray-600">Name</label>
              <p className="text-lg font-medium">
                {user?.user_metadata?.full_name ||
                  user?.email?.split("@")[0] ||
                  "User"}
              </p>
            </div>
            <div>
              <label className="text-sm block mb-1 text-gray-600">Email</label>
              <p className="text-lg font-medium">{user?.email || "No email"}</p>
            </div>
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
