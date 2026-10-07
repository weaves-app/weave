import {clerkMiddleware} from '@clerk/nextjs/server';
import {NextResponse} from 'next/server';
import type {NextFetchEvent, NextMiddleware, NextRequest} from 'next/server';
import {readClerkConfiguration} from './features/auth/infrastructure/configuration';
const authenticate = clerkMiddleware(
  () => NextResponse.next(),
  () => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
  }),
);
export function proxy(request: NextRequest, event: NextFetchEvent): ReturnType<NextMiddleware> {
  if (!readClerkConfiguration(process.env)) return NextResponse.next();
  return authenticate(request, event);
}
export const config = {matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']};
