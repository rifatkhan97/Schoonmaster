import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { DashboardKPIs, Incident, MaterialRequest, AuditLog } from '@/types';
import { format, parseISO } from 'date-fns';

export const metadata: Metadata = { title: 'Operations Dashboard' };

const STATUS_BADGE: Record<string, string> = {
  SENT: 'badge-sent', SEEN: 'badge-seen', RESOLVED: 'badge-resolved',
  PENDING: 'badge-pending', APPROVED: 'badge-approved',
  PARTIALLY_APPROVED: 'badge-partial', REJECTED: 'badge-rejected', FULFILLED: 'badge-fulfilled',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const tid = profile.tenant_id;

  // Parallel KPI queries
  const [
    { count: activeProjects },
    { count: totalStaff },
    { count: pendingSupplies },
    { count: unresolvedIncidents },
    { data: recentIncidents },
    { data: recentRequests },
    { data: recentAuditLogs },
  ] = await Promise.all([
    supabase.from('sites').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', true),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', true),
    supabase.from('material_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'PENDING'),
    supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).in('status', ['SENT', 'SEEN']),
    supabase.from('incidents').select('*, cleaner:users!cleaner_id(full_name), site:sites(name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    supabase.from('material_requests').select('*, cleaner:users!cleaner_id(full_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select('*, user:users(full_name)').eq('tenant_id', tid).order('created_at', { ascending: false }).limit(6),
  ]);

  const kpis: DashboardKPIs = {
    active_projects: activeProjects ?? 0,
    total_staff: totalStaff ?? 0,
    pending_supply_requests: pendingSupplies ?? 0,
    unresolved_incidents: unresolvedIncidents ?? 0,
  };

  const kpiCards = [
    { label: 'Active Projects',      value: kpis.active_projects,          icon: '🏢', color: 'var(--teal-500)',     href: '/admin/sites' },
    { label: 'Total Staff',          value: kpis.total_staff,              icon: '👥', color: 'var(--brand-300)',    href: '/admin/users' },
    { label: 'Pending Supplies',     value: kpis.pending_supply_requests,  icon: '📦', color: 'var(--accent-orange)', href: '/admin/inventory' },
    { label: 'Unresolved Incidents', value: kpis.unresolved_incidents,     icon: '⚠️', color: 'var(--accent-red)',   href: '/admin/incidents' },
  ];

  return (
    <div style={{ maxWidth: 'var(--content-max-width)' }}>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Operations Dashboard</h1>
            <p className="page-subtitle">Real-time overview of field operations — {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          </div>
          <Link href="/admin/scheduler" className="btn btn-primary">
            + New Shift
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {kpiCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="kpi-card"
            id={`kpi-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
            style={{ '--kpi-color': card.color, display: 'block', textDecoration: 'none' } as React.CSSProperties}
          >
            <div className="kpi-icon-wrapper">
              <span style={{ fontSize: '1.375rem' }}>{card.icon}</span>
            </div>
            <div className="kpi-value">{card.value}</div>
            <div className="kpi-label">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Two-column activity feeds */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Recent Incidents */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚠️ Recent Incidents</h2>
            <Link href="/admin/incidents" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-400)' }}>View all</Link>
          </div>
          {(recentIncidents ?? []).length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
              No incidents reported
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(recentIncidents as (Incident & { cleaner: { full_name: string }; site: { name: string } | null })[]).map(inc => (
                <Link
                  key={inc.id}
                  href={`/admin/incidents/${inc.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', transition: 'background var(--transition-fast)' }}
                  id={`dashboard-incident-${inc.id}`}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.cleaner?.full_name}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {inc.category.replace(/_/g, ' ')} {inc.site ? `· ${inc.site.name}` : ''}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {format(parseISO(inc.created_at), 'd MMM · HH:mm')}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[inc.status]}`}>{inc.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Supply Requests */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📦 Supply Requests</h2>
            <Link href="/admin/inventory" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-400)' }}>View all</Link>
          </div>
          {(recentRequests ?? []).length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
              No supply requests
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {(recentRequests as (MaterialRequest & { cleaner: { full_name: string } })[]).map(req => (
                <div
                  key={req.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)' }}
                  id={`dashboard-request-${req.id}`}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{req.cleaner?.full_name}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {req.items.length} item{req.items.length !== 1 ? 's' : ''} · {format(parseISO(req.created_at), 'd MMM · HH:mm')}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[req.status]}`}>{req.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Feed */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Recent Audit Events</h2>
          <Link href="/admin/audit" className="btn btn-ghost btn-sm" style={{ color: 'var(--teal-400)' }}>Full log</Link>
        </div>
        {(recentAuditLogs ?? []).length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>No audit events</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {(recentAuditLogs as (AuditLog & { user: { full_name: string } | null })[]).map(log => (
                  <tr key={log.id} id={`audit-row-${log.id}`}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {format(parseISO(log.created_at), 'dd/MM HH:mm:ss')}
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)' }}>{log.user?.full_name ?? 'System'}</td>
                    <td>
                      <span className="badge badge-seen" style={{ fontSize: '0.65rem' }}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.payload).slice(0, 60)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
