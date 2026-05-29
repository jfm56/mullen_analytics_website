'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function AdminTopbar({ title, profile }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.logout?.();
    router.push('/admin/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 z-10">
      <h1 className="text-sm font-semibold text-gray-900 truncate flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          Admin
        </span>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {initials}
            </div>
            <span className="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">
              {profile?.full_name || profile?.email || 'Admin'}
            </span>
            <span className="text-gray-400 text-xs">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
