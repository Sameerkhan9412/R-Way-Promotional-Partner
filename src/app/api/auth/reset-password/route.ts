import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Password reset token is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // 1. Hash incoming token and query active reset record
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const settingRecord = await prisma.appSetting.findUnique({
      where: { key: 'admin_password_reset' },
    });

    if (!settingRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset link. Please request a new reset email.' },
        { status: 400 }
      );
    }

    let resetData: { email: string; tokenHash: string; expiresAt: number };
    try {
      resetData = JSON.parse(settingRecord.value);
    } catch {
      return NextResponse.json(
        { error: 'Corrupted reset session. Please request a new link.' },
        { status: 400 }
      );
    }

    // 2. Validate token hash and expiration
    if (resetData.tokenHash !== tokenHash) {
      return NextResponse.json(
        { error: 'Invalid password reset token' },
        { status: 400 }
      );
    }

    if (Date.now() > resetData.expiresAt) {
      // Invalidate expired record
      await prisma.appSetting.delete({ where: { key: 'admin_password_reset' } }).catch(() => {});
      return NextResponse.json(
        { error: 'This password reset link has expired (1 hour limit). Please request a new one.' },
        { status: 400 }
      );
    }

    // 3. Update password in database
    const passwordHash = await bcrypt.hash(password, 10);
    const adminName = process.env.ADMIN_NAME || 'RWAY Admin';

    await prisma.adminUser.upsert({
      where: { email: resetData.email },
      update: {
        passwordHash,
      },
      create: {
        email: resetData.email,
        passwordHash,
        name: adminName,
        role: 'SUPERADMIN',
      },
    });

    // 4. Synchronize .env credentials file
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const safePassword = password.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        if (/^ADMIN_PASSWORD=.*/m.test(envContent)) {
          envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD="${safePassword}"`);
        } else {
          envContent += `\nADMIN_PASSWORD="${safePassword}"\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
      process.env.ADMIN_PASSWORD = password;
    } catch (envErr) {
      console.error('Warning: could not synchronize .env file directly:', envErr);
    }

    // 5. Invalidate the used token
    await prisma.appSetting.delete({
      where: { key: 'admin_password_reset' },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Password has been updated successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
