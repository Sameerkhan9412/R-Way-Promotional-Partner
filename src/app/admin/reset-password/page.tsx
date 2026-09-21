'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RwayLogo } from '@/components/RwayLogo';
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!token) {
    return (
      <div
        className="rway-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--border-subtle)',
        }}
      >
        <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
          <RwayLogo size="lg" />
        </div>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '1px solid #fee2e2',
          }}
        >
          <AlertCircle size={30} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Missing Reset Token
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          The password reset link is invalid or incomplete. Please request a new password reset email.
        </p>
        <Link href="/admin/forgot-password" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Request New Link
        </Link>
      </div>
    );
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="rway-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--border-subtle)',
        }}
      >
        <div style={{ display: 'inline-flex', marginBottom: '1.25rem' }}>
          <RwayLogo size="lg" />
        </div>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '1px solid #a7f3d0',
          }}
        >
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Password Reset Complete
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          Your admin password has been updated securely. You can now log in using your new credentials.
        </p>
        <button
          onClick={() => router.push('/admin/login')}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <span>Sign In to Admin Portal</span>
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="rway-card"
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '1rem' }}>
          <RwayLogo size="lg" />
        </div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          Set New Admin Password
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Choose a strong password to protect your RWAY administration account.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#b91c1c',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
            }}
          >
            New Password (minimum 6 characters)
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="rway-input"
              style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '0.35rem',
            }}
          >
            Confirm New Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="rway-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {isLoading ? (
            <span>Updating Password...</span>
          ) : (
            <>
              <span>Save New Password</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)',
        padding: '1.5rem',
        backgroundImage: 'radial-gradient(#164e4d15 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <Suspense fallback={<div className="rway-card" style={{ padding: '2rem' }}>Verifying reset request...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
