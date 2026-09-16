// @vitest-environment node
import { createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

// Use the installed SDK, not the middleware suite's matcher mock. This checks
// public-allowlist semantics locally; it does not establish live authorization.
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

describe('patched Clerk route matcher compatibility', () => {
  it.each(['/sign-in', '/sign-in/factor-one', '/sign-up', '/sign-up/verify-email'])('allows the sign-in route %s', (pathname) => {
    expect(isPublicRoute(new NextRequest(`https://example.test${pathname}`))).toBe(true);
  });

  it.each([
    '/dashboard',
    '/api/pos/checkout',
    '/settings/team',
    '/admin',
    '/control/synthetic/sign-in',
    '/dashboard?redirect_url=/sign-in',
    '/dashboard%0A/sign-in',
    '/dashboard%0D/sign-up',
    '/dashboard%2Fsign-in',
    '/dashboard;sign-in',
  ])('does not classify a protected path as public: %s', (pathname) => {
    expect(isPublicRoute(new NextRequest(`https://example.test${pathname}`))).toBe(false);
  });
});
