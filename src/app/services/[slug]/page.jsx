import Link from "next/link";
import { notFound } from "next/navigation";
import allServices from "@/data/serviceDetails.json" assert { type: "json" };

export function generateStaticParams() {
  return allServices.map((s) => ({ slug: s.slug }));
}

export default function Page({ params }) {
  const service = allServices.find((s) => s.slug === params.slug);
  if (!service) return notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <nav className="mb-6 text-sm">
        <Link href="/services" className="text-[var(--color-primary)] hover:underline">
          ← All Services
        </Link>
      </nav>
      <h1 className="text-3xl md:text-4xl font-extrabold">{service.title}</h1>
      <p className="mt-4 leading-relaxed">{service.description}</p>

      <div className="mt-10">
        <Link
          href="/#contact"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
        >
          Start a Conversation
        </Link>
      </div>
    </div>
  );
}
