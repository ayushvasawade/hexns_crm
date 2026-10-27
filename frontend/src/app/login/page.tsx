'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState('admin@hexns.com');
  const [password, setPassword] = useState('Hexns@12345');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setLocalError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FAFAFA',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        padding: '2.5rem 2rem',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            backgroundColor: '#171717',
            color: '#FFFFFF',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '20px',
            margin: '0 auto 1rem',
            letterSpacing: '-0.02em',
          }}>
            H
          </div>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#171717',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            HEXNS MEDIAWORKS
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#737373',
            marginTop: '4px',
          }}>
            Billing & Financial Management System
          </p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
          }}>
            <AlertCircle size={16} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#B91C1C', lineHeight: 1.4 }}>
              {displayError}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="admin@hexns.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 2.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: isSubmitting ? '#4B5563' : '#171717',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '13.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div style={{
          marginTop: '2rem',
          padding: '0.85rem',
          backgroundColor: '#F9FAFB',
          border: '1px dashed #D1D5DB',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#4B5563',
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, color: '#171717', marginBottom: '4px' }}>
            Account Credentials (Neon DB):
          </div>
          <div>Email: <code style={{ backgroundColor: '#EEF2F6', padding: '1px 4px', borderRadius: '3px' }}>admin@hexns.com</code></div>
          <div>Password: <code style={{ backgroundColor: '#EEF2F6', padding: '1px 4px', borderRadius: '3px' }}>Hexns@12345</code></div>
        </div>
      </div>
    </div>
  );
}
