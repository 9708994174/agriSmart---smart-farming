import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Farmer nav items ──────────────────────────────────────
const farmerItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/chatbot', label: 'AI Assistant', icon: 'message' },
  { path: '/crop-recommendation', label: 'Crop Recommend', icon: 'leaf' },
  { path: '/disease-detection', label: 'Disease Detection', icon: 'scan' },
  { path: '/weather', label: 'Weather', icon: 'cloud' },
  { path: '/market', label: 'Market Prices', icon: 'chart' },
  { path: '/gov-policies', label: 'Govt Policies', icon: 'policy' },
  { path: '/community', label: 'Community', icon: 'users' },
];

const farmerBottomItems = [
  { path: '/history', label: 'History', icon: 'clock' },
  { path: '/profile', label: 'My Profile', icon: 'user' },
];

// ── Admin nav items (section query param navigation) ──────
const adminItems = [
  { section: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { section: 'farmers', label: 'Users Management', icon: 'users' },
  { section: 'crop-dataset', label: 'Crop Dataset', icon: 'leaf' },
  { section: 'disease-dataset', label: 'Disease Dataset', icon: 'scan' },
  { section: 'weather', label: 'Weather', icon: 'cloud' },
  { section: 'market', label: 'Market Prices', icon: 'chart' },
  { section: 'chatbot-monitoring', label: 'Chatbot Monitoring', icon: 'message' },
  { section: 'feedback', label: 'Feedback & Reports', icon: 'feedback' },
  { section: 'system-analytics', label: 'System Analytics', icon: 'analytics' },
  { section: 'profile', label: 'My Profile', icon: 'user' },
  { section: 'settings', label: 'Settings', icon: 'settings' },
];

// ── SVG icon library ─────────────────────────────────────
const NavIcon = ({ type, size = 18 }) => {
  const s = size;
  const icons = {
    grid: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    message: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    leaf: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 4 20 4s.5 4.5-1.5 10.2A7 7 0 0 1 11 20z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
    scan: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    cloud: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    chart: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    users: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    clock: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    user: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    feedback: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    analytics: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    settings: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    policy: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    logout: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };
  return icons[type] || null;
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminPage = location.pathname === '/admin';
  const searchParams = new URLSearchParams(location.search);
  const activeSection = searchParams.get('s') || 'dashboard';

  const handleLogout = () => { logout(); navigate('/login'); };

  if (isAdminPage) {
    // ── ADMIN sidebar ─────────────────────────────────
    return (
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Mobile close button */}
        <button className="sidebar-close-btn" onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, width: 32, height: 32,
          border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: 8,
          color: '#c8e6c9', fontSize: 18, cursor: 'pointer', display: 'none',
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>✕</button>
        <Link to="/admin?s=dashboard" className="sidebar-logo">
          <h1>AGRISMART</h1>
        </Link>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Admin Panel</p>
          {adminItems.map(item => {
            const isActive = activeSection === item.section;
            return (
              <Link
                key={item.section}
                to={`/admin?s=${item.section}`}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
            <div className="sidebar-user-info">
              <p>{user?.name || 'Admin'}</p>
              <p>Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(200,230,201,0.2)', background: 'rgba(200,230,201,0.08)',
            color: '#c8e6c9', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            <NavIcon type="logout" size={14} />
            Sign Out
          </button>
        </div>
      </aside>
    );
  }

  // ── FARMER sidebar ──────────────────────────────────────
  const items = user?.role === 'admin'
    ? [...farmerItems, { path: '/admin', label: 'Admin Panel', icon: 'settings' }]
    : farmerItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Mobile close button */}
      <button className="sidebar-close-btn" onClick={onClose} style={{
        position: 'absolute', top: 12, right: 12, width: 32, height: 32,
        border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: 8,
        color: '#c8e6c9', fontSize: 18, cursor: 'pointer', display: 'none',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
      }}>✕</button>
      <Link to="/dashboard" className="sidebar-logo">
        <h1>AGRISMART</h1>
      </Link>

      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Main Menu</p>
        {items.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <NavIcon type={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <p className="sidebar-section-label" style={{ marginTop: 16 }}>Account</p>
        {farmerBottomItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <NavIcon type={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <p>{user?.name || 'User'}</p>
            <p>{user?.role || 'farmer'}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '8px 12px', borderRadius: 8,
          border: '1px solid rgba(200,230,201,0.2)', background: 'rgba(200,230,201,0.08)',
          color: '#c8e6c9', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
        }}>
          <NavIcon type="logout" size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
