import Link from 'next/link';
import { RwayLogo } from '@/components/RwayLogo';
import { ShieldCheck, FileSpreadsheet, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="rway-navbar" style={{ padding: '1rem 0' }}>
        <div className="rway-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <RwayLogo size="md" />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/submit-review" className="btn btn-outline btn-sm">
              Buyer Review Portal
            </Link>
            <Link href="/admin/login" className="btn btn-primary btn-sm">
              Admin Login <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '960px', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--rway-gold-50)',
              border: '1px solid var(--rway-gold-300)',
              color: 'var(--rway-gold-800)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--rway-gold-500)' }} />
            Official Campaign & Bulk Order Processing Portal
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.15, marginBottom: '1.25rem', color: 'var(--rway-teal-950)' }}>
            Campaign Management & <br />
            <span style={{ color: 'var(--rway-teal-700)' }}> Bulk Order</span> Intelligence
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Directly copy & paste raw deal messages, auto-extract buyer orders, separate by brand, track Amazon review submissions, and export tailored Excel reports.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '3.5rem' }}>
            <Link href="/admin/orders/bulk-import" className="btn btn-gold btn-lg" style={{ minWidth: '220px' }}>
              <MessageSquare size={20} /> Paste Deal
            </Link>
            <Link href="/admin/orders" className="btn btn-primary btn-lg" style={{ minWidth: '220px' }}>
              <ShieldCheck size={20} /> Open Admin Panel
            </Link>
          </div>

          {/* Quick Feature Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
            <div className="rway-card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--rway-teal-50)', color: 'var(--rway-teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <MessageSquare size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Automated Parsing</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Paste multi-order deal summaries from  groups. The engine instantly extracts deal dates, brand names, Amazon Order IDs, buyer names, and amounts.
              </p>
            </div>

            <div className="rway-card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--rway-gold-50)', color: 'var(--rway-gold-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <FileSpreadsheet size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Brand & Date Excel Export</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Filter orders by individual brands (e.g. Tagas, Celary) and custom date ranges. Generate formatted .xlsx files with single-click precision.
              </p>
            </div>

            <div className="rway-card" style={{ padding: '1.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--rway-teal-50)', color: 'var(--rway-teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Google Form & Review Mapping</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Share Google Form or the direct review link to collect delivered and rating screenshots. Matched Order IDs automatically transition to "Review Submitted".
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '1.5rem 0', backgroundColor: '#ffffff', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div className="rway-container">
          © {new Date().getFullYear()} RWAY Promotion Partners. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
