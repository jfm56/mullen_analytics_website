'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Upload, BarChart2, Search,
  Columns, MessageSquare, UserCog, FolderOpen, Receipt,
  ClipboardList, Settings, ExternalLink, ChevronLeft, ChevronRight, Database, Globe, Activity, Bug, LineChart, Calculator,
} from 'lucide-react';

const NAV = [
  { label: 'Home',           href: '/admin',               Icon: LayoutDashboard },
  { label: 'Clients',        href: '/admin/clients',        Icon: Users },
  { label: 'Data Uploads',   href: '/admin/data',           Icon: Upload },
  { label: 'Datasets (YoY)', href: '/admin/data/datasets',  Icon: Database },
  { label: 'Dashboards',     href: '/admin/dashboard',      Icon: BarChart2 },
  { label: 'Data Explorer',  href: '/admin/data-explorer',  Icon: Search },
  { label: 'Column Mapping', href: '/admin/column-mapping', Icon: Columns },
  { label: 'Messages',       href: '/admin/messages',       Icon: MessageSquare },
  { label: 'Users & Roles',  href: '/admin/users',          Icon: UserCog },
  { label: 'Projects',       href: '/admin/projects',       Icon: FolderOpen },
  { label: 'Invoices',       href: '/admin/invoices',       Icon: Receipt },
  { label: 'Analytics',      href: '/admin/analytics',      Icon: LineChart },
  { label: 'Tool Usage',     href: '/admin/tools',          Icon: Calculator },
  { label: 'Monitoring',     href: '/admin/monitoring',     Icon: Activity },
  { label: 'Errors & Issues',href: '/admin/errors',         Icon: Bug },
  { label: 'Audit Logs',     href: '/admin/audit-logs',     Icon: ClipboardList },
  { label: 'Settings',       href: '/admin/settings',       Icon: Settings },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{ backgroundColor: '#111827', color: '#ffffff' }}
      className={`flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen flex-shrink-0`}
    >
      {/* Logo / toggle */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        className={`flex items-center h-14 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}
      >
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight truncate">
            Mullen Analytics
          </span>
        )}
        <button
          onClick={onToggle}
          style={{ color: 'rgba(255,255,255,0.6)' }}
          className="p-1.5 rounded-md transition-colors hover:bg-white/10"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-2 overflow-y-auto px-2 space-y-0.5`}>
        {NAV.map(({ label, href, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                backgroundColor: active ? '#2563eb' : 'transparent',
                color: '#ffffff',
                opacity: active ? 1 : 0.75,
              }}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-100 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} className="px-2 py-3 space-y-0.5">
        <Link
          href="/"
          title={collapsed ? 'Main site' : undefined}
          style={{ color: 'rgba(255,255,255,0.6)' }}
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-colors hover:bg-white/10 hover:opacity-100 ${collapsed ? 'justify-center' : ''}`}
        >
          <Globe size={15} className="flex-shrink-0" />
          {!collapsed && <span>Main site</span>}
        </Link>
        <Link
          href="/portal"
          title={collapsed ? 'Client Portal' : undefined}
          style={{ color: 'rgba(255,255,255,0.6)' }}
          className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-colors hover:bg-white/10 hover:opacity-100 ${collapsed ? 'justify-center' : ''}`}
        >
          <ExternalLink size={15} className="flex-shrink-0" />
          {!collapsed && <span>Client Portal</span>}
        </Link>
      </div>
    </aside>
  );
}
