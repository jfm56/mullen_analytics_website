import Link from 'next/link';
import { Upload, Database, Search, Columns, ClipboardList, ArrowRight } from 'lucide-react';

const WORKSPACES = [
  { href: '/admin/data', title: 'Uploads', description: 'Choose a client, upload data and review processing status.', Icon: Upload },
  { href: '/admin/data/datasets', title: 'Datasets & year comparisons', description: 'Group client uploads and open year-over-year dashboards.', Icon: Database },
  { href: '/admin/data-explorer', title: 'Data explorer', description: 'Inspect cleaned data, filters and upload-level analytics.', Icon: Search },
  { href: '/admin/column-mapping', title: 'Column mapping', description: 'Review source columns and resolve mapping issues.', Icon: Columns },
  { href: '/admin/qa', title: 'QA review', description: 'Open the existing agency chart-review workflow.', Icon: ClipboardList },
];

export default function AdminDashboardPage() {
  return <div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Analytics workspace</h1>
      <p className="mt-2 text-sm text-gray-500">Start with a client upload or dataset to open its analytics. Website traffic has its own section in navigation.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      {WORKSPACES.map(({ href, title, description, Icon }) => <Link key={href} href={href} className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600">
        <div className="mb-3 flex items-center justify-between"><Icon size={22} className="text-blue-600" aria-hidden="true" /><ArrowRight size={17} className="text-gray-400 group-hover:text-blue-600" aria-hidden="true" /></div>
        <h2 className="font-semibold text-gray-900">{title}</h2><p className="mt-2 text-sm text-gray-500">{description}</p>
      </Link>)}
    </div>
  </div>;
}
