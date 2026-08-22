import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/shifts
 * Create a new shift (ADM/MGR only)
 * Body: { site_id, cleaner_id, starts_at, ends_at, notes? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role, tenant_id').eq('id', user.id).single();
  if (!profile || !['ADM', 'MGR'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { site_id, cleaner_id, starts_at, ends_at, notes } = body;

  if (!site_id || !cleaner_id || !starts_at || !ends_at) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check for cleaner overlap conflicts
  const { data: conflicts } = await supabase
    .from('shifts')
    .select('id, site:sites(name), starts_at, ends_at')
    .eq('cleaner_id', cleaner_id)
    .eq('published', true)
    .or(`starts_at.lt.${ends_at},ends_at.gt.${starts_at}`);

  const admin = createAdminClient();
  const { data: shift, error } = await admin
    .from('shifts')
    .insert({
      tenant_id: profile.tenant_id,
      site_id,
      cleaner_id,
      starts_at,
      ends_at,
      notes,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write audit log
  await admin.from('audit_logs').insert({
    tenant_id: profile.tenant_id,
    user_id: user.id,
    user_role: profile.role,
    action: 'SHIFT_CREATE',
    payload: { shift_id: shift.id, cleaner_id, site_id, starts_at, ends_at },
    ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    user_agent: request.headers.get('user-agent'),
  });

  return NextResponse.json({
    shift,
    conflicts: conflicts?.length ? conflicts : [],
    has_conflicts: (conflicts?.length ?? 0) > 0,
  }, { status: 201 });
}

/**
 * GET /api/shifts
 * List shifts for the authenticated user's tenant
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cleaner_id = searchParams.get('cleaner_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabase
    .from('shifts')
    .select('*, site:sites(id, name, address), cleaner:users!cleaner_id(id, full_name, role)')
    .order('starts_at', { ascending: true });

  if (cleaner_id) query = query.eq('cleaner_id', cleaner_id);
  if (from) query = query.gte('starts_at', from);
  if (to) query = query.lte('starts_at', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ shifts: data });
}
