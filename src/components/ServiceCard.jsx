import Link from 'next/link';

export default function ServiceCard({ title, description, href }) {
  const content = (
    <div className="rounded border p-6 transition-colors transition-shadow hover:border-[var(--color-primary)] hover:shadow-sm">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm">{description}</p>
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-transparent rounded">
      {content}
    </Link>
  ) : content;
}
