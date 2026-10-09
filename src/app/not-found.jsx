import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-4">The link may be outdated. You can return home or open your client portal.</p>
      <div className="mt-8 flex justify-center gap-6">
        <Link href="/" className="text-blue-600 underline">Home</Link>
        <Link href="/portal/login" className="text-blue-600 underline">Client portal</Link>
      </div>
    </section>
  );
}
