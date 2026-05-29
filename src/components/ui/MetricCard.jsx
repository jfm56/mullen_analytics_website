export default function MetricCard({ label, value, sub, icon, color = 'blue', onClick }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    gray:   'bg-gray-50 text-gray-600 border-gray-100',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col gap-1 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && (
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${colors[color] || colors.blue}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
