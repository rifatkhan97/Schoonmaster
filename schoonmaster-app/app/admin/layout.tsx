import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';
import type { User } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Operations Center', template: '%s | Admin · Schoonmaster' },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', authUser.id).single();

  if (!profile || !profile.is_active) redirect('/login?error=account_disabled');
  if (!['ADM', 'MGR'].includes(profile.role)) redirect('/cleaner/dashboard');

  // Badge counts for sidebar
  const [{ count: pendingIncidents }, { count: pendingSupplies }] = await Promise.all([
    supabase.from('incidents').select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id).eq('status', 'SENT'),
    supabase.from('material_requests').select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id).eq('status', 'PENDING'),
  ]);

  const user: User = { ...profile, email: authUser.email };

  return (
    <div className="page-layout">
      <AdminSidebar
        user={user}
        pendingIncidents={pendingIncidents ?? 0}
        pendingSupplies={pendingSupplies ?? 0}
      />
      <main className="page-main" id="main-content" style={{ gridColumn: 2 }}>
        {children}
      </main>
    </div>
  );
}
