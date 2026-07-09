import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import MemberDashboard from './pages/MemberDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ProjectsManager from './pages/ProjectsManager';
import ChatWidget from './components/ChatWidget';
import { LogOut, Layers, Sun, Moon, LayoutDashboard, FolderKanban, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ─── Toast System ──────────────────────────────────────────── */
let _addToast = null;

export function showToast(message, type = 'info') {
  if (_addToast) _addToast(message, type);
}

function ToastManager() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => { _addToast = addToast; return () => { _addToast = null; }; }, [addToast]);

  const iconMap = {
    success: <CheckCircle size={18} />,
    danger: <AlertTriangle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast-icon" style={{ color: `var(--${toast.type === 'danger' ? 'danger' : toast.type === 'success' ? 'success' : toast.type === 'warning' ? 'warning' : 'info'})` }}>
            {iconMap[toast.type] || iconMap.info}
          </span>
          <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Avatar Initials Helper ────────────────────────────────── */
function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ─── Main App ──────────────────────────────────────────────── */
function AppContentWithTheme() {
  const { user, loading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [currentPage, setCurrentPage] = useState('login');
  const [activeWeek, setActiveWeek] = useState(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const currentWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(currentWeek).padStart(2, '0')}`;
  });

  const navigate = (page) => setCurrentPage(page);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (currentPage !== 'login' && currentPage !== 'register') setCurrentPage('login');
    } else {
      if (user.role === 'manager') {
        if (['login', 'register', 'member-dashboard'].includes(currentPage)) setCurrentPage('manager-dashboard');
      } else {
        if (currentPage !== 'member-dashboard') setCurrentPage('member-dashboard');
      }
    }
  }, [user, loading, currentPage]);

  if (loading) {
    return (
      <div className="flex justify-center align-center flex-col gap-2" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(99,102,241,0.4)',
            animation: 'float 2s ease-in-out infinite'
          }}>
            <Layers size={28} color="#fff" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>ReportHub</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Verifying credentials…</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--accent-primary)',
                animation: `pulseGlow 1.2s ease ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderActivePage = () => {
    switch (currentPage) {
      case 'login': return <Login navigate={navigate} />;
      case 'register': return <Register navigate={navigate} />;
      case 'member-dashboard': return <MemberDashboard />;
      case 'manager-dashboard': return <ManagerDashboard />;
      case 'projects-manager': return <ProjectsManager />;
      default: return <Login navigate={navigate} />;
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>
      <ToastManager />

      {/* ── NAVBAR ── */}
      {user && (
        <header className="navbar">
          <div className="container nav-container">

            {/* Logo */}
            <a
              href="#"
              className="nav-logo"
              onClick={(e) => { e.preventDefault(); navigate(user.role === 'manager' ? 'manager-dashboard' : 'member-dashboard'); }}
            >
              <Layers size={20} style={{ color: 'var(--accent-primary)', filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.6))' }} />
              <span>ReportHub</span>
            </a>

            {/* Nav Links */}
            <nav className="nav-links">
              {user.role === 'manager' && (
                <>
                  <a
                    href="#dashboard"
                    className={`nav-link ${currentPage === 'manager-dashboard' ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); navigate('manager-dashboard'); }}
                  >
                    <LayoutDashboard size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Dashboard
                  </a>
                  <a
                    href="#projects"
                    className={`nav-link ${currentPage === 'projects-manager' ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); navigate('projects-manager'); }}
                  >
                    <FolderKanban size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Projects
                  </a>
                </>
              )}

              <div className="nav-divider" />

              {/* Theme Toggle */}
              <button
                className="btn btn-ghost btn-icon"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* User Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="avatar avatar--sm" style={{ flexShrink: 0 }}>
                  {getInitials(user.name)}
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user.role === 'manager' ? '⚡ Manager' : '👤 Member'}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <button
                className="btn btn-secondary"
                onClick={logout}
                style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '5px' }}
                title="Sign Out"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* ── PAGE BODY ── */}
      {(currentPage === 'login' || currentPage === 'register') ? (
        <main className="flex-1" style={{ overflow: 'hidden' }}>
          {renderActivePage()}
        </main>
      ) : (
        <main className="container flex-1" style={{ paddingBottom: '80px' }}>
          {renderActivePage()}
        </main>
      )}

      {/* ── FOOTER ── */}
      {user && (
        <footer style={{
          borderTop: '1px solid var(--card-border)',
          padding: '16px 0',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <div className="container">
            <p>© 2026 ReportHub · Built for high-performance teams</p>
          </div>
        </footer>
      )}

      {/* ── AI CHAT WIDGET ── */}
      {user && user.role === 'manager' && (
        <ChatWidget activeWeek={activeWeek} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContentWithTheme />
      </AuthProvider>
    </ThemeProvider>
  );
}
