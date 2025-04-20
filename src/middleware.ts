import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Define protected routes (adjust as needed)
  const protectedRoutes = ['/', '/bookings', '/customers', '/sectors']; // Add other protected routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route)) && pathname !== '/login';

  // Redirect to login if accessing a protected route without a session
  if (!session && isProtectedRoute) {
    console.log('Middleware: No session, redirecting to /login from', pathname);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if accessing login page with an active session
  if (session && pathname === '/login') {
    console.log('Middleware: Session found, redirecting from /login to /');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Refresh session if needed - important for server components
  // await supabase.auth.getSession(); 
  // Note: getSession() called above already handles refresh to some extent for middleware.
  // Direct session refresh might be needed in layouts/pages for full SSR auth state sync.

  console.log('Middleware: Allowing request for', pathname);
  return response; 
}

// Define which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes, if you want them public - adjust if needed)
     * Feel free to modify this pattern to include more exceptions.
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)', 
  ],
}; 