'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';

interface EnrichedAnnouncement {
  id: string;
  title: string;
  body: string;
  target_role?: string;
  created_at: string;
  read_at: string | null;
}

export default function AnnouncementsClient({
  announcements: initial,
  userId,
}: {
  announcements: EnrichedAnnouncement[];
  userId: string;
}) {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleOpen(id: string) {
    setExpanded(prev => prev === id ? null : id);

    // Mark as read if not already
    const ann = announcements.find(a => a.id === id);
    if (!ann || ann.read_at) return;

    const readAt = new Date().toISOString();
    startTransition(async () => {
      await supabase.from('announcement_reads').upsert({
        announcement_id: id,
        user_id: userId,
        read_at: readAt,
      }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true });

      setAnnouncements(prev => prev.map(a =>
        a.id === id ? { ...a, read_at: readAt } : a
      ));
    });
  }

  const unreadCount = announcements.filter(a => !a.read_at).length;

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Announcements</h1>
            <p className="page-subtitle">Company-wide updates from your operations team</p>
          </div>
          {unreadCount > 0 && (
            <span className="badge badge-role-ADM" style={{ fontSize: 'var(--text-sm)', padding: '0.3rem 0.75rem' }}>
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>📢</span>
          <p className="empty-state-title">No announcements yet</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Company-wide updates will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {announcements.map(ann => {
            const isExpanded = expanded === ann.id;
            const isUnread = !ann.read_at;

            return (
              <div
                key={ann.id}
                className="card"
                id={`announcement-${ann.id}`}
                style={{
                  cursor: 'pointer',
                  borderColor: isUnread ? 'rgba(139,92,246,0.3)' : 'var(--border-subtle)',
                  background: isUnread ? 'rgba(139,92,246,0.04)' : 'var(--surface-1)',
                  transition: 'all var(--transition-base)',
                }}
                onClick={() => handleOpen(ann.id)}
                role="button"
                aria-expanded={isExpanded}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(ann.id); } }}
              >
                <div className="flex-between" style={{ gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      {isUnread && (
                        <span style={{
                          width: '0.5rem', height: '0.5rem',
                          borderRadius: '50%', background: '#8b5cf6', flexShrink: 0,
                        }} />
                      )}
                      <h3 style={{
                        fontSize: 'var(--text-base)', fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ann.title}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {format(parseISO(ann.created_at), 'd MMM yyyy · HH:mm')}
                      </span>
                      {ann.read_at && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>
                          ✓ Read {format(parseISO(ann.read_at), 'd MMM HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', transition: 'transform var(--transition-fast)', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                    →
                  </span>
                </div>

                {isExpanded && (
                  <div style={{
                    marginTop: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.8,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {ann.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
