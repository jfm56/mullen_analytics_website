const BASE = '/api/proxy/settings';

export async function getAdminSettings() {
  const res = await fetch(`${BASE}/admin`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
  return res.json();
}

export async function updateAdminSettings(updates) {
  const res = await fetch(`${BASE}/admin`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Save failed (${res.status})`);
  }
  return res.json();
}

export async function resetAdminSettingsToDefaults() {
  const res = await fetch(`${BASE}/admin/reset`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Reset failed (${res.status})`);
  return res.json();
}

export async function runSettingsHealthCheck() {
  const res = await fetch(`${BASE}/admin/health`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function getPublicPortalSettings() {
  const res = await fetch(`${BASE}/public`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load portal settings (${res.status})`);
  return res.json();
}
