import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Shift, MaterialRequest, Announcement } from '@/types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

export const metadata: Metadata = { title: 'Dashboard' };

function formatShiftDay(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE d MMM');
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default async function CleanerDashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const authUser = data?.user;
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users').select('*, tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const now = new Date().toISOString();

  // Upcoming shifts (next 7 days)
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, site:sites(id, name, address, lat, lng)')
    .eq('cleaner_id', authUser.id)
    .eq('published', true)
    .gte('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(5);

  // Current/active shift
  const { data: activeShifts } = await supabase
    .from('shifts')
    .select('*, site:sites(id, name, address)')
    .eq('cleaner_id', authUser.id)
    .eq('published', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .limit(1);

  const activeShift = activeShifts?.[0] as (Shift & { site: { id: string; name: string; address: string } }) | null;

  // Pending material requests
  const { count: pendingRequests } = await supabase
    .from('material_requests')
    .select('id', { count: 'exact', head: true })
    .eq('cleaner_id', authUser.id)
    .in('status', ['PENDING', 'APPROVED']);

  // Unread announcements
  const { data: latestAnnouncement } = await supabase
    .from('announcements')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .or(`target_role.is.null,target_role.eq.CLN`)
    .not('id', 'in', `(SELECT announcement_id FROM announcement_reads WHERE user_id = '${authUser.id}')`)
    .order('created_at', { ascending: false })
    .limit(1);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { href: '/cleaner/schedule',       icon: '📅', label: 'My Schedule',     color: '#14c9b8' },
    { href: '/cleaner/supplies',       icon: '📦', label: 'Request Supplies', color: '#f97316' },
    { href: '/cleaner/report',         icon: '⚠️', label: 'Report Issue',     color: '#ef4444' },
    { href: '/cleaner/announcements',  icon: '📢', label: 'Announcements',    color: '#8b5cf6' },
    { href: '/cleaner/availability',   icon: '🗓', label: 'My Availability',  color: '#3a75c4' },
    { href: '/cleaner/team',           icon: '👥', label: "Who's on Duty",    color: '#22c55e' },
  ];

  return (
    <div style={{ maxWidth: 'var(--content-max-width)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">{greeting()}, {profile.full_name.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="card-highlight animate-slide-up" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--teal-400)',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  <span className="status-dot" style={{ background: 'var(--teal-400)', animation: 'pulse-ring 1.5s infinite' }} />
                  Active Shift
                </span>
              </div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                {activeShift.site.name}
              </h2>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{activeShift.site.address}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Link href={`/cleaner/checklist/${activeShift.id}`} className="btn btn-primary">
                Open Checklist
              </Link>
              <a
                href={mapsUrl(activeShift.site.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                id="active-shift-navigate"
              >
                🗺 Navigate
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Latest Announcement */}
      {latestAnnouncement?.[0] && (
        <Link
          href="/cleaner/announcements"
          className="card"
          style={{
            display: 'block',
            marginBottom: 'var(--space-6)',
            borderColor: 'rgba(139,92,246,0.3)',
            background: 'rgba(139,92,246,0.06)',
          }}
          id="dashboard-announcement-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>📢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  New Announcement
                </span>
              </div>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(latestAnnouncement[0] as Announcement).title}
              </div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-lg)' }}>→</span>
          </div>
        </Link>
      )}

      {/* Stats Row */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--teal-500)' } as React.CSSProperties}>
          <div className="kpi-value">{(shifts ?? []).length}</div>
          <div className="kpi-label">Upcoming shifts</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-orange)' } as React.CSSProperties}>
          <div className="kpi-value">{pendingRequests ?? 0}</div>
          <div className="kpi-label">Pending requests</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-purple)' } as React.CSSProperties}>
          <div className="kpi-value">{latestAnnouncement?.length ?? 0}</div>
          <div className="kpi-label">Unread updates</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
        <div className="grid-3">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="card stagger-item animate-slide-up"
              id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                textDecoration: 'none',
                transition: 'all var(--transition-base)',
              }}
            >
              <span style={{
                fontSize: '1.5rem',
                width: '2.75rem', height: '2.75rem',
                background: `${action.color}18`,
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {action.icon}
              </span>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div>
        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Upcoming Shifts</h2>
          <Link href="/cleaner/schedule" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-400)' }}>
            View all →
          </Link>
        </div>

        {(shifts ?? []).length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <span className="empty-state-icon">📅</span>
            <p className="empty-state-title">No upcoming shifts</p>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              Your next assignments will appear here when published.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {(shifts as (Shift & { site: { id: string; name: string; address: string } })[]).map(shift => (
              <div key={shift.id} className="shift-card stagger-item animate-slide-up">
                {/* Time block */}
                <div className="shift-time-block">
                  <div className="shift-time">{format(parseISO(shift.starts_at), 'HH:mm')}</div>
                  <div className="shift-date">{formatShiftDay(shift.starts_at)}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                    {format(parseISO(shift.starts_at), 'HH:mm')}–{format(parseISO(shift.ends_at), 'HH:mm')}
                  </div>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-1)' }}>
                    {shift.site.name}
                  </div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                    📍 {shift.site.address}
                  </div>
                  {shift.notes && (
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2) var(--space-3)',
                      marginBottom: 'var(--space-3)',
                    }}>
                      📝 {shift.notes}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link href={`/cleaner/checklist/${shift.id}`} className="btn btn-secondary btn-sm">
                      Checklist
                    </Link>
                    <a
                      href={mapsUrl(shift.site.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      id={`shift-navigate-${shift.id}`}
                    >
                      🗺 Navigate
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
