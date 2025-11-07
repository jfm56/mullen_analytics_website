import Link from 'next/link';
import allServices from '@/data/serviceDetails.json' assert { type: 'json' };

export default function ServicesPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Services</h1>
      <p className="text-gray-600 mb-8">Explore our AI consulting, data engineering, and analytics services.</p>
      <ul className="grid gap-4 md:grid-cols-2">
        {allServices.map((s) => (
          <li key={s.slug} className="rounded border p-4 hover:shadow-sm transition-shadow">
            <Link href={`/services/${s.slug}`} className="font-medium hover:text-[var(--color-primary)]">
              {s.title}
            </Link>
            <p className="text-sm text-gray-600 mt-2">{s.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
