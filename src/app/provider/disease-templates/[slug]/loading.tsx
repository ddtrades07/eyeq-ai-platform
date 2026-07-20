export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-muted" />
      <div className="h-7 w-56 rounded bg-muted" />
      <div className="h-4 w-80 rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
