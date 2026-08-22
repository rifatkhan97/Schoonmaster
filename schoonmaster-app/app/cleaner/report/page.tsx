import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportClient from './ReportClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Report Issue' };

export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address, tenant_id, is_active, created_at, updated_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('name');

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('cleaner_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <ReportClient
      sites={sites ?? []}
      initialIncidents={incidents ?? []}
      userId={authUser.id}
      tenantId={profile.tenant_id}
    />
  );
}
