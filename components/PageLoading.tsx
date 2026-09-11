export default function PageLoading() {
  return <div role="status" aria-label="Loading page" className="w-full space-y-6 py-6 motion-safe:animate-pulse">
    <span className="sr-only">Loading the latest data...</span>
    <div aria-hidden="true" className="h-3 w-32 bg-[#cbb88a]/20" />
    <div aria-hidden="true" className="h-10 w-2/3 max-w-md bg-white/10" />
    <div aria-hidden="true" className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 border-t border-[#cbb88a]/20 bg-white/[0.03]" />)}</div>
    <div aria-hidden="true" className="h-64 border border-white/10 bg-white/[0.02]" />
  </div>;
}
