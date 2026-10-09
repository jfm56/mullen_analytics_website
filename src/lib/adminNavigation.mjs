// Shared labels and destinations for admin navigation, titles and overview links.
export const ADMIN_NAV_GROUPS = [
  { label: 'Overview', items: [{ label: 'Overview', href: '/admin', icon: 'home' }] },
  { label: 'Client work', items: [
    { label: 'Clients', href: '/admin/clients', icon: 'clients' },
    { label: 'Projects', href: '/admin/projects', icon: 'projects' },
    { label: 'Messages', href: '/admin/messages', icon: 'messages' },
    { label: 'Invoices', href: '/admin/invoices', icon: 'invoices' },
  ] },
  { label: 'Data & analytics', items: [
    { label: 'Uploads', href: '/admin/data', icon: 'uploads' },
    { label: 'Datasets & year comparisons', href: '/admin/data/datasets', icon: 'datasets' },
    { label: 'Analytics workspace', href: '/admin/dashboard', icon: 'dashboards' },
    { label: 'Data explorer', href: '/admin/data-explorer', icon: 'explorer' },
    { label: 'Column mapping', href: '/admin/column-mapping', icon: 'mapping' },
    { label: 'QA review', href: '/admin/qa', icon: 'qa' },
  ] },
  { label: 'Website activity', items: [
    { label: 'Website analytics', href: '/admin/analytics', icon: 'analytics' },
    { label: 'Tool usage', href: '/admin/tools', icon: 'tools' },
  ] },
  { label: 'Administration', items: [
    { label: 'Users & roles', href: '/admin/users', icon: 'users' },
    { label: 'Monitoring', href: '/admin/monitoring', icon: 'monitoring' },
    { label: 'Errors & issues', href: '/admin/errors', icon: 'errors' },
    { label: 'Audit logs', href: '/admin/audit-logs', icon: 'audit' },
    { label: 'Settings', href: '/admin/settings', icon: 'settings' },
    { label: 'Platform administration', href: '/admin/platform', icon: 'platform', restricted: true },
  ] },
];
export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
const EXTRA_ROUTES = [
  { prefix: '/admin/dashboards/year-over-year', label: 'Year comparison dashboard' },
  { href: '/admin/platform/qa-monitor', label: 'Platform QA monitor' },
  { href: '/admin/platform/validation', label: 'QA validation' },
  { href: '/admin/platform/system', label: 'System & features' },
  { href: '/admin/platform/audit', label: 'Platform audit' },
];
export function getAdminNavItem(pathname = '') {
  return ADMIN_NAV_ITEMS.filter(({ href }) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
export function getAdminTitle(pathname = '') {
  const match = [...ADMIN_NAV_ITEMS, ...EXTRA_ROUTES.map((item) => ({ ...item, href: item.href || item.prefix }))]
    .filter(({ href }) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label || 'Administration';
}
