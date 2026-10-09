'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Upload, BarChart2, Search, Columns, MessageSquare,
  UserCog, FolderOpen, Receipt, ClipboardList, Settings, ExternalLink,
  ChevronLeft, ChevronRight, Database, Globe, Activity, Bug, LineChart,
  Calculator, ShieldCheck,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS, getAdminNavItem } from '@/lib/adminNavigation.mjs';

const ICONS = {
  home: LayoutDashboard, clients: Users, uploads: Upload, datasets: Database,
  dashboards: BarChart2, explorer: Search, mapping: Columns, messages: MessageSquare,
  users: UserCog, projects: FolderOpen, invoices: Receipt, analytics: LineChart,
  tools: Calculator, monitoring: Activity, errors: Bug, audit: ClipboardList,
  settings: Settings, qa: ClipboardList, platform: ShieldCheck,
};

export default function AdminSidebar({ collapsed = false, onToggle, mobile = false }) {
  const pathname = usePathname();
  const activeHref = getAdminNavItem(pathname)?.href;
  const closeMobile = (event) => {
    const details = event.currentTarget.closest('details');
    if (details) details.open = false;
  };
  return (
    <aside className={`flex flex-col bg-gray-900 text-white ${mobile ? 'w-full max-h-[70vh]' : `hidden lg:flex sticky top-0 h-screen shrink-0 transition-[width] ${collapsed ? 'w-16' : 'w-64'}`}`}>
      {!mobile && <div className={`flex h-16 shrink-0 items-center border-b border-white/10 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-sm font-semibold">Mullen Administration</span>}
        <button onClick={onToggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} className="rounded-md p-2 text-gray-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>}
      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto p-2">
        {ADMIN_NAV_GROUPS.map((group) => <section key={group.label} aria-label={group.label} className="mb-3">
          {!collapsed && <h2 className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</h2>}
          {collapsed && group.label !== 'Overview' && <div className="my-2 border-t border-white/10" />}
          {group.items.map(({ label, href, icon, restricted }) => {
            const Icon = ICONS[icon];
            const active = activeHref === href;
            return <Link key={href} href={href} onClick={mobile ? closeMobile : undefined} aria-label={restricted ? `${label} (super admin access required)` : label} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined}
              className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-400 ${active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={17} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span>{label}{restricted && <span className="block text-[10px] text-gray-400">Super admin access required</span>}</span>}
            </Link>;
          })}
        </section>)}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-2">
        {[['/', 'Main website', Globe], ['/portal', 'Client portal', ExternalLink]].map(([href, label, Icon]) => <Link key={href} href={href} onClick={mobile ? closeMobile : undefined} aria-label={label} title={collapsed ? label : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-blue-400 ${collapsed ? 'justify-center' : ''}`}>
          <Icon size={15} aria-hidden="true" />{!collapsed && label}
        </Link>)}
      </div>
    </aside>
  );
}
