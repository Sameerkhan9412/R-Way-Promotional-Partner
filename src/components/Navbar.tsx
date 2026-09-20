'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RwayLogo } from '@/components/RwayLogo';
import {
  Layers,
  UploadCloud,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Fetch google form url
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.google_form_url) {
          setGoogleFormUrl(data.settings.google_form_url);
        }
      })
      .catch(() => {});

    // Fetch user info
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAdminName(data.user.name || 'Admin');
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyFormLink = async () => {
    const urlToCopy =
      googleFormUrl ||
      `${window.location.origin}/submit-review`;

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      prompt('Copy review form link:', urlToCopy);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="rway-navbar">
      <div className="rway-container" style={{ padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Brand Logo */}
        <Link href="/admin/orders" style={{ display: 'inline-flex' }}>
          <RwayLogo size="md" />
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            href="/admin/orders"
            className={`btn btn-sm ${
              pathname === '/admin/orders' ? 'btn-primary' : 'btn-outline'
            }`}
          >
            <Layers size={16} />
            <span>Dashboard & Orders</span>
          </Link>

          <Link
            href="/admin/orders/bulk-import"
            className={`btn btn-sm ${
              pathname === '/admin/orders/bulk-import'
                ? 'btn-gold'
                : 'btn-outline'
            }`}
          >
            <UploadCloud size={16} />
            <span>Bulk Upload</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* 1-Click Copy Google Form Link Button */}
          <button
            onClick={handleCopyFormLink}
            className="btn btn-sm btn-secondary"
            title="Copy Review Form Link to share with buyers on WhatsApp"
            style={{
              borderColor: 'var(--rway-gold-400)',
              backgroundColor: 'var(--rway-gold-50)',
              color: 'var(--rway-gold-800)',
              fontWeight: 600,
            }}
          >
            {copied ? (
              <>
                <Check size={16} color="var(--rway-teal-700)" />
                <span>Form Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} color="var(--rway-gold-600)" />
                <span>Copy Google Form Link</span>
              </>
            )}
          </button>

          {/* Quick link to public buyer portal */}
          <Link
            href="/submit-review"
            target="_blank"
            className="btn btn-sm btn-outline"
            title="Preview Public Buyer Review Portal"
          >
            <ExternalLink size={15} />
            <span>Buyer Portal</span>
          </Link>

          {/* Settings Modal Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="btn btn-sm btn-outline"
              title="Google Form & Portal Settings"
              style={{ padding: '0.45rem' }}
            >
              <Settings size={17} />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline"
            title={`Logged in as ${adminName}. Click to Logout`}
            style={{ padding: '0.45rem', color: '#b91c1c', borderColor: '#fecaca' }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
};
