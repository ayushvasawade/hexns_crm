import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary, #111827)' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary, #4B5563)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted, #6B7280)', marginBottom: '2rem' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.625rem 1.25rem',
          backgroundColor: 'var(--primary, #6366F1)',
          color: '#ffffff',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

