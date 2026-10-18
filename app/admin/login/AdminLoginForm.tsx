'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';

export default function AdminLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) {
        setError(result.error || 'Sign in failed. Check your credentials and server configuration.');
        return;
      }
      window.location.assign('/admin');
    } catch {
      setError('Could not reach the login service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="admin-login-page">
    <div className="admin-login-glow" aria-hidden="true" />
    <Link href="/" className="admin-login-back"><ArrowLeft size={15} /> Back to portfolio</Link>
    <section className="admin-login-card">
      <div className="admin-login-icon"><LockKeyhole size={20} /></div>
      <span className="admin-login-kicker">PRIVATE AREA / AUTH REQUIRED</span>
      <h1>Welcome <em>back.</em></h1>
      <p>Sign in to manage the portfolio, selected projects, and your journey.</p>
      <form onSubmit={submit}>
        <label>Admin username<input autoComplete="username" name="username" value={username} onChange={event => setUsername(event.target.value)} required /></label>
        <label>Password<input autoComplete="current-password" name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? 'Checking credentials…' : 'Sign in securely'} <ArrowRight size={16} /></button>
      </form>
      <div className="admin-login-note"><span /> Your session is stored in an HTTP-only cookie.</div>
    </section>
  </main>;
}
