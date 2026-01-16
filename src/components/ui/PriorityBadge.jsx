export default function PriorityBadge({ priority }) {
  const getStyles = () => {
    const styles = {
      low: 'bg-gray-50 text-gray-600 border-gray-200',
      medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      high: 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[priority] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const formatLabel = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles()}`}>
      {formatLabel(priority)}
    </span>
  );
}
