'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_ITEMS, getAdminTitle } from '@/lib/adminNavigation.mjs';

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  if (pathname === '/admin') return null;
  // Link only to known routes: dynamic IDs and virtual path segments are not pages.
  const parents = ADMIN_NAV_ITEMS.filter(({ href }) => href !== '/admin' && pathname.startsWith(`${href}/`))
    .sort((a, b) => a.href.length - b.href.length);
  return <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
    <Link href="/admin" className="hover:text-blue-600">Overview</Link>
    {parents.map(({ href, label }) => <span key={href} className="flex items-center gap-2"><span aria-hidden="true">/</span><Link href={href} className="hover:text-blue-600">{label}</Link></span>)}
    <span aria-hidden="true">/</span>
    <span aria-current="page" className="font-medium text-gray-700">{getAdminTitle(pathname)}{parents.length > 0 ? ' details' : ''}</span>
  </nav>;
}
