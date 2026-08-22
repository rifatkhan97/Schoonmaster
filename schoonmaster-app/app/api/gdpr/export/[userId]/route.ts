import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gdpr/export/[userId]
 * Export all personal data for the requesting user (or admin exporting on behalf)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role, tenant_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Users can only export their own data; Admins can export any user in their tenant
  if (user.id !== userId && profile.role !== 'ADM') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [
    { data: userData },
    { data: shifts },
    { data: completions },
    { data: requests },
    { data: incidents },
    { data: unavailability },
    { data: readReceipts },
  ] = await Promise.all([
    admin.from('users').select('id, full_name, phone, role, is_active, created_at').eq('id', userId).single(),
    admin.from('shifts').select('id, site_id, starts_at, ends_at, notes, created_at').eq('cleaner_id', userId),
    admin.from('checklist_completions').select('shift_id, template_id, is_checked, checked_at').eq('cleaner_id', userId),
    admin.from('material_requests').select('id, status, items, notes, created_at').eq('cleaner_id', userId),
    admin.from('incidents').select('id, category, notes, status, created_at, image_expires_at').eq('cleaner_id', userId),
    admin.from('unavailability').select('id, date_from, date_to, reason, created_at').eq('cleaner_id', userId),
    admin.from('announcement_reads').select('announcement_id, read_at').eq('user_id', userId),
  ]);

  // Write audit log
  await admin.from('audit_logs').insert({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    user_role: profile.role,
    action: 'GDPR_EXPORT',
    payload: { exported_user_id: userId },
    ip_address: request.headers.get('x-forwarded-for'),
  });

  const exportData = {
    export_date: new Date().toISOString(),
    data_subject: userId,
    profile: userData,
    shifts,
    checklist_completions: completions,
    material_requests: requests,
    incidents,
    unavailability,
    announcement_reads: readReceipts,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="gdpr-export-${userId.slice(0, 8)}.json"`,
    },
  });
}

/**
 * DELETE /api/gdpr/export/[userId]
 * Anonymise all personal data for the user (right to erasure)
 * Audit trail entries are retained but anonymised
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role, tenant_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.id !== userId && profile.role !== 'ADM') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const anonymisedId = `DELETED_${Date.now()}`;

  // Anonymise user profile (retain shell for referential integrity)
  await admin.from('users').update({
    full_name: '[Deleted User]',
    phone: null,
    push_token: null,
    is_active: false,
  }).eq('id', userId);

  // Delete incident images from storage (GDPR)
  const { data: incidentImages } = await admin
    .from('incidents')
    .select('id, image_url')
    .eq('cleaner_id', userId)
    .not('image_url', 'is', null);

  for (const inc of incidentImages ?? []) {
    if (inc.image_url) {
      const path = inc.image_url.split('/storage/v1/object/public/incident-images/')[1];
      if (path) await admin.storage.from('incident-images').remove([path]);
    }
  }

  await admin.from('incidents').update({ image_url: null, notes: '[Deleted]' }).eq('cleaner_id', userId);
  await admin.from('material_requests').update({ notes: '[Deleted]' }).eq('cleaner_id', userId);
  await admin.from('unavailability').delete().eq('cleaner_id', userId);

  // Delete the Auth user account
  await admin.auth.admin.deleteUser(userId);

  // Write audit log before finishing
  await admin.from('audit_logs').insert({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    user_role: profile.role,
    action: 'GDPR_DELETE',
    payload: { deleted_user_id: userId, anonymised_as: anonymisedId },
    ip_address: request.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ success: true, message: 'User data anonymised per GDPR Article 17.' });
}
