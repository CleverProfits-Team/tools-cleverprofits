// Dashboard loading skeleton — matches the hero + tools-grid layout

export default function DashboardLoading() {
  return (
    <div className="animate-in">
      {/* Hero skeleton */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 mb-8 bg-hero-mesh relative overflow-hidden">
        <div className="relative px-4 sm:px-6 lg:px-8 pt-9 pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
              <div className="h-9 w-48 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-72 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-white/10 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-stretch mt-7 pt-5 border-t border-white/[0.08]">
            <div className="pr-7 space-y-2">
              <div className="h-12 w-12 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="px-7 space-y-2">
              <div className="h-12 w-8 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="pl-7 space-y-2">
              <div className="h-12 w-10 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 max-w-md bg-white rounded-lg border border-[#e2e8f0] animate-pulse" />
          <div className="h-10 w-24 bg-white rounded-lg border border-[#e2e8f0] animate-pulse" />
        </div>
      </div>

      {/* Featured cards skeleton */}
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-5 w-5 rounded-full bg-[#2605EF]/10 animate-pulse" />
            <div className="h-3 w-28 bg-[#040B4D]/10 rounded animate-pulse" />
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#e2e8f0]/80 border-l-[3px] border-l-slate-200 p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-full bg-slate-200" />
                  <div className="h-5 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 bg-slate-100 rounded" />
                  <div className="h-5 w-20 bg-slate-100 rounded" />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-8 w-20 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* List rows skeleton */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-3 w-20 bg-[#040B4D]/10 rounded animate-pulse" />
            <div className="h-5 w-8 rounded-full bg-[#2605EF]/10 animate-pulse" />
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>
          <div className="rounded-xl border border-[#e2e8f0] overflow-hidden bg-white">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 px-4 py-3 border-b border-[#e2e8f0]/60 last:border-b-0 animate-pulse"
              >
                <div className="h-7 w-7 rounded-md bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-60 bg-slate-100 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-100 rounded hidden sm:block" />
                <div className="h-8 w-16 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
