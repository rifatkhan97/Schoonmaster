import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ChecklistClient from './ChecklistClient';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Task Checklist' };

export default async function ChecklistPage({ params }: { params: Promise<{ shiftId: string }> }) {
  const { shiftId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  // Fetch shift (RLS ensures cleaner can only see their own)
  const { data: shift } = await supabase
    .from('shifts')
    .select('*, site:sites(id, name, address)')
    .eq('id', shiftId)
    .eq('cleaner_id', authUser.id)
    .single();

  if (!shift) notFound();

  const site = shift.site as { id: string; name: string; address: string };

  // Fetch active checklist templates for this site, sorted
  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('site_id', site.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Fetch existing completions for this cleaner + shift
  const { data: completions } = await supabase
    .from('checklist_completions')
    .select('*')
    .eq('shift_id', shiftId)
    .eq('cleaner_id', authUser.id);

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Link href="/cleaner/schedule" className="btn btn-ghost btn-sm" style={{ padding: '0', color: 'var(--text-muted)' }}>
          ← Schedule
        </Link>
        <span className="text-muted">/</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{site.name}</span>
      </div>

      <div className="page-header">
        <h1 className="page-title">Task Checklist</h1>
        <p className="page-subtitle">
          {site.name} · {new Date(shift.starts_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}–{new Date(shift.ends_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {(templates ?? []).length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>📋</span>
          <p className="empty-state-title">No tasks defined</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Your supervisor hasn&apos;t added tasks for this site yet.
          </p>
        </div>
      ) : (
        <ChecklistClient
          shiftId={shiftId}
          templates={templates ?? []}
          initialCompletions={completions ?? []}
          siteName={site.name}
          userId={authUser.id}
          tenantId={profile.tenant_id}
        />
      )}
    </div>
  );
}
