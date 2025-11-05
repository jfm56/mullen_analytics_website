export default function TestimonialCard({ quote, author }) {
  return (
    <blockquote className="rounded border p-6 bg-gray-50">
      <p className="italic">“{quote}”</p>
      <footer className="mt-3 text-sm text-gray-600">— {author}</footer>
    </blockquote>
  );
}
