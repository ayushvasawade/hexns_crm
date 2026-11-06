'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  useEffect(() => { if (isAuthenticated) router.replace('/'); }, [isAuthenticated, router]);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); if (isSubmitting) return; setLocalError(null); clearError();
    if (!email.trim() || !password) { setLocalError('Enter your email address and password to continue.'); return; }
    setIsSubmitting(true); try { await login(email.trim(), password); }
    catch (error: unknown) { setLocalError(error instanceof Error ? error.message : 'Login failed. Please check your credentials.'); }
    finally { setIsSubmitting(false); }
  };
  const displayError = localError || authError;
  return <main className={styles.loginPage}>
    <section className={styles.brandPanel} aria-label="HEXNS Mediaworks">
      <Image className={styles.studioImage} src="/login-studio.png" alt="Creative production studio" fill priority sizes="(max-width: 820px) 100vw, 62vw" />
      <div className={styles.studioOverlay} />
      <div className={styles.brandContent}><Image src="/hexns_logo.svg" alt="HEXNS Mediaworks" width={440} height={146} priority className={styles.logo} /><div className={styles.crmBadge}>CRM</div><p className={styles.modules}>Client <span>•</span> Projects <span>•</span> Quotations <span>•</span> Invoices <span>•</span> Billing</p></div>
    </section>
    <section className={styles.formPanel} aria-label="Login"><div className={styles.loginCard}><div className={styles.cardContent}>
      <header className={styles.cardHeader}><h1>Login to HEXNS CRM</h1><p>Access your projects, clients, quotations and invoices</p></header>
      {displayError && <div className={styles.error} role="alert"><AlertCircle size={18} /><span>{displayError}</span></div>}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <label className={styles.field}><span className={styles.srOnly}>Email address</span><Mail aria-hidden="true" size={22} /><input type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} required /></label>
        <label className={styles.field}><span className={styles.srOnly}>Password</span><LockKeyhole aria-hidden="true" size={22} /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} required /><button type="button" className={styles.visibility} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={isSubmitting}>{showPassword ? <EyeOff size={23} /> : <Eye size={23} />}</button></label>
        <button type="submit" className={styles.loginButton} disabled={isSubmitting}>{isSubmitting ? <><Loader2 className={styles.spinner} size={21} /> Logging in…</> : <>Login <ArrowRight size={25} /></>}</button>
      </form>
    </div><div className={styles.waves} aria-hidden="true"><i /><b /></div></div></section>
  </main>;
}
