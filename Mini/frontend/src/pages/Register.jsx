import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Shield, AlertTriangle, Layers, BarChart3, Users, CheckCircle, Eye, EyeOff } from 'lucide-react';

const features = [
  { icon: <BarChart3 size={16} />, text: 'Real-time team analytics & compliance tracking' },
  { icon: <Users size={16} />, text: 'Manage members across multiple projects' },
  { icon: <CheckCircle size={16} />, text: 'Submit & review weekly progress reports' },
  { icon: <Shield size={16} />, text: 'Role-based access for managers & members' },
];

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '', color: '' },
    { label: 'Very weak', color: '#ef4444' },
    { label: 'Weak', color: '#f59e0b' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#10b981' },
    { label: 'Strong', color: '#10b981' },
  ];
  return { score, ...map[score] };
}

export default function Register({ navigate }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await register(name, email, password, role);
      navigate(user.role === 'manager' ? 'manager-dashboard' : 'member-dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
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
            Join your team on the smarter<br />weekly reporting platform.
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
          <div style={{ marginBottom: '32px' }}>
            <p style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Get started
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.85rem', lineHeight: 1.15, marginBottom: '8px' }}>
              Create your account
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Free to use · No credit card required
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
            {/* Full Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="name"
                  type="text"
                  className="input-field"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '42px', paddingRight: '44px' }}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {password && (
                <div>
                  <div className="password-strength-bar">
                    <div
                      className="password-strength-fill"
                      style={{ width: `${(pwStrength.score / 5) * 100}%`, background: pwStrength.color }}
                    />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: pwStrength.color, marginTop: '4px', fontWeight: 600 }}>
                    {pwStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Role */}
            <div className="input-group" style={{ marginBottom: '28px' }}>
              <label className="input-label" htmlFor="role">Your Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { val: 'member', label: 'Team Member', sub: 'Submit weekly reports', icon: '👤' },
                  { val: 'manager', label: 'Manager', sub: 'View analytics & dashboard', icon: '⚡' },
                ].map(opt => (
                  <label
                    key={opt.val}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '12px 14px', borderRadius: 'var(--border-radius-sm)',
                      border: `1.5px solid ${role === opt.val ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'}`,
                      background: role === opt.val ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.val}
                      checked={role === opt.val}
                      onChange={() => setRole(opt.val)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{opt.icon} {opt.label}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.sub}</p>
                    </div>
                  </label>
                ))}
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
                  Creating account…
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          {/* Footer link */}
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a
              href="#login"
              onClick={(e) => { e.preventDefault(); navigate('login'); }}
              style={{ color: 'var(--accent-primary)', fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
