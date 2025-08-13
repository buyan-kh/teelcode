// src/components/BrandCard.tsx
export function BrandCard() {
  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <img
          src="https://ui-avatars.com/api/?name=T&background=dbeafe&color=111"
          alt="teelcode"
          className="w-10 h-10 rounded-full"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">teelcode</p>
          <p className="text-xs text-transparent select-none">.</p>
        </div>
      </div>
    </div>
  );
}
