import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type UserRole = 'ADM' | 'MGR' | 'CLN' | 'AUD';

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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({ request });

  // 1. Determine route protection type
  const isProtected = Object.keys(PROTECTED_ROUTES).some(prefix => pathname.startsWith(prefix));
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || (r !== '/' && pathname.startsWith(r + '/')));

  // Check if request carries Supabase auth session cookies
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  // Unauthenticated guest visiting public route -> zero network calls, zero risk
  if (!hasAuthCookie && isPublic) {
    return response;
  }

  // Unauthenticated guest visiting protected route -> redirect to login immediately
  if (!hasAuthCookie && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Environment variable validation supporting all Vercel integration aliases
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey || url.includes('placeholder')) {
    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // 2. Validate session with Supabase only when auth cookies are present
  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          } catch {
            // Ignore write errors on immutable response
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    // Logged-in user visiting /login -> redirect to their home portal
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

    if (!user && isProtected) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (user && isProtected) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, is_active, tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile || !profile.is_active) {
        await supabase.auth.signOut().catch(() => {});
        return NextResponse.redirect(new URL('/login?error=account_disabled', request.url));
      }

      const userRole = profile.role as UserRole;

      for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(routePrefix)) {
          if (!allowedRoles.includes(userRole)) {
            return NextResponse.redirect(new URL(ROLE_HOME[userRole] || '/', request.url));
          }
          break;
        }
      }

      response.headers.set('x-user-role', userRole);
      response.headers.set('x-user-id', user.id);
      response.headers.set('x-tenant-id', profile.tenant_id);
    }

    return response;
  } catch (err) {
    console.error('Middleware error:', err);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
