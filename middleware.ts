import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight Next.js Middleware.
 * Route protection and role authorization (RBAC) are handled by Server Component layouts
 * (/app/cleaner/layout.tsx and /app/admin/layout.tsx) for 100% server-side security.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
