import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AvailabilityClient from './AvailabilityClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Availability' };

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const { data: unavailabilities } = await supabase
    .from('unavailability')
    .select('*')
    .eq('cleaner_id', authUser.id)
    .gte('date_to', new Date().toISOString())
    .order('date_from', { ascending: true });

  return (
    <AvailabilityClient
      initialBlocks={unavailabilities ?? []}
      userId={authUser.id}
      tenantId={profile.tenant_id}
    />
  );
}
