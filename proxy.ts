import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

// Route protection config
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/cleaner': ['CLN', 'ADM'],     // Admins can preview cleaner portal
  '/admin': ['ADM', 'MGR'],
  '/audit': ['ADM', 'AUD'],
};

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/reset-password',
  '/auth/callback',
  '/store',
  '/store/cart',
  '/store/checkout',
  '/store/confirmation',
  '/api/webhooks',
  '/api/orders',
];

const ROLE_HOME: Record<UserRole, string> = {
  ADM: '/admin/dashboard',
  MGR: '/admin/dashboard',
  CLN: '/cleaner/dashboard',
  AUD: '/audit',
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST happen before any route checks
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow public routes unconditionally
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    // Redirect logged-in users away from /login to their home
    if (pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = profile?.role as UserRole;
      const home = ROLE_HOME[role] || '/';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return supabaseResponse;
  }

  // All other routes require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user profile for role-based routing
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active, tenant_id')
    .eq('id', user.id)
    .single();

  // Deactivated user — force sign out
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=account_disabled', request.url));
  }

  const userRole = profile.role as UserRole;

  // Check route permissions
  for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(userRole)) {
        // Redirect to user's correct portal instead of 403
        return NextResponse.redirect(new URL(ROLE_HOME[userRole] || '/', request.url));
      }
      break;
    }
  }

  // Inject role into request headers for downstream server components
  supabaseResponse.headers.set('x-user-role', userRole);
  supabaseResponse.headers.set('x-user-id', user.id);
  supabaseResponse.headers.set('x-tenant-id', profile.tenant_id);

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
