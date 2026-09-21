export const COOKIE_NAME = 'rway_admin_session';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Encodes an admin session into a base64 token with a 7-day expiration timestamp.
 */
export function generateToken(payload: AdminSession): string {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }
  return btoa(unescape(encodeURIComponent(data)));
}

/**
 * Validates and decodes a base64 session token.
 * Compatible with Edge Runtime, Node.js, and browser environments.
 */
export function parseToken(token: string): AdminSession | null {
  if (!token || typeof token !== 'string') return null;
  try {
    let raw = '';
    if (typeof Buffer !== 'undefined') {
      raw = Buffer.from(token, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      raw = decodeURIComponent(escape(atob(token)));
    } else {
      return null;
    }

    const data = JSON.parse(raw);
    if (!data || (data.exp && Date.now() > data.exp)) {
      return null;
    }

    if (!data.id || !data.email) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name || 'Admin',
      role: data.role || 'ADMIN',
    };
  } catch {
    return null;
  }
}
