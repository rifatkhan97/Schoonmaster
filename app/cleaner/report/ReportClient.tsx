'use client';

import { useState, useTransition, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Incident, Site } from '@/types';
import { format, parseISO } from 'date-fns';

const CATEGORIES = [
  { value: 'EQUIPMENT_BROKEN',    label: 'Equipment Broken',     icon: '🔧' },
  { value: 'MISSING_KEY_ACCESS',  label: 'Missing Key / Access',  icon: '🔑' },
  { value: 'SAFETY_CONCERN',      label: 'Safety Concern',        icon: '⚠️' },
  { value: 'AREA_INACCESSIBLE',   label: 'Area Inaccessible',     icon: '🚫' },
  { value: 'OTHER',               label: 'Other',                 icon: '📝' },
];

const STATUS_BADGE: Record<string, string> = {
  SENT: 'badge-sent', SEEN: 'badge-seen', RESOLVED: 'badge-resolved',
};

export default function ReportClient({
  sites,
  initialIncidents,
  userId,
  tenantId,
}: {
  sites: Site[];
  initialIncidents: Incident[];
  userId: string;
  tenantId: string;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState('');
  const [siteId, setSiteId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [isPending, startTransition] = useTransition();

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be smaller than 10MB.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Only JPEG and PNG images are accepted.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) { setError('Please select an incident category.'); return; }

    startTransition(async () => {
      let imageUrl: string | undefined;
      if (imageFile) {
        const ext = imageFile.type === 'image/png' ? 'png' : 'jpg';
        const path = `incidents/${tenantId}/${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('incident-images')
          .upload(path, imageFile, { contentType: imageFile.type });
        if (uploadError) { setError('Image upload failed. Please try again.'); return; }
        const { data: { publicUrl } } = supabase.storage.from('incident-images').getPublicUrl(path);
        imageUrl = publicUrl;
      }

      const retentionDays = parseInt(process.env.NEXT_PUBLIC_INCIDENT_PHOTO_RETENTION_DAYS ?? '365');
      const imageExpires = imageUrl
        ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error: insertError } = await supabase
        .from('incidents')
        .insert({
          cleaner_id: userId,
          tenant_id: tenantId,
          site_id: siteId || null,
          category,
          notes: notes || null,
          image_url: imageUrl ?? null,
          image_expires_at: imageExpires,
          status: 'SENT',
        })
        .select('*')
        .single();

      if (insertError) { setError('Failed to submit report. Please try again.'); return; }
      setIncidents(prev => [data, ...prev]);
      setCategory(''); setSiteId(''); setNotes(''); setImageFile(null); setImagePreview(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    });
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <h1 className="page-title">Report Issue</h1>
        <p className="page-subtitle">Submit a field incident report from your current site</p>
      </div>

      {/* Report Form */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card-header">
          <h2 className="card-title">New Incident Report</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--accent-green)', fontWeight: 600 }}>
              ✅ Incident report submitted. Your supervisor has been notified.
            </div>
          )}

          {/* Category selector */}
          <div className="form-group">
            <label className="form-label">Incident Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-2)' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  id={`category-${cat.value.toLowerCase()}`}
                  className="incident-category"
                  style={{
                    background: category === cat.value ? 'rgba(249,115,22,0.1)' : 'var(--surface-2)',
                    borderColor: category === cat.value ? 'var(--accent-orange)' : 'var(--border-default)',
                    color: category === cat.value ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  }}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Site selector */}
          {sites.length > 0 && (
            <div className="form-group">
              <label htmlFor="incident-site" className="form-label">Related Site (optional)</label>
              <select
                id="incident-site"
                className="form-select"
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
              >
                <option value="">Select a site…</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="incident-notes" className="form-label">Additional Notes (optional)</label>
            <textarea
              id="incident-notes"
              className="form-textarea"
              placeholder="Describe the issue in detail…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Image upload */}
          <div className="form-group">
            <label className="form-label">Attach Photo (optional · JPEG/PNG · max 10MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              style={{ display: 'none' }}
              id="incident-image"
            />
            {imagePreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="btn btn-danger btn-sm"
                  style={{ position: 'absolute', top: '8px', right: '8px' }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn btn-secondary"
                id="image-upload-btn"
                style={{ width: '100%', padding: 'var(--space-6)', border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)' }}
              >
                📷 Tap to attach photo
              </button>
            )}
          </div>

          <button
            id="report-submit"
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !category}
          >
            {isPending ? <><span className="spinner" style={{ width: '1rem', height: '1rem' }} /> Submitting…</> : '⚠️ Submit Report'}
          </button>
        </form>
      </div>

      {/* Incident History */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>My Reports</h2>
        {incidents.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <span style={{ fontSize: '2.5rem' }}>📋</span>
            <p className="empty-state-title">No reports yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {incidents.map(inc => {
              const cat = CATEGORIES.find(c => c.value === inc.category);
              return (
                <div key={inc.id} className="card" id={`incident-${inc.id}`}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 600 }}>{cat?.icon} {cat?.label}</span>
                    <span className={`badge ${STATUS_BADGE[inc.status]}`}>{inc.status}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {format(parseISO(inc.created_at), 'd MMM yyyy · HH:mm')}
                  </div>
                  {inc.notes && <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{inc.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
