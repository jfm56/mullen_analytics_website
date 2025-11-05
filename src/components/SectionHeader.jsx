export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-3xl md:text-4xl font-extrabold">{title}</h2>
      {subtitle && <p className="mt-2">{subtitle}</p>}
    </div>
  );
}
