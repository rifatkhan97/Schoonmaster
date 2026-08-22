'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

const NAV_ITEMS = [
  { href: '/cleaner/dashboard',      label: 'Dashboard',     icon: '⌂', id: 'nav-dashboard' },
  { href: '/cleaner/schedule',       label: 'Schedule',      icon: '📅', id: 'nav-schedule' },
  { href: '/cleaner/checklist',      label: 'Checklists',    icon: '✓',  id: 'nav-checklists' },
  { href: '/cleaner/supplies',       label: 'Supplies',      icon: '📦', id: 'nav-supplies' },
  { href: '/cleaner/availability',   label: 'Availability',  icon: '🗓', id: 'nav-availability' },
  { href: '/cleaner/report',         label: 'Report',        icon: '⚠',  id: 'nav-report' },
  { href: '/cleaner/sops',           label: 'SOPs',          icon: '📋', id: 'nav-sops' },
  { href: '/cleaner/announcements',  label: 'Updates',       icon: '📢', id: 'nav-announcements' },
  { href: '/cleaner/team',           label: 'Team',          icon: '👥', id: 'nav-team' },
];

const BOTTOM_NAV = [
  { href: '/cleaner/dashboard',     label: 'Home',      icon: '⌂' },
  { href: '/cleaner/schedule',      label: 'Shifts',    icon: '📅' },
  { href: '/cleaner/report',        label: 'Report',    icon: '⚠' },
  { href: '/cleaner/supplies',      label: 'Supplies',  icon: '📦' },
  { href: '/cleaner/announcements', label: 'Updates',   icon: '📢' },
];

export default function CleanerSidebar({ user, unreadCount = 0 }: { user: User; unreadCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar" role="navigation" aria-label="Cleaner navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">S</div>
          <div className="sidebar-logo-text">
            Schoon<span>master</span>
          </div>
        </div>

        <div className="sidebar-section-label">Operations</div>

        <ul className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isAnnouncement = item.href.includes('announcements');
            return (
              <li key={item.href} className="sidebar-nav-item">
                <Link
                  id={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                  {isAnnouncement && unreadCount > 0 && (
                    <span className="sidebar-nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)' }}>
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </div>
              <div className="badge badge-role-CLN" style={{ marginTop: '2px' }}>Cleaner</div>
            </div>
            <button
              id="sidebar-signout"
              onClick={handleSignOut}
              className="btn btn-ghost btn-icon"
              title="Sign out"
              aria-label="Sign out"
              style={{ fontSize: '1rem' }}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav" role="navigation" aria-label="Mobile navigation">
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isAnnouncement = item.href.includes('announcements');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="bottom-nav-icon" style={{ position: 'relative' }}>
                  {item.icon}
                  {isAnnouncement && unreadCount > 0 && (
                    <span className="cart-badge" style={{ background: 'var(--accent-red)' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
