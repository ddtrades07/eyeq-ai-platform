export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 w-24 rounded bg-muted" />
      <div className="h-7 w-48 rounded bg-muted" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
