import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import type { Site } from '@/types';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Standard Operating Procedures' };

export default async function SopsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  // Get all sites with SOP content where cleaner has an upcoming shift
  const { data: shiftSites } = await supabase
    .from('shifts')
    .select('site:sites(id, name, sop_procedures, sop_safety, sop_dos_donts)')
    .eq('cleaner_id', authUser.id)
    .eq('published', true)
    .gte('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // last 7 days
    .order('starts_at', { ascending: false });

  // Deduplicate sites
  const seen = new Set<string>();
  const sites: Site[] = [];
  (shiftSites ?? []).forEach(s => {
    const site = s.site as unknown as Site;
    if (site && !seen.has(site.id)) { seen.add(site.id); sites.push(site); }
  });

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">Standard Operating Procedures</h1>
        <p className="page-subtitle">Site-specific cleaning protocols and safety guidelines</p>
      </div>

      {sites.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}>📋</span>
          <p className="empty-state-title">No SOPs available</p>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            SOPs for your assigned sites will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {sites.map(site => (
            <Link
              key={site.id}
              href={`/cleaner/sops/${site.id}`}
              className="card"
              id={`sop-site-${site.id}`}
              style={{ display: 'block' }}
            >
              <div className="flex-between">
                <div>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                    {site.name}
                  </h2>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {site.sop_procedures && <span className="badge badge-approved">Procedures</span>}
                    {site.sop_safety && <span className="badge badge-seen">Safety</span>}
                    {site.sop_dos_donts && <span className="badge badge-fulfilled">Do&apos;s & Don&apos;ts</span>}
                  </div>
                </div>
                <span style={{ color: 'var(--teal-400)', fontSize: 'var(--text-xl)' }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
