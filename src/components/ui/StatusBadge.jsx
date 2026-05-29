export default function StatusBadge({ status, type = 'client' }) {
  const getStyles = () => {
    if (type === 'client') {
      const styles = {
        lead: 'bg-blue-50 text-blue-700 border-blue-200',
        active: 'bg-green-50 text-green-700 border-green-200',
        on_hold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        completed: 'bg-gray-50 text-gray-700 border-gray-200',
      };
      return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
    }

    if (type === 'project') {
      const styles = {
        discovery: 'bg-purple-50 text-purple-700 border-purple-200',
        build: 'bg-blue-50 text-blue-700 border-blue-200',
        validate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        deliver: 'bg-green-50 text-green-700 border-green-200',
        maintenance: 'bg-gray-50 text-gray-700 border-gray-200',
      };
      return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
    }

    if (type === 'task') {
      const styles = {
        open: 'bg-blue-50 text-blue-700 border-blue-200',
        in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        complete: 'bg-green-50 text-green-700 border-green-200',
      };
      return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
    }

    if (type === 'upload') {
      const styles = {
        received:         'bg-blue-50 text-blue-700 border-blue-200',
        validated:        'bg-green-50 text-green-700 border-green-200',
        issue:            'bg-red-50 text-red-700 border-red-200',
        processing:       'bg-yellow-50 text-yellow-700 border-yellow-200',
        done:             'bg-green-50 text-green-700 border-green-200',
        error:            'bg-red-50 text-red-700 border-red-200',
        UPLOADED:         'bg-blue-50 text-blue-700 border-blue-200',
        CLEANING:         'bg-yellow-50 text-yellow-700 border-yellow-200',
        CLEANED:          'bg-green-50 text-green-700 border-green-200',
        FAILED:           'bg-red-50 text-red-700 border-red-200',
        NEEDS_MAPPING:    'bg-amber-50 text-amber-700 border-amber-200',
        DASHBOARD_READY:  'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
      return styles[status] || 'bg-gray-50 text-gray-700 border-gray-200';
    }

    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const formatLabel = (str) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
      {formatLabel(status)}
    </span>
  );
}
