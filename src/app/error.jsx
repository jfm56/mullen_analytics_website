'use client';

export default function ErrorPage({ reset }) {
  // Do not render exception text: it can contain identifiers or API details.
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold">This page could not load</h1>
      <p className="mt-4">Try again. If the problem continues, contact support.</p>
      <button onClick={reset} className="mt-8 rounded bg-blue-600 px-6 py-3 text-white">Try again</button>
    </section>
  );
}
