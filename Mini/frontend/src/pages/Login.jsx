import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertTriangle, Eye, EyeOff, Layers, BarChart3, Users, Shield, CheckCircle } from 'lucide-react';

const features = [
  { icon: <BarChart3 size={16} />, text: 'Real-time team analytics & compliance tracking' },
  { icon: <Users size={16} />, text: 'Manage members across multiple projects' },
  { icon: <CheckCircle size={16} />, text: 'Submit & review weekly progress reports' },
  { icon: <Shield size={16} />, text: 'Role-based access for managers & members' },
];

export default function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'manager' ? 'manager-dashboard' : 'member-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout animate-fade-in">

      {/* ── Left: Brand Panel ── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content animate-slide-left">
          <div className="auth-brand-logo">
            <Layers size={34} color="#fff" />
          </div>
          <h1 className="auth-brand-title">ReportHub</h1>
          <p className="auth-brand-subtitle">
            Your all-in-one weekly reporting<br />& team intelligence platform.
          </p>
          <ul className="auth-feature-list">
            {features.map((f, i) => (
              <li key={i} className="auth-feature-item">
                <span className="auth-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner animate-slide-right">

          {/* Header */}
          <div style={{ marginBottom: '36px' }}>
            <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Welcome back
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, marginBottom: '8px' }}>
              Sign in to your account
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Submit, track, and review weekly reports.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={16} className="alert-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group" style={{ marginBottom: '28px' }}>
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '42px', paddingRight: '44px' }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Footer link */}
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <a
              href="#register"
              onClick={(e) => { e.preventDefault(); navigate('register'); }}
              style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}
            >
              Create one free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
