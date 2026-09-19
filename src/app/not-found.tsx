import Link from 'next/link';
import { RwayLogo } from '@/components/RwayLogo';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <RwayLogo size="lg" />
      </div>
      <h1 style={{ fontSize: '3rem', color: 'var(--rway-teal-950)', marginBottom: '0.5rem' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.3rem', color: 'var(--rway-teal-800)', marginBottom: '1rem' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '1.75rem', fontSize: '0.925rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/admin/orders" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
