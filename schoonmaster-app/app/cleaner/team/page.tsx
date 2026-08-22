import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: "Who's on Duty" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const now = new Date().toISOString();

  // Find the cleaner's current or next active shift
  const { data: myShifts } = await supabase
    .from('shifts')
    .select('site_id, starts_at, ends_at')
    .eq('cleaner_id', authUser.id)
    .eq('published', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .limit(1);

  const activeSiteId = myShifts?.[0]?.site_id;

  // Find peers on overlapping shifts at the same site
  interface PeerShift {
    starts_at: string;
    ends_at: string;
    cleaner: { full_name: string; role: string };
    site: { name: string; address: string };
  }

  let peers: PeerShift[] = [];
  let siteName = '';

  if (activeSiteId) {
    const { data: peerShifts } = await supabase
      .from('shifts')
      .select('starts_at, ends_at, cleaner:users!cleaner_id(full_name, role), site:sites(name, address)')
      .eq('site_id', activeSiteId)
      .eq('published', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .neq('cleaner_id', authUser.id);

    peers = (peerShifts ?? []) as unknown as PeerShift[];
    siteName = (peerShifts?.[0] as unknown as PeerShift)?.site?.name ?? '';
  }

  const ROLE_LABELS: Record<string, string> = {
    ADM: 'Administrator', MGR: 'Supervisor', CLN: 'Field Technician', AUD: 'Auditor',
  };

  return (
    <div style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <h1 className="page-title">Who&apos;s on Duty</h1>
        <p className="page-subtitle">Colleagues working at your current site</p>
      </div>

      {!activeSiteId ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>👥</span>
          <p className="empty-state-title">No active shift</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Peer technicians will appear here during your active shift window.
          </p>
        </div>
      ) : peers.length === 0 ? (
        <div>
          <div className="card-highlight" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>📍</div>
            <div style={{ fontWeight: 700, color: 'var(--teal-400)' }}>{siteName}</div>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>You&apos;re active at this site</div>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <span style={{ fontSize: '2.5rem' }}>🧹</span>
            <p className="empty-state-title">You&apos;re the only one here</p>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>No other technicians are assigned to this site right now.</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="card-highlight" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>📍</div>
            <div style={{ fontWeight: 700, color: 'var(--teal-400)' }}>{siteName}</div>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
              {peers.length + 1} technician{peers.length !== 0 ? 's' : ''} on duty
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {peers.map((peer, i) => {
              const initials = peer.cleaner.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div className="avatar" style={{ width: '3rem', height: '3rem', fontSize: 'var(--text-base)' }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{peer.cleaner.full_name}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{ROLE_LABELS[peer.cleaner.role] ?? peer.cleaner.role}</div>
                  </div>
                  <span className={`badge badge-role-${peer.cleaner.role}`} style={{ marginLeft: 'auto' }}>
                    On duty
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
