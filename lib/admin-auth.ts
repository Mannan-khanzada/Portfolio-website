import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'mannan_admin_session';
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function signature(expiresAt: string, key: string) {
  return createHmac('sha256', key).update(`mannan-admin:${expiresAt}`).digest('hex');
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret());
}

export function createAdminSession() {
  const key = secret();
  if (!key) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters long.');
  const expiresAt = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  return `${expiresAt}.${signature(expiresAt, key)}`;
}

export function verifyAdminSession(value?: string | null) {
  if (!value) return false;
  const key = secret();
  if (!key) return false;
  const parts = value.split('.');
  if (parts.length !== 2 || !/^\d{10,}$/.test(parts[0])) return false;
  const expires = Number(parts[0]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(parts[1], signature(parts[0], key));
}
