// src/components/Sidebar.tsx

type AppRoute = "home" | "recall" | "my-list" | "marathon" | "mock";

type SidebarProps = {
  active: AppRoute;
  onNavigate: (next: AppRoute) => void;
};

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const items: { key: AppRoute; label: string }[] = [
    { key: "home", label: "home" },
    { key: "recall", label: "recall" },
    { key: "my-list", label: "my list" },
    { key: "marathon", label: "marathon" },
    { key: "mock", label: "mock" },
  ];

  return (
    <aside className="w-80 flex-shrink-0 h-screen m-0 p-[1.6rem] rounded-r-[2rem] bg-white shadow-sm border-r">
      {/* Brand */}
      <div className="flex items-center gap-[0.8rem] mb-[2.4rem]">
        <img
          src="https://ui-avatars.com/api/?name=T&background=dbeafe&color=111&size=128"
          alt="teelcode avatar"
          className="w-[3.2rem] h-[3.2rem] rounded-full object-cover"
        />
        <span className="text-2xl text-indigo-400 font-instrument-condensed condense-90">
          teelcode
        </span>
      </div>

      {/* Section: my teel */}
      <div className="mb-[1.6rem]">
        <p className="text-[0.9rem] text-muted-foreground mb-[0.8rem] font-instrument-condensed condense-90">
          my teel
        </p>
        <nav className="space-y-[1.2rem]">
          {items.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active === key ? "page" : undefined}
              className="block w-full text-left font-instrument-condensed text-[1.8rem] leading-none"
            >
              <span
                className="px-[1.2rem] py-[0.6rem] rounded-2xl inline-block w-full"
                style={{
                  backgroundColor:
                    active === key ? ("#AA92FF33" as any) : "transparent",
                }}
              >
                <span className="condense-90 inline-block">{label}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Section: lorem lorem */}
      <div className="mt-[2.4rem]">
        <p className="text-[0.9rem] text-muted-foreground mb-[0.8rem] font-instrument-condensed condense-90">
          lorem lorem
        </p>
        <nav className="space-y-[1.2rem]">
          {(["recall", "my-list", "marathon"] as AppRoute[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active === key ? "page" : undefined}
              className="block w-full text-left font-instrument-condensed text-[1.8rem] leading-none"
            >
              <span
                className="px-0 py-0 rounded-2xl inline-block w-full"
                style={{
                  backgroundColor:
                    active === key ? ("#AA92FF33" as any) : "transparent",
                }}
              >
                <span className="condense-90 inline-block">
                  {key === "my-list" ? "my list" : key}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
