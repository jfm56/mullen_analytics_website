'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

const NAV = [
  { label: 'Home',          href: '/admin',                     icon: '🏠' },
  { label: 'Clients',       href: '/admin/clients',             icon: '🏢' },
  { label: 'Data Uploads',  href: '/admin/data',                icon: '📤' },
  { label: 'Dashboards',    href: '/admin/dashboard',           icon: '📊' },
  { label: 'Data Explorer', href: '/admin/data-explorer',       icon: '🔍' },
  { label: 'Column Mapping',href: '/admin/column-mapping',      icon: '🗂️' },
  { label: 'Messages',      href: '/admin/messages',            icon: '💬' },
  { label: 'Users & Roles', href: '/admin/users',               icon: '👥' },
  { label: 'Projects',      href: '/admin/projects',            icon: '📁' },
  { label: 'Invoices',      href: '/admin/invoices',            icon: '💰' },
  { label: 'Audit Logs',    href: '/admin/audit-logs',          icon: '📋' },
  { label: 'Settings',      href: '/admin/settings',            icon: '⚙️' },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-56'
      } min-h-screen flex-shrink-0`}
    >
      {/* Logo / toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-700">
        {!collapsed && (
          <span className="font-bold text-sm text-white tracking-tight truncate">
            Mullen Analytics
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ml-auto"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-3 py-3">
        <Link
          href="/portal"
          className="flex items-center gap-3 px-2 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
          title={collapsed ? 'Client Portal' : undefined}
        >
          <span className="flex-shrink-0">↗</span>
          {!collapsed && <span>Client Portal</span>}
        </Link>
      </div>
    </aside>
  );
}
