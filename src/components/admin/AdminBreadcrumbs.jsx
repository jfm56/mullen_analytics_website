'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS = {
  admin:          'Admin',
  clients:        'Clients',
  data:           'Data Uploads',
  dashboard:      'Dashboards',
  'data-explorer':'Data Explorer',
  'column-mapping':'Column Mapping',
  messages:       'Messages',
  users:          'Users & Roles',
  projects:       'Projects',
  invoices:       'Invoices',
  'audit-logs':   'Audit Logs',
  settings:       'Settings',
  uploads:        'Uploads',
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => ({
    label: LABELS[seg] || (seg.length > 20 ? seg.slice(0, 8) + '…' : seg),
    href:  '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-500 mb-4">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">/</span>}
          {c.isLast ? (
            <span className="text-gray-700 font-medium">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-blue-600 transition-colors">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
