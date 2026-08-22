import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Shift } from '@/types';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isToday } from 'date-fns';

export const metadata: Metadata = { title: 'My Schedule' };

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default async function CleanerSchedulePage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const twoWeeksEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, site:sites(id, name, address, lat, lng)')
    .eq('cleaner_id', authUser.id)
    .eq('published', true)
    .gte('starts_at', weekStart.toISOString())
    .lte('starts_at', twoWeeksEnd.toISOString())
    .order('starts_at', { ascending: true });

  // Group by date
  const grouped: Record<string, (Shift & { site: { id: string; name: string; address: string; lat?: number; lng?: number } })[]> = {};
  (shifts ?? []).forEach(shift => {
    const day = format(parseISO(shift.starts_at), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(shift as typeof shift & { site: { id: string; name: string; address: string } });
  });

  const days = Object.keys(grouped).sort();

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">My Schedule</h1>
            <p className="page-subtitle">Your assigned shifts for the next 2 weeks</p>
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>📅</span>
          <p className="empty-state-title">No shifts scheduled</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Your published shifts will appear here. Contact your supervisor for scheduling.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {days.map(day => {
            const date = parseISO(day);
            const dayLabel = isToday(date) ? 'Today' : format(date, 'EEEE, d MMMM');
            const dayShifts = grouped[day];

            return (
              <div key={day}>
                {/* Day header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                }}>
                  <div style={{
                    background: isToday(date) ? 'var(--teal-500)' : 'var(--surface-2)',
                    color: isToday(date) ? 'white' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    minWidth: '2.5rem',
                    textAlign: 'center',
                  }}>
                    {format(date, 'd')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: isToday(date) ? 'var(--teal-400)' : 'var(--text-primary)' }}>
                      {dayLabel}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                      {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isToday(date) && (
                    <span className="badge badge-approved" style={{ marginLeft: 'auto' }}>Today</span>
                  )}
                </div>

                {/* Shifts for this day */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {dayShifts.map(shift => (
                    <div key={shift.id} className="shift-card" id={`shift-card-${shift.id}`}>
                      <div className="shift-time-block">
                        <div className="shift-time">{format(parseISO(shift.starts_at), 'HH:mm')}</div>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border-default)', margin: '4px auto' }} />
                        <div className="shift-time" style={{ fontSize: 'var(--text-base)' }}>
                          {format(parseISO(shift.ends_at), 'HH:mm')}
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-1)' }}>
                          {shift.site.name}
                        </div>
                        <div className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                          📍 {shift.site.address}
                        </div>
                        {shift.notes && (
                          <div style={{
                            fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                            background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                            padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)',
                          }}>
                            📝 {shift.notes}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <Link
                            href={`/cleaner/checklist/${shift.id}`}
                            className="btn btn-secondary btn-sm"
                            id={`checklist-btn-${shift.id}`}
                          >
                            ✓ Open Checklist
                          </Link>
                          <a
                            href={mapsUrl(shift.site.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            id={`navigate-btn-${shift.id}`}
                          >
                            🗺 Navigate
                          </a>
                          <Link
                            href={`/cleaner/sops/${shift.site_id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            📋 SOPs
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
