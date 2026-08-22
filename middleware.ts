import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type UserRole = 'ADM' | 'MGR' | 'CLN' | 'AUD';

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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  // Check if Supabase env vars are properly configured
  const isConfigured = Boolean(
    url && anonKey && !url.includes('placeholder') && !anonKey.includes('placeholder')
  );

  // Fast-path: if env vars are missing or placeholders, allow public routes safely
  if (!isConfigured) {
    for (const routePrefix of Object.keys(PROTECTED_ROUTES)) {
      if (pathname.startsWith(routePrefix)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    return response;
  }

  try {
    const supabase = createServerClient(url!, anonKey!, {
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
            // Ignore if response is immutable
          }
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    // Allow public routes unconditionally
    if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      if (pathname === '/login' && user) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          const role = profile?.role as UserRole;
          const home = ROLE_HOME[role] || '/';
          return NextResponse.redirect(new URL(home, request.url));
        } catch {
          return response;
        }
      }
      return response;
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
