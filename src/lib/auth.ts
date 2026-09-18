import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const COOKIE_NAME = 'rway_admin_session';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function generateToken(payload: AdminSession): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return Buffer.from(data).toString('base64');
}

export function parseToken(token: string): AdminSession | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const data = JSON.parse(raw);
    if (data.exp && Date.now() > data.exp) {
      return null;
    }
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

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
