// src/components/RightSidebar.tsx
import { Card, CardContent } from "./ui/card";

export function RightSidebar() {
  return (
    <aside className="w-72 flex-shrink-0">
      {/* Liquid glass container */}
      <div className="relative rounded-[2rem] border border-white/25 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_30px_-12px_rgba(31,38,135,0.25)] p-6 space-y-8">
        {/* highlight sheen overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/35 via-white/10 to-transparent"
        />

        {/* Today */}
        <div className="relative">
          <h2 className="text-2xl font-bold mb-6 font-sf">Today</h2>

          {/* Recalls */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-purple-600 mb-2">
              Recalls
            </h3>
            <div className="space-y-4">
              <Card className="bg-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <span className="text-xs text-muted-foreground mr-2">
                          1150
                        </span>
                        Count Pairs That Form a Complete Day I 🍎
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <span className="text-xs text-muted-foreground mr-2">
                          1151
                        </span>
                        Convert Binary Number in a Linked List to Integer 🍋
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <span className="text-xs text-muted-foreground mr-2">
                          1152
                        </span>
                        Score of a String 🥦
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Pomodoro Heading separate from timer */}
        <h2 className="relative text-2xl font-bold font-sf">Pomodoro</h2>
        <Card className="bg-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">25:00</div>
            <p className="text-xs text-muted-foreground mt-1">Time to focus</p>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-white/30 backdrop-blur-xl backdrop-saturate-150 border border-white/20 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-2">Current solved</h3>
            <p className="text-lg font-semibold">58 / 2857</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: "2%" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
