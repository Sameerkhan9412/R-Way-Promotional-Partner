import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const envAdminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const envAdminName = process.env.ADMIN_NAME || 'RWAY Admin';

    // 1. Check if email matches admin email in .env or database
    let adminRecord = null;
    let adminName = envAdminName;

    if (cleanEmail === envAdminEmail) {
      adminRecord = { email: envAdminEmail, name: envAdminName };
    } else {
      const dbAdmin = await prisma.adminUser.findUnique({
        where: { email: cleanEmail },
      });
      if (dbAdmin) {
        adminRecord = dbAdmin;
        adminName = dbAdmin.name || 'Admin';
      }
    }

    // Always respond with success to prevent user enumeration
    if (!adminRecord) {
      return NextResponse.json({
        success: true,
        message: 'If the provided email belongs to an authorized admin, a password reset link has been sent.',
      });
    }

    // 2. Generate a secure crypto token (32 bytes hex = 64 characters)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    // 3. Store reset token record in AppSetting
    const payload = JSON.stringify({
      email: cleanEmail,
      tokenHash,
      expiresAt,
    });

    await prisma.appSetting.upsert({
      where: { key: 'admin_password_reset' },
      update: { value: payload },
      create: { key: 'admin_password_reset', value: payload },
    });

    // 4. Construct reset link URL
    const url = new URL(request.url);
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const protoHeader = request.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '') || 'http');
    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `${protoHeader}://${hostHeader}`;

    const resetUrl = `${baseUrl.replace(/\/+$/, '')}/admin/reset-password?token=${rawToken}`;

    // 5. Send email via Nodemailer
    await sendPasswordResetEmail({
      to: cleanEmail,
      resetUrl,
      adminName,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email address.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
