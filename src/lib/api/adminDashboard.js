export async function getAdminDashboardSummary() {
  const res = await fetch('/api/proxy/admin/dashboard/summary', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to load dashboard summary (${res.status})`);
  return res.json();
}
