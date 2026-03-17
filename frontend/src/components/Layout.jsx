import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Guard: prevent ghost-click from opening panel right after navigation
  const [panelGuard, setPanelGuard] = useState(false);
  const searchRef = useRef(null);

  // Close sidebar on route change (mobile), and set a 500ms guard to block ghost-clicks
  useEffect(() => {
    setSidebarOpen(false);
    setShowProfilePanel(false);
    setShowNotifPanel(false);
    setPanelGuard(true);
    const t = setTimeout(() => setPanelGuard(false), 500);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await dashboardAPI.getSearchHistory(null, 8);
        setNotifications((res.data?.history || []).map(h => ({
          id: h._id, text: h.query?.substring(0, 70) || 'Activity',
          type: h.type, time: new Date(h.timestamp).toLocaleString(),
        })));
      } catch { setNotifications([]); }
    };
    loadNotifications();
  }, []);



  // Search
  const pages = [
    { name: 'AI Assistant', path: '/chatbot', keywords: 'chat bot assistant ai help' },
    { name: 'Crop Recommendation', path: '/crop-recommendation', keywords: 'crop recommend predict soil' },
    { name: 'Disease Detection', path: '/disease-detection', keywords: 'disease detect plant leaf' },
    { name: 'Weather Advisory', path: '/weather', keywords: 'weather forecast rain' },
    { name: 'Market Prices', path: '/market', keywords: 'market price mandi msp' },
    { name: 'Govt Policies', path: '/gov-policies', keywords: 'government policy scheme pm-kisan pmfby subsidy' },
    { name: 'Community Forum', path: '/community', keywords: 'community forum discuss' },
    { name: 'History', path: '/history', keywords: 'history past search' },
    { name: 'My Profile', path: '/profile', keywords: 'profile account settings' },
    { name: 'Dashboard', path: '/dashboard', keywords: 'dashboard home overview' },
  ];

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true);
    setSearchResults(pages.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) || p.keywords.includes(q.toLowerCase())
    ));
  };

  const handleSearchSelect = (path) => { navigate(path); setSearchQuery(''); setShowSearch(false); };



  const typeLabels = { chat: 'Chat', crop_prediction: 'Crop', disease_detection: 'Disease', weather: 'Weather', market: 'Market' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content" style={{
        flex: 1, minHeight: '100vh',
        background: 'var(--bg-body)', display: 'flex', flexDirection: 'column'
      }}>
        {/* ─── Top Bar ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 20px', background: 'white', borderBottom: '1px solid var(--border-light)',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          {/* Hamburger button — visible only on mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Search — at the left */}
          <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', border: '1px solid var(--border)',
              borderRadius: 10, background: 'var(--bg-input)'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a9a7a" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Search features..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', fontFamily: 'Inter' }} />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: 44, left: 0, right: 0,
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden', zIndex: 100
              }}>
                {searchResults.map(r => (
                  <div key={r.path} onClick={() => handleSearchSelect(r.path)}
                    style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, borderBottom: '1px solid #f0f0f0', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0faf0'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Notification button */}
          <button
            onClick={() => {
              if (panelGuard) return;
              setShowNotifPanel(!showNotifPanel);
              setShowProfilePanel(false);
            }}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)',
              background: 'white', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', position: 'relative',
              flexShrink: 0, touchAction: 'manipulation',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6a4a" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2, width: 16, height: 16,
                borderRadius: '50%', background: '#e53935', color: 'white',
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>{notifications.length}</span>
            )}
          </button>

          {/* Profile button */}
          <button
            onClick={() => {
              if (panelGuard) return;
              setShowProfilePanel(!showProfilePanel);
              setShowNotifPanel(false);
            }}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--gradient-primary)', border: 'none',
              color: 'white', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              touchAction: 'manipulation',  /* eliminates 300ms mobile tap delay */
            }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '16px' }}>
          <Outlet />
        </div>
      </main>

      {/* ─── NOTIFICATION SIDEBAR ─── */}
      {showNotifPanel && <div onClick={() => setShowNotifPanel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 499 }} />}
      <div className="notif-panel-drawer" style={{
        position: 'fixed', top: 0, right: showNotifPanel ? 0 : '-100%', width: 'min(400px, 100vw)',
        height: '100vh', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 500, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Notifications</h2>
          <button
            onClick={() => setShowNotifPanel(false)}
            style={{
              width: 40, height: 40, borderRadius: 10,
              border: '1px solid #eee', background: '#f9f9f9',
              cursor: 'pointer', fontSize: 20, color: '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'manipulation',
            }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>No recent notifications</div>
          ) : notifications.map(n => (
            <div key={n.id} style={{
              padding: '16px 24px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 14, alignItems: 'flex-start',
              transition: 'background 0.15s', cursor: 'pointer'
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8faf8'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#f0f5f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#1a2e1a', marginBottom: 4, lineHeight: 1.4 }}>{n.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f0f5f0', fontSize: 10, fontWeight: 600, color: '#2d7a3a' }}>
                    {typeLabels[n.type] || 'Activity'}
                  </span>
                  <span style={{ fontSize: 11, color: '#999' }}>{n.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div onClick={() => { navigate('/history'); setShowNotifPanel(false); }}
          style={{
            padding: '14px 24px', borderTop: '1px solid #eee', textAlign: 'center',
            fontSize: 13, color: '#2d7a3a', fontWeight: 600, cursor: 'pointer'
          }}>
          View All History →
        </div>
      </div>

      {/* ─── PROFILE SIDEBAR ─── */}
      {showProfilePanel && <div onClick={() => setShowProfilePanel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 499 }} />}
      <div className="profile-panel-drawer" style={{
        position: 'fixed', top: 0, right: showProfilePanel ? 0 : '-100%', width: 'min(380px, 100vw)',
        height: '100vh', background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 500, transition: 'right 0.3s ease', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>My Profile</h2>
          <button
            onClick={() => setShowProfilePanel(false)}
            style={{
              width: 44, height: 44, borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#f9fafb',
              cursor: 'pointer', fontSize: 22, color: '#374151', fontWeight: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'manipulation', lineHeight: 1,
            }}>×</button>
        </div>
        <div style={{ padding: 24 }}>
          {/* Avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: 'white'
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a2e1a' }}>{user?.name || 'User'}</h3>
              <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{user?.email}</p>
              <span style={{
                display: 'inline-block', marginTop: 4, padding: '3px 10px',
                borderRadius: 6, background: '#e8f5e9', color: '#2d7a3a',
                fontSize: 11, fontWeight: 600, textTransform: 'capitalize'
              }}>{user?.role}</span>
            </div>
          </div>

          {/* Quick Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Location', value: [user?.location?.city, user?.location?.state].filter(Boolean).join(', ') || 'Not set' },
              { label: 'Language', value: { en: 'English', hi: 'Hindi', pa: 'Punjabi', mr: 'Marathi', ta: 'Tamil' }[user?.language] || 'English' },
              { label: 'Soil Type', value: user?.farm_details?.soil_type || 'Not set' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#666' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 28 }}>
            {[
              { label: 'My Profile', path: '/profile', icon: '→' },
              { label: 'Activity History', path: '/history', icon: '→' },
              ...(user?.role === 'admin' ? [{ label: 'Admin Panel', path: '/admin', icon: '→' }] : []),
            ].map(a => (
              <button key={a.label}
                onClick={() => { navigate(a.path); setShowProfilePanel(false); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 10, border: '1px solid #eee',
                  background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  transition: 'background 0.15s', width: '100%', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faf8'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                {a.label}
                <span style={{ color: '#999' }}>{a.icon}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 'auto', padding: '16px 24px', borderTop: '1px solid #eee' }}>
          <button onClick={() => { logout(); navigate('/'); }}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              border: '1px solid #fecaca', background: '#fef2f2',
              color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
            Sign Out
          </button>
        </div>
      </div>

    </div>
  );
}

