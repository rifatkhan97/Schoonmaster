import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SuppliesClient from './SuppliesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Request Supplies' };

export default async function SuppliesPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const { data: catalog } = await supabase
    .from('material_catalog')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('name');

  const { data: requests } = await supabase
    .from('material_requests')
    .select('*')
    .eq('cleaner_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <SuppliesClient
      catalog={catalog ?? []}
      initialRequests={requests ?? []}
      userId={authUser.id}
      tenantId={profile.tenant_id}
    />
  );
}
