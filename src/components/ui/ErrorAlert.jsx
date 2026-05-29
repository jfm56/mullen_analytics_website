export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3 mb-4">
      <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
      <div className="flex-1 text-sm text-red-700">{message}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      )}
    </div>
  );
}
