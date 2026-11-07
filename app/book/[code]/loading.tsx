export default function Loading() {
  return (
    <div className="mx-auto min-h-screen max-w-md px-3 py-4 sm:py-8" aria-busy="true" aria-label="Loading">
      <div className="card overflow-hidden">
        <div className="skeleton h-40 rounded-none" />
        <div className="space-y-3 p-5">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-10 w-32" />
          <div className="grid grid-cols-4 gap-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
