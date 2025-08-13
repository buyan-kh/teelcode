// src/components/ProfileCard.tsx
export function ProfileCard() {
  return (
    <div className="px-4">
      <div className="flex items-center gap-3 rounded-xl border bg-white/80 backdrop-blur-sm px-4 py-3 shadow-sm">
        <img
          src="https://ui-avatars.com/api/?name=Steve+Stone&background=DDD&color=111"
          alt="Steve Stone"
          className="w-10 h-10 rounded-full"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Steve Stone</p>
          <p className="text-xs text-muted-foreground">stevestone@email.com</p>
        </div>
      </div>
    </div>
  );
}
