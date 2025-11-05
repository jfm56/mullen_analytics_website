export default function ServiceCard({ title, description }) {
  return (
    <div className="rounded border p-6">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
    </div>
  );
}
