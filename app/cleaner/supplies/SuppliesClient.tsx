'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MaterialCatalogItem, MaterialRequest } from '@/types';
import { format, parseISO } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  PARTIALLY_APPROVED: 'Partially Approved',
  REJECTED: 'Rejected',
  FULFILLED: 'Fulfilled',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  PARTIALLY_APPROVED: 'badge-partial',
  REJECTED: 'badge-rejected',
  FULFILLED: 'badge-fulfilled',
};

export default function SuppliesClient({
  catalog,
  initialRequests,
  userId,
  tenantId,
}: {
  catalog: MaterialCatalogItem[];
  initialRequests: MaterialRequest[];
  userId: string;
  tenantId: string;
}) {
  const supabase = createClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();

  const selectedItems = catalog.filter(item => (quantities[item.id] ?? 0) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedItems.length === 0) { setError('Please select at least one item.'); return; }

    startTransition(async () => {
      const items = selectedItems.map(item => ({
        catalog_id: item.id,
        name: item.name,
        unit: item.unit,
        quantity_requested: quantities[item.id],
        quantity_approved: null,
        approved: null,
      }));

      const { data, error: insertError } = await supabase
        .from('material_requests')
        .insert({ cleaner_id: userId, tenant_id: tenantId, items, notes, status: 'PENDING' })
        .select('*')
        .single();

      if (insertError) { setError('Failed to submit request. Please try again.'); return; }

      setRequests(prev => [data, ...prev]);
      setQuantities({});
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">Request Supplies</h1>
        <p className="page-subtitle">Select items from the inventory catalog and submit a request</p>
      </div>

      {/* Request Form */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card-header">
          <h2 className="card-title">New Request</h2>
          {selectedItems.length > 0 && (
            <span className="badge badge-approved">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-green)', fontWeight: 600 }}>
              ✅ Request submitted successfully!
            </div>
          )}

          {/* Catalog grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {catalog.map(item => {
              const qty = quantities[item.id] ?? 0;
              const selected = qty > 0;
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    border: selected ? '1px solid var(--teal-500)' : '1px solid var(--border-subtle)',
                    background: selected ? 'rgba(20,201,184,0.05)' : 'var(--surface-1)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>{item.name}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>Unit: {item.unit}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setQuantities(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))}
                      id={`qty-dec-${item.id}`}
                      style={{ width: '2rem', padding: '0', flexShrink: 0 }}
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={qty || ''}
                      placeholder="0"
                      onChange={e => setQuantities(prev => ({ ...prev, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="form-input"
                      id={`qty-input-${item.id}`}
                      style={{ textAlign: 'center', padding: '0.375rem var(--space-2)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))}
                      id={`qty-inc-${item.id}`}
                      style={{ width: '2rem', padding: '0', flexShrink: 0 }}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label htmlFor="supply-notes" className="form-label">Notes (optional)</label>
            <textarea
              id="supply-notes"
              className="form-textarea"
              placeholder="Any additional details about your request…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            id="supply-submit"
            type="submit"
            className="btn btn-primary"
            disabled={isPending || selectedItems.length === 0}
          >
            {isPending ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Submitting…</> : `Submit Request (${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''})`}
          </button>
        </form>
      </div>

      {/* Request History */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Request History</h2>
        {requests.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <span style={{ fontSize: '2.5rem' }}>📦</span>
            <p className="empty-state-title">No requests yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {requests.map(req => (
              <div key={req.id} className="card" id={`request-${req.id}`}>
                <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {format(parseISO(req.created_at), 'd MMM yyyy · HH:mm')}
                    </span>
                  </div>
                  <span className={`badge ${STATUS_BADGE[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {req.items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-sm)',
                    }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="text-muted">{item.quantity_requested} {item.unit}</span>
                        {item.quantity_approved !== null && item.quantity_approved !== undefined && (
                          <span style={{ color: item.approved ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                            {item.approved ? `✓ ${item.quantity_approved}` : '✗ Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {req.notes && (
                  <div className="text-muted" style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                    📝 {req.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
