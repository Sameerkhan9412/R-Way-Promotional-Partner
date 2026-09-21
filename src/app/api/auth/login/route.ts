import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setAdminSessionCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const envAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const envAdminPassword = process.env.ADMIN_PASSWORD || '';
    const envAdminName = process.env.ADMIN_NAME || 'RWAY Admin';

    let authenticatedAdmin: {
      id: string;
      email: string;
      name: string;
      role: string;
    } | null = null;

    // 1. Primary Authentication: Check credentials from .env file
    if (envAdminEmail && envAdminPassword) {
      if (cleanEmail === envAdminEmail && password === envAdminPassword) {
        // Sync / upsert into database for consistency and relational integrity
        try {
          const passwordHash = await bcrypt.hash(envAdminPassword, 10);
          const dbAdmin = await prisma.adminUser.upsert({
            where: { email: envAdminEmail },
            update: { passwordHash, name: envAdminName },
            create: {
              email: envAdminEmail,
              passwordHash,
              name: envAdminName,
              role: 'SUPERADMIN',
            },
          });
          authenticatedAdmin = {
            id: dbAdmin.id,
            email: dbAdmin.email,
            name: dbAdmin.name,
            role: dbAdmin.role,
          };
        } catch {
          // Fallback if database is busy/offline
          authenticatedAdmin = {
            id: 'admin_env_' + Buffer.from(envAdminEmail).toString('hex').substring(0, 12),
            email: envAdminEmail,
            name: envAdminName,
            role: 'SUPERADMIN',
          };
        }
      }
    }

    // 2. Fallback Authentication: Check Database records
    if (!authenticatedAdmin) {
      const dbAdmin = await prisma.adminUser.findUnique({
        where: { email: cleanEmail },
      });

      if (dbAdmin) {
        const isValid = await verifyPassword(password, dbAdmin.passwordHash);
        if (isValid) {
          authenticatedAdmin = {
            id: dbAdmin.id,
            email: dbAdmin.email,
            name: dbAdmin.name,
            role: dbAdmin.role,
          };
        }
      }
    }

    if (!authenticatedAdmin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await setAdminSessionCookie({
      id: authenticatedAdmin.id,
      email: authenticatedAdmin.email,
      name: authenticatedAdmin.name,
      role: authenticatedAdmin.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: authenticatedAdmin.id,
        email: authenticatedAdmin.email,
        name: authenticatedAdmin.name,
        role: authenticatedAdmin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred' },
      { status: 500 }
    );
  }
}
