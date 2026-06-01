import Link from 'next/link';

export default function MetricCard({ label, value, sub, icon, color = 'blue', onClick, href, trend, loading }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-100',
  };
  const interactive = !!(href || onClick);
  const inner = (
    <div className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col gap-1 ${interactive ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && (
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${colors[color] || colors.blue}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1">
        {loading ? <span className="inline-block w-12 h-6 bg-gray-100 rounded animate-pulse" /> : (value ?? '—')}
      </div>
      <div className="flex items-center justify-between">
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
        {trend != null && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {Math.abs(trend)}
          </span>
        )}
      </div>
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  if (onClick) return <div onClick={onClick} role="button" tabIndex={0}>{inner}</div>;
  return inner;
}
