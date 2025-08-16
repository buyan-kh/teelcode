// src/components/Sidebar.tsx
import { ProfileCard } from "./ProfileCard";

type AppRoute =
  | "home"
  | "recall"
  | "recall-lemon"
  | "recall-broccoli"
  | "my-list"
  | "marathon"
  | "profile"
  | "mock";

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
    <aside className="h-full m-0 p-4 rounded-[2rem] bg-white shadow-sm border-r flex flex-col">
      {/* Brand inside sidebar */}
      <div className="px-4 mb-[1.2rem]">
        <div className="flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm">
          <img
            src="https://i.ibb.co/Hf1xxfY7/teelcode.png"
            alt="teelcode"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="text-m font-bold font-sf">TeelCode</p>
          </div>
        </div>
      </div>
      {/* Section: my teel */}
      <div className="mb-[1.6rem]">
        <p className="text-[1.2rem] text-muted-foreground mb-[0.8rem] font-sf condense-90 uppercase tracking-wide">
          MY TEEL
        </p>
        <nav className="space-y-[0.05rem]">
          {items.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active === key ? "page" : undefined}
              className="block w-full text-left font-sf text-[1.2rem] leading-none text-color"
            >
              <span
                className="px-[1.2rem] py-[0.6rem] rounded-2xl inline-block w-full"
                style={{
                  backgroundColor:
                    active === key ? ("#2a5de2" as any) : "transparent",
                  color: active === key ? ("#ffffff" as any) : "#000000",
                }}
              >
                <span className="condense-90 inline-block">{label}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Section: dashboard + profile */}
      <div className="mt-[1.2rem]">
        <p className="text-[1.2rem] text-muted-foreground mb-[0.8rem] font-sf condense-90 uppercase tracking-wide">
          LOREM LOREM
        </p>
        <nav className="space-y-[0.05rem]">
          {(["dashboard", "profile"] as AppRoute[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active === key ? "page" : undefined}
              className="block w-full text-left font-sf text-[1.2rem] leading-none"
            >
              <span
                className="px-[1.2rem] py-[0.6rem] rounded-2xl inline-block w-full"
                style={{
                  backgroundColor:
                    active === key ? ("#2a5de2" as any) : "transparent",
                }}
              >
                <span className="condense-90 inline-block">{key}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Profile card anchored to sidebar bottom */}
      <div className="mt-auto">
        <ProfileCard />
      </div>
    </aside>
  );
}
