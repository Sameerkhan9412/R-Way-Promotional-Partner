import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { AdminSession, COOKIE_NAME, generateToken, parseToken } from './session';

export type { AdminSession };
export { COOKIE_NAME, generateToken, parseToken };

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseToken(token);
}

export async function setAdminSessionCookie(session: AdminSession) {
  const cookieStore = await cookies();
  const token = generateToken(session);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
