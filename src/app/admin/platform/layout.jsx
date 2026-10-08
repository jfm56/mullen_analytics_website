'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Building2, LayoutGrid, ListChecks, FlaskConical, Activity, History, Eye } from 'lucide-react';
import { platformAdmin } from '@/lib/api';

const NAV = [
  ['/admin/platform', 'Overview', LayoutGrid],
  ['/admin/platform/qa-monitor', 'QA Monitor', ListChecks],
  ['/admin/platform/validation', 'QA Validation', FlaskConical],
  ['/admin/platform/system', 'System & Features', Activity],
  ['/admin/platform/audit', 'Audit', History],
];

export default function PlatformLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState({ loading: true, allowed: false });
  const [agencies, setAgencies] = useState([]);
  const [selected, setSelected] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const me = await platformAdmin.me();
        if (!me.super_admin) { setState({ loading: false, allowed: false }); return; }
        const a = await platformAdmin.agencies();
        setAgencies(a.agencies || []);
        setState({ loading: false, allowed: true, email: me.email, env: me.environment });
      } catch { setState({ loading: false, allowed: false }); }
    })();
    try { setSelected(localStorage.getItem('platform_agency') || 'all'); } catch {}
  }, []);

  const onSwitch = useCallback(async (val) => {
    setSelected(val);
    try { localStorage.setItem('platform_agency', val); } catch {}
    if (val !== 'all') {
      try { await platformAdmin.viewAs(val); } catch {}
    }
  }, []);

  if (state.loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-gray-400">Loading platform…</div>;
  if (!state.allowed) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <ShieldAlert className="w-10 h-10 mx-auto text-rose-500 mb-2" />
      <h1 className="text-lg font-bold text-gray-900">Platform admin only</h1>
      <p className="text-sm text-gray-500 mt-1">This area requires the SUPER_ADMIN platform role.</p>
    </div>
  );

  const agency = agencies.find((a) => a.id === selected);
  const viewing = selected === 'all' ? 'All Agencies' : (agency ? agency.name : 'Agency');

  return (
    <div>
      <div className="flex items-center justify-between gap-3 bg-indigo-900 text-white px-4 py-2 text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          MULLEN PLATFORM ADMIN — {selected === 'all' ? 'All Agencies' : `Viewing ${viewing}`}
          {state.env && <span className="text-indigo-300 text-xs font-normal">· {state.env}</span>}
        </span>
        <span className="inline-flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-300" />
          <select value={selected} onChange={(e) => onSwitch(e.target.value)}
            className="bg-indigo-800 border border-indigo-700 rounded px-2 py-1 text-white text-xs">
            <option value="all">All Agencies</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.classification})</option>)}
          </select>
        </span>
      </div>

      {selected !== 'all' && agency && (
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800">
          <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> VIEW-AS — {agency.name} / Agency Admin · read-only by default</span>
          <span className="flex items-center gap-2">
            <Link href={`/admin/qa?agency=${agency.id}`} className="underline">Open QA Review</Link>
            <button onClick={() => onSwitch('all')} className="underline">Exit View-As</button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b px-4">
        {NAV.map(([href, label, Icon]) => (
          <Link key={href} href={href}
            className={`inline-flex items-center gap-1 text-sm px-3 py-2 border-b-2 -mb-px ${pathname === href ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
