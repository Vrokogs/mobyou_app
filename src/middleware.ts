import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import type { Role } from '@/types/database';

const ROLE_ROUTES: Record<Role, string> = {
  gestor: '/gestor',
  vendedor: '/vendedor',
  tecnico: '/tecnico',
  cliente: '/cliente',
};

const PROTECTED_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: '/gestor', role: 'gestor' },
  { prefix: '/vendedor', role: 'vendedor' },
  { prefix: '/tecnico', role: 'tecnico' },
  { prefix: '/cliente', role: 'cliente' },
];

const PUBLIC_ROUTES = ['/login', '/registro', '/reset-password', '/auth/callback'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function getDashboardPath(role: Role): string {
  return `${ROLE_ROUTES[role]}/dashboard`;
}

export async function middleware(request: NextRequest) {
  const { supabase, user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return response;
  }

  if (!user) {
    if (isPublicRoute(pathname)) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role as Role | undefined;

  if (!userRole) {
    if (isPublicRoute(pathname)) {
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' || pathname === '/registro') {
    const url = request.nextUrl.clone();
    url.pathname = getDashboardPath(userRole);
    return NextResponse.redirect(url);
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = getDashboardPath(userRole);
    return NextResponse.redirect(url);
  }

  for (const { prefix, role } of PROTECTED_PREFIXES) {
    if (pathname.startsWith(prefix) && userRole !== role) {
      const url = request.nextUrl.clone();
      url.pathname = getDashboardPath(userRole);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
