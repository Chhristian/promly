/** Loading placeholder shown instantly while a dashboard page loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-10 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-6 w-28" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      </div>
    </div>
  );
}
