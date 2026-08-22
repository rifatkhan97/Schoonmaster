import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import CleanerSidebar from '@/components/cleaner/CleanerSidebar';
import type { User } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Field Portal', template: '%s | Schoonmaster' },
};

export default async function CleanerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isDemoAuth = cookieStore.get('sb-demo-auth')?.value === 'true';

  let authUser: { id: string; email: string } | null = null;
  let profile: any = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      authUser = { id: data.user.id, email: data.user.email || 'cleaner@schoonmaster.nl' };
      const { data: p } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      profile = p;
    }
  } catch {
    // Ignore error in fallback context
  }

  // Fallback demo cleaner user
  if (!profile && isDemoAuth) {
    authUser = { id: '33333333-3333-3333-3333-333333333333', email: 'cleaner@schoonmaster.nl' };
    profile = {
      id: '33333333-3333-3333-3333-333333333333',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Lars van den Berg (Cleaner)',
      role: 'CLN',
      is_active: true,
    };
  }

  if (!authUser || !profile || !profile.is_active) redirect('/login?error=account_disabled');
  if (profile.role !== 'CLN' && profile.role !== 'ADM') redirect('/admin/dashboard');

  const user: User = { ...profile, email: authUser.email };

  return (
    <div className="page-layout">
      <CleanerSidebar user={user} unreadCount={0} />
      <main className="page-main" id="main-content">
        {children}
      </main>
    </div>
  );
}
