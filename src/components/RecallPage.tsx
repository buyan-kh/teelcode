// src/components/RecallPage.tsx
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export function RecallPage() {
  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Segmented header */}
      <div className="relative rounded-[3rem] border border-white/25 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 shadow-sm px-6 py-4">
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[3rem] bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
        <div className="relative grid grid-cols-3 gap-6">
          <div className="h-12 rounded-full bg-white/70 flex items-center justify-center text-base font-sf">Alert</div>
          <div className="h-12 rounded-full bg-white/50 flex items-center justify-center text-base font-sf">lorem</div>
          <div className="h-12 rounded-full bg-white/50 flex items-center justify-center text-base font-sf">ipsum</div>
        </div>
      </div>

      {/* Two columns of problem cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((col) => (
          <Card key={col} className="rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/30 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-sf font-semibold">Lemon Problems</h3>
                <span className="text-xs text-muted-foreground">🍋</span>
              </div>

              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="rounded-lg border bg-white/70 px-3 py-2 flex items-center justify-between text-sm">
                    <div className="truncate pr-3">
                      <span className="text-muted-foreground mr-1">{10 + i}.</span>
                      <span className="truncate align-middle">Squares of a Sorted Array 🥦</span>
                    </div>
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{i === 1 ? "due today" : i === 2 ? "tomorrow" : i === 3 ? "in 3 days" : "in a week"}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button className="rounded-full bg-yellow-300/70 text-black hover:bg-yellow-300">See More &gt;</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forgetting Curve card */}
      <Card className="rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/30 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-sf font-semibold mb-4">Forgetting Curve</h3>
          <div className="bg-white/70 rounded-xl border h-64 flex items-center justify-center">
            {/* Simple illustrative SVG curves */}
            <svg viewBox="0 0 600 200" className="w-11/12 h-48">
              <path d="M20,20 C200,30 260,60 580,180" stroke="#bbb" strokeWidth="3" fill="none" />
              <path d="M20,20 C180,40 240,80 580,180" stroke="#c7c7c7" strokeWidth="2.5" fill="none" />
              <path d="M20,20 C160,60 220,100 580,180" stroke="#d9d9d9" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
