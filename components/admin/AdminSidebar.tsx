'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard',      label: 'Dashboard',      icon: '⌂',  id: 'admin-nav-dashboard' },
      { href: '/admin/scheduler',      label: 'Scheduler',      icon: '📅', id: 'admin-nav-scheduler' },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/sites',          label: 'Sites & Projects', icon: '🏢', id: 'admin-nav-sites' },
      { href: '/admin/users',          label: 'Staff',            icon: '👥', id: 'admin-nav-users' },
      { href: '/admin/inventory',      label: 'Inventory',        icon: '📦', id: 'admin-nav-inventory' },
      { href: '/admin/incidents',      label: 'Incidents',        icon: '⚠️', id: 'admin-nav-incidents' },
      { href: '/admin/announcements',  label: 'Announcements',    icon: '📢', id: 'admin-nav-announcements' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/admin/audit',          label: 'Audit Log',        icon: '📋', id: 'admin-nav-audit' },
    ],
  },
];

export default function AdminSidebar({
  user,
  pendingIncidents = 0,
  pendingSupplies = 0,
}: {
  user: User;
  pendingIncidents?: number;
  pendingSupplies?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabels: Record<string, string> = { ADM: 'Administrator', MGR: 'Supervisor' };

  const badges: Record<string, number> = {
    '/admin/incidents': pendingIncidents,
    '/admin/inventory': pendingSupplies,
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Admin navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">S</div>
        <div>
          <div className="sidebar-logo-text">Schoon<span>master</span></div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-orange)', marginTop: '2px' }}>
            Operations Center
          </div>
        </div>
      </div>

      {NAV_SECTIONS.map(section => (
        <div key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          <ul className="sidebar-nav">
            {section.items.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const badge = badges[item.href];
              return (
                <li key={item.href} className="sidebar-nav-item">
                  <Link id={item.id} href={item.href} aria-current={isActive ? 'page' : undefined}>
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    {item.label}
                    {badge != null && badge > 0 && (
                      <span className="sidebar-nav-badge">{badge > 99 ? '99+' : badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)' }}>
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.full_name}
            </div>
            <div className={`badge badge-role-${user.role}`} style={{ marginTop: '2px' }}>
              {roleLabels[user.role] ?? user.role}
            </div>
          </div>
          <button
            id="admin-sidebar-signout"
            onClick={handleSignOut}
            className="btn btn-ghost btn-icon"
            title="Sign out"
            aria-label="Sign out"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
