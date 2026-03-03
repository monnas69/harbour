import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED = [
  '/dashboard',
  '/forecast/',   // covers /forecast/[id] but NOT /forecast/new or /forecast/preview
  '/admin',
];

// Routes that are always public even if they start with /forecast/
const PUBLIC_FORECAST = [
  '/forecast/new',
  '/forecast/preview',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if this route needs protection
  const needsAuth =
    PROTECTED.some((p) => pathname.startsWith(p)) &&
    !PUBLIC_FORECAST.some((p) => pathname.startsWith(p));

  if (!needsAuth) return NextResponse.next();

  // Check session
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value; },
        set(name, value, options) { response.cookies.set({ name, value, ...options }); },
        remove(name, options) { response.cookies.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/forecast/:path*',
    '/admin/:path*',
  ],
};
