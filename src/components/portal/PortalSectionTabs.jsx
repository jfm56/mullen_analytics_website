'use client';
import Link from 'next/link';

// Shared section navigation for the client portal's workspace pages.
// Replaces the tab row that was duplicated verbatim across uploads / invoices /
// reports / messages. `active` is one of the tab ids below.
const TABS = [
  { id: 'home',     label: 'Home',                      href: '/portal' },
  { id: 'uploads',  label: 'Upload data',               href: '/portal/uploads' },
  { id: 'invoices', label: 'View & pay invoices',       href: '/portal/invoices' },
  { id: 'reports',  label: 'Dashboards & deliverables', href: '/portal/reports' },
  { id: 'messages', label: 'Messages',                  href: '/portal/messages' },
];

export default function PortalSectionTabs({ active, unread = 0 }) {
  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const isMessages = tab.id === 'messages';
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${isMessages ? 'ml-auto' : ''} inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                isActive
                  ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'border-transparent text-gray-500 hover:text-[var(--brand-primary)] hover:border-gray-300'
              }`}
            >
              {tab.label}
              {isMessages && unread > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] min-w-4 h-4 px-1">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
