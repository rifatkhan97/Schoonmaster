import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnnouncementsClient from './AnnouncementsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Announcements' };

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id, role').eq('id', authUser.id).single();
  if (!profile) redirect('/login');

  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      *,
      read:announcement_reads!left(read_at)
    `)
    .eq('tenant_id', profile.tenant_id)
    .or(`target_role.is.null,target_role.eq.${profile.role}`)
    .order('created_at', { ascending: false })
    .limit(50);

  // Attach read_at to each announcement
  const enriched = (announcements ?? []).map(a => ({
    ...a,
    read_at: (a.read as unknown as Array<{ read_at: string }>)?.[0]?.read_at ?? null,
  }));

  return (
    <AnnouncementsClient
      announcements={enriched}
      userId={authUser.id}
    />
  );
}
