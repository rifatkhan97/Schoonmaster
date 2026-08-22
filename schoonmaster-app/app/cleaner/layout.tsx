import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CleanerSidebar from '@/components/cleaner/CleanerSidebar';
import type { User } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Field Portal', template: '%s | Schoonmaster' },
};

export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!profile || !profile.is_active) redirect('/login?error=account_disabled');
  if (profile.role !== 'CLN' && profile.role !== 'ADM') redirect('/admin/dashboard');

  // Unread announcements count
  const { count: unreadCount } = await supabase
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .or(`target_role.is.null,target_role.eq.CLN`)
    .eq('tenant_id', profile.tenant_id)
    .not('id', 'in', `(
      SELECT announcement_id FROM announcement_reads WHERE user_id = '${authUser.id}'
    )`);

  const user: User = { ...profile, email: authUser.email };

  return (
    <div className="page-layout">
      <CleanerSidebar user={user} unreadCount={unreadCount ?? 0} />
      <main className="page-main" id="main-content">
        {children}
      </main>
    </div>
  );
}
