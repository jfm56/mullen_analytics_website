export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3 animate-pulse">
      <div className="h-3 w-1/3 bg-gray-200 rounded" />
      <div className="h-7 w-1/2 bg-gray-200 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-9 bg-gray-100 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-50 rounded border" />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'table', rows = 5 }) {
  if (type === 'card') return <SkeletonCard />;
  if (type === 'line') return <SkeletonLine />;
  return <SkeletonTable rows={rows} />;
}
