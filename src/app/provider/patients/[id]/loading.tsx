export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-muted" />
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-12 rounded-full bg-muted" />
          <div className="h-5 w-12 rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-10 w-full rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
