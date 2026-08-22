'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Unavailability } from '@/types';
import { format, parseISO } from 'date-fns';

const REASONS = ['Personal appointment', 'Illness', 'Family obligation', 'Holiday', 'Other'];

export default function AvailabilityClient({
  initialBlocks,
  userId,
  tenantId,
}: {
  initialBlocks: Unavailability[];
  userId: string;
  tenantId: string;
}) {
  const supabase = createClient();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dateFrom || !dateTo) { setError('Please select both start and end dates.'); return; }
    if (new Date(dateTo) <= new Date(dateFrom)) { setError('End date must be after start date.'); return; }

    const finalReason = reason === 'Other' ? customReason : reason;

    startTransition(async () => {
      const { data, error: insertError } = await supabase
        .from('unavailability')
        .insert({
          cleaner_id: userId,
          tenant_id: tenantId,
          date_from: new Date(dateFrom).toISOString(),
          date_to: new Date(dateTo + 'T23:59:59').toISOString(),
          reason: finalReason || null,
        })
        .select('*')
        .single();

      if (insertError) { setError('Failed to save. Please try again.'); return; }
      setBlocks(prev => [...prev, data].sort((a, b) => a.date_from.localeCompare(b.date_from)));
      setDateFrom(''); setDateTo(''); setReason(''); setCustomReason('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  async function handleDelete(id: string) {
    await supabase.from('unavailability').delete().eq('id', id).eq('cleaner_id', userId);
    setBlocks(prev => prev.filter(b => b.id !== id));
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <h1 className="page-title">My Availability</h1>
        <p className="page-subtitle">Mark dates you&apos;re not available to be scheduled</p>
      </div>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card-header">
          <h2 className="card-title">Add Unavailability</h2>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-green)', fontWeight: 600 }}>
              ✅ Unavailability saved. Your supervisor has been notified.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label htmlFor="avail-from" className="form-label">From</label>
              <input
                id="avail-from"
                type="date"
                className="form-input"
                value={dateFrom}
                min={todayStr}
                onChange={e => setDateFrom(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="avail-to" className="form-label">To</label>
              <input
                id="avail-to"
                type="date"
                className="form-input"
                value={dateTo}
                min={dateFrom || todayStr}
                onChange={e => setDateTo(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="avail-reason" className="form-label">Reason (optional)</label>
            <select
              id="avail-reason"
              className="form-select"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              <option value="">Select a reason…</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {reason === 'Other' && (
            <div className="form-group">
              <label htmlFor="avail-custom-reason" className="form-label">Please specify</label>
              <input
                id="avail-custom-reason"
                type="text"
                className="form-input"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Describe your reason…"
              />
            </div>
          )}
          <button id="avail-submit" type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Saving…</> : 'Mark as Unavailable'}
          </button>
        </form>
      </div>

      {/* Existing blocks */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Upcoming Unavailability</h2>
        {blocks.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <span style={{ fontSize: '2.5rem' }}>🗓</span>
            <p className="empty-state-title">All clear!</p>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>No upcoming unavailability on record.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {blocks.map(block => (
              <div key={block.id} className="card flex-between" id={`avail-block-${block.id}`}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                    {format(parseISO(block.date_from), 'd MMM yyyy')} → {format(parseISO(block.date_to), 'd MMM yyyy')}
                  </div>
                  {block.reason && <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{block.reason}</div>}
                </div>
                <button
                  onClick={() => handleDelete(block.id)}
                  className="btn btn-danger btn-sm"
                  id={`avail-delete-${block.id}`}
                  aria-label="Remove unavailability"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
