export default function QuickActionButton({ icon, label, onClick, variant = 'primary' }) {
  const getStyles = () => {
    if (variant === 'primary') {
      return 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark,#1d3d73)] border-transparent';
    }
    if (variant === 'secondary') {
      return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300';
    }
    return 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)] ${getStyles()}`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
}
