import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Link from 'next/link';

// ISR with 0s revalidation = always fresh (as per FR-206)
export const revalidate = 0;

export const metadata: Metadata = { title: 'Site SOPs' };

export default async function SopDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, sop_procedures, sop_safety, sop_dos_donts')
    .eq('id', siteId)
    .single();

  if (!site) notFound();

  const hasSop = site.sop_procedures || site.sop_safety || site.sop_dos_donts;

  const tabs = [
    { key: 'procedures', label: '🧹 Cleaning Procedures', content: site.sop_procedures },
    { key: 'safety',     label: '⚠️ Safety Protocols',    content: site.sop_safety },
    { key: 'dos_donts',  label: "✅ Do's & Don'ts",        content: site.sop_dos_donts },
  ].filter(t => t.content);

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Link href="/cleaner/sops" className="btn btn-ghost btn-sm" style={{ padding: '0', color: 'var(--text-muted)' }}>
          ← SOPs
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{site.name}</h1>
        <p className="page-subtitle">Standard Operating Procedures — Read only</p>
      </div>

      {!hasSop ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>📋</span>
          <p className="empty-state-title">No SOPs defined yet</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Your supervisor will add procedures for this site soon.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {tabs.map(tab => (
            <div key={tab.key} className="card" id={`sop-${tab.key}`}>
              <div className="card-header">
                <h2 className="card-title">{tab.label}</h2>
              </div>
              <div style={{
                fontSize: 'var(--text-sm)',
                lineHeight: 1.8,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {tab.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
