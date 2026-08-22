import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';
import type { User } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Operations Center', template: '%s | Admin · Schoonmaster' },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isDemoAuth = cookieStore.get('sb-demo-auth')?.value === 'true';

  let authUser: { id: string; email: string } | null = null;
  let profile: any = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      authUser = { id: data.user.id, email: data.user.email || 'admin@schoonmaster.nl' };
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

  // Fallback demo admin user
  if (!profile && isDemoAuth) {
    authUser = { id: '11111111-1111-1111-1111-111111111111', email: 'admin@schoonmaster.nl' };
    profile = {
      id: '11111111-1111-1111-1111-111111111111',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Jan de Vries (Admin)',
      role: 'ADM',
      is_active: true,
    };
  }

  if (!authUser || !profile || !profile.is_active) redirect('/login?error=account_disabled');
  if (!['ADM', 'MGR'].includes(profile.role)) redirect('/cleaner/dashboard');

  const user: User = { ...profile, email: authUser.email };

  return (
    <div className="page-layout">
      <AdminSidebar
        user={user}
        pendingIncidents={0}
        pendingSupplies={0}
      />
      <main className="page-main" id="main-content" style={{ gridColumn: 2 }}>
        {children}
      </main>
    </div>
  );
}
