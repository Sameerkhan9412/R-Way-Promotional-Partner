import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, parseToken } from '@/lib/session';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? parseToken(token) : null;
  const isAuthenticated = Boolean(session);

  // 1. Handle Admin Authentication Entry Pages (Login, Forgot Password, Reset Password)
  const isPublicAuthPage =
    pathname === '/admin/login' ||
    pathname === '/admin/forgot-password' ||
    pathname === '/admin/reset-password';

  if (isPublicAuthPage) {
    if (isAuthenticated && pathname === '/admin/login') {
      // If already logged in and visiting login, redirect to target or /admin/orders
      const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/admin/orders';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 2. Handle Admin Page Routes (/admin, /admin/orders, /admin/orders/bulk-import, etc.)
  if (pathname === '/admin' || pathname === '/admin/') {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', '/admin/orders');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL('/admin/orders', request.url));
  }

  if (pathname.startsWith('/admin/')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      const fullTarget = pathname + (search || '');
      loginUrl.searchParams.set('redirect', fullTarget);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Handle Protected Admin API Routes
  const isProtectedApi =
    pathname.startsWith('/api/orders') ||
    pathname.startsWith('/api/export') ||
    pathname.startsWith('/api/brands') ||
    pathname.startsWith('/api/settings');

  if (isProtectedApi) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/orders',
    '/api/orders/:path*',
    '/api/export',
    '/api/export/:path*',
    '/api/brands',
    '/api/brands/:path*',
    '/api/settings',
  ],
};
