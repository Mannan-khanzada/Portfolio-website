import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, adminAuthConfigured, createAdminSession, safeEqual } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ error: 'Admin login is not configured yet. Set ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the deployment environment.' }, { status: 503 });
  }
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin && host) {
    try { if (new URL(origin).host !== host) return NextResponse.json({ error: 'Request origin was rejected.' }, { status: 403 }); }
    catch { return NextResponse.json({ error: 'Request origin was rejected.' }, { status: 403 }); }
  }
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Enter your username and password.' }, { status: 400 }); }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const expectedUsername = process.env.ADMIN_USERNAME || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  if (!safeEqual(username, expectedUsername) || !safeEqual(password, expectedPassword)) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
