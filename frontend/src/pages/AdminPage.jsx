import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

/* ═══════════════════════════════════════════════════
   AgriSmart Admin Dashboard
   Matches reference design: left sidebar + main content + right panel
══════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { id: 'dashboard',          label: 'Dashboard',          emoji: '🏠' },
  { id: 'farmers',            label: 'Farmers Management', emoji: '👨‍🌾' },
  { id: 'crop-dataset',       label: 'Crop Dataset',       emoji: '🌾' },
  { id: 'disease-dataset',    label: 'Disease Dataset',    emoji: '🔬', hasSub: true },
  { id: 'weather',            label: 'Weather Integration',emoji: '🌤️' },
  { id: 'market',             label: 'Market Prices',      emoji: '📈' },
  { id: 'chatbot-monitoring', label: 'Chatbot Monitoring', emoji: '💬' },
  { id: 'feedback',           label: 'Feedback & Reports', emoji: '📋' },
  { id: 'system-analytics',   label: 'System Analytics',   emoji: '📊' },
  { id: 'settings',           label: 'Settings',           emoji: '⚙️' },
];

const CROP_DATA = [
  { disease: 'Rice',      sel_ph: '6.0–1.0', miragen: '660,50', phon: '7ik,120', icon: '🌾' },
  { disease: 'Maize',     sel_ph: '6.0–1.0', miragen: '649,50', phon: '21k,130', icon: '🌽' },
  { disease: 'Sugarcane', sel_ph: '6.0–1.0', miragen: '640,50', phon: '5k,310',  icon: '🎋' },
  { disease: 'Wheat',     sel_ph: '6.5–1.0', miragen: '610,40', phon: '9k,200',  icon: '🌿' },
  { disease: 'Cotton',    sel_ph: '5.5–1.0', miragen: '670,55', phon: '14k,180', icon: '☁️' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [chatbotStats, setChatbotStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stateFilter, setStateFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, cRes, aRes] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/dashboard/admin/users'),
        api.get('/dashboard/admin/chatbot-stats'),
        api.get('/dashboard/admin/recent-activity'),
      ]);
      setStats(sRes.data);
      setUsers(uRes.data?.users || []);
      setChatbotStats(cRes.data);
      setRecentActivity(aRes.data?.activities || []);
    } catch { /* use zeros */ }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.append('state', stateFilter);
      if (cropFilter) params.append('crop', cropFilter);
      const res = await api.get(`/dashboard/admin/users?${params}`);
      setUsers(res.data?.users || []);
    } catch { /* ignore */ }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get('/dashboard/admin/users/export-csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'farmers.csv'; a.click();
    } catch { alert('Export failed. Please try again.'); }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) ||
      u.location?.city?.toLowerCase().includes(q);
  });

  const formatId = (id) => id ? id.toString().slice(-7).toUpperCase() : '0000000';
  const timeAgo = (ts) => {
    if (!ts) return 'N/A';
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h} hrs ago`;
    return `${Math.floor(h / 24)} days ago`;
  };

  // ─── Mini Line Chart (SVG) ─────────────────────────────────────────
  const MiniLineChart = ({ data = [], color = '#2d7a3a', height = 80 }) => {
    if (!data.length) return null;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const w = 100 / (data.length - 1 || 1);
    const points = data.map((d, i) => `${i * w},${height - (d.count / maxVal) * (height - 10)}`).join(' ');
    return (
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
        <polygon
          fill={`url(#grad-${color.replace('#', '')})`}
          points={`0,${height} ${points} ${(data.length - 1) * w},${height}`}
        />
        {data.map((d, i) => (
          <circle key={i} cx={i * w} cy={height - (d.count / maxVal) * (height - 10)} r="2" fill={color} />
        ))}
      </svg>
    );
  };

  const s = stats || {};

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif", background: '#f4f6f5'
    }}>

      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'linear-gradient(180deg, #1a3a1a 0%, #0f2410 100%)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '4px 0 20px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4caf50, #2d7a3a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
            }}>🌿</div>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>AgriSmart</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0 }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV_ITEMS.map(item => {
            const active = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: active ? 'rgba(76,175,80,0.18)' : 'transparent',
                  borderLeft: active ? '3px solid #4caf50' : '3px solid transparent',
                  borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                  color: active ? '#8bc34a' : 'rgba(255,255,255,0.65)',
                  fontSize: 12.5, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s', fontFamily: 'Inter'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: 15 }}>{item.emoji}</span>
                <span>{item.label}</span>
                {item.hasSub && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>›</span>}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#e53935', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
            <div>
              <p style={{ color: 'white', fontSize: 12, fontWeight: 600, margin: 0 }}>{user?.name || 'Admin'}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Administrator</p>
            </div>
            <button onClick={() => navigate('/dashboard')} title="Back to farmer view"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}>↗</button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Header */}
        <header style={{
          background: 'white', borderBottom: '1px solid #e8ede8',
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>
              📍 {user?.location?.city || 'India'}, {user?.location?.state || 'National'} &nbsp;|&nbsp;
              📅 {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a2e1a', margin: 0 }}>
              Welcome, <span style={{ color: '#2d7a3a' }}>{user?.name || 'Admin'}!</span>
            </h1>
          </div>
          {/* Search */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <input placeholder="Search farmers, crops..."
              style={{
                padding: '8px 14px 8px 32px', border: '1px solid #e0e8e0', borderRadius: 20,
                fontSize: 12, outline: 'none', width: 200, background: '#f8fdf8', fontFamily: 'Inter'
              }} />
            <span style={{ position: 'absolute', left: 10, top: 9, fontSize: 13, color: '#888' }}>🔍</span>
          </div>
          {/* Action Buttons */}
          <button style={{
            width: 34, height: 34, borderRadius: '50%', border: '1px solid #e0e8e0',
            background: 'white', cursor: 'pointer', fontSize: 15, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }} title="Notifications">🔔</button>
          <button onClick={loadAll} style={{
            width: 34, height: 34, borderRadius: '50%', border: '1px solid #e0e8e0',
            background: 'white', cursor: 'pointer', fontSize: 15, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }} title="Refresh">⚙️</button>
        </header>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── STAT CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              {
                title: 'Total Farmers Registered', value: (s.total_farmers || 0).toLocaleString(),
                icon: '👨‍🌾', growth: '+5.3%', period: 'vs last month', color: '#1e88e5',
                bg: 'linear-gradient(135deg, #e3f2fd, #e8f4fd)',
                sub: `Tegmaish: 1lek farmers`,
                chart: chatbotStats?.daily_queries || [],
              },
              {
                title: 'Chatbot Queries Today', value: (s.today_queries || 0).toLocaleString(),
                icon: '💬', growth: '+6.6%', period: 'from yesterday', color: '#7b1fa2',
                bg: 'linear-gradient(135deg, #f3e5f5, #ede7f6)',
                sub: `Month total: ${(s.chatbot_queries_month || 0).toLocaleString()}`,
                chart: chatbotStats?.daily_queries || [],
              },
              {
                title: 'Crop Predictions Today', value: (s.crop_predictions_today || 0).toLocaleString(),
                icon: '🌾', growth: '+4.4%', period: 'vs yesterday', color: '#2d7a3a',
                bg: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)',
                sub: `Total predictions: ${(s.total_predictions || 0).toLocaleString()}`,
                chart: chatbotStats?.disease_daily || [],
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: card.bg, borderRadius: 14, padding: 18,
                border: `1px solid ${card.color}18`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px', fontWeight: 500 }}>{card.title}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: card.color }}>{card.value}</span>
                      <span style={{ fontSize: 10, color: '#666' }}>users</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: '#e8f5e9', color: '#2d7a3a'
                      }}>{card.growth}</span>
                      <span style={{ fontSize: 10, color: '#888' }}>{card.period}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 26 }}>{card.icon}</span>
                </div>
                <div style={{ height: 45, marginTop: 8 }}>
                  <MiniLineChart data={card.chart.length ? card.chart : Array(7).fill({ count: Math.floor(Math.random() * 50) })} color={card.color} height={45} />
                </div>
                <p style={{ fontSize: 10, color: '#888', marginTop: 4, margin: '4px 0 0' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── MANAGE FARMERS TABLE ── */}
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #e8ede8',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: 20, overflow: 'hidden'
          }}>
            {/* Table Header */}
            <div style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center',
              gap: 12, borderBottom: '1px solid #f0f4f0', flexWrap: 'wrap'
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2e1a', margin: 0, marginRight: 'auto' }}>
                Manage Farmers
              </h3>
              {/* Filters */}
              <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid #dde8dd',
                  fontSize: 12, color: '#444', fontFamily: 'Inter', background: '#f8fdf8', cursor: 'pointer'
                }}>
                <option value="">State ▼</option>
                {['Punjab', 'Haryana', 'UP', 'Maharashtra', 'Karnataka', 'Rajasthan', 'MP'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={cropFilter} onChange={e => setCropFilter(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid #dde8dd',
                  fontSize: 12, color: '#444', fontFamily: 'Inter', background: '#f8fdf8', cursor: 'pointer'
                }}>
                <option value="">Wheat ▼</option>
                {['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Soybean'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={() => { loadUsers(); }}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #dde8dd',
                  background: '#f8fdf8', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter'
                }}>Apply</button>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 28px', border: '1px solid #dde8dd',
                    borderRadius: 8, fontSize: 12, outline: 'none', width: 160, fontFamily: 'Inter'
                  }} />
                <span style={{ position: 'absolute', left: 8, top: 7, fontSize: 12, color: '#999' }}>🔍</span>
              </div>
              <button onClick={exportCSV}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #2d7a3a, #1b5a28)',
                  color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter'
                }}>
                ⬇ Export CSV
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fdf8' }}>
                    {['Farmer ID', 'Name', 'Email', 'Phone', 'Location', 'Crop Type', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', fontSize: 11, fontWeight: 600, textAlign: 'left',
                        color: '#666', borderBottom: '1px solid #e8ede8', whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#999', fontSize: 13 }}>Loading farmers...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
                      <p style={{ fontSize: 28, marginBottom: 8 }}>👨‍🌾</p>
                      <p>No farmers found</p>
                    </td></tr>
                  ) : filteredUsers.slice(0, 8).map((farmer, i) => {
                    const crops = farmer.farm_details?.crops;
                    const cropStr = Array.isArray(crops) ? crops.slice(0, 2).join(', ') : (crops || 'N/A');
                    const loc = farmer.location;
                    const locStr = loc?.city ? `${loc.city}, ${loc.state || ''}` : loc?.state || 'N/A';
                    return (
                      <tr key={i}
                        style={{ borderBottom: '1px solid #f0f4f0', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fdf8'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                          {formatId(farmer._id)}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: farmer.role === 'admin' ? '#e53935' : 'linear-gradient(135deg, #2d7a3a, #1b5a28)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: 11, fontWeight: 700
                            }}>{farmer.name?.charAt(0)?.toUpperCase() || '?'}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2e1a' }}>{farmer.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#555', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{farmer.email}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#555' }}>{farmer.phone || 'N/A'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#555' }}>{locStr}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: '#e8f5e9', color: '#2d7a3a'
                          }}>🌾 {cropStr || 'N/A'}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={{
                              padding: '4px 10px', borderRadius: 6, border: '1px solid #dde8dd',
                              background: '#f8fdf8', fontSize: 11, cursor: 'pointer', color: '#2d7a3a', fontWeight: 600
                            }}>View</button>
                            <button style={{
                              padding: '4px 8px', borderRadius: 6, border: '1px solid #dde8dd',
                              background: '#f8fdf8', fontSize: 11, cursor: 'pointer', color: '#555'
                            }}>✏</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length > 8 && (
                <div style={{ padding: '10px 20px', textAlign: 'center', borderTop: '1px solid #f0f4f0' }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Showing 8 of {filteredUsers.length} farmers</span>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM ROW: Chart + Crop Dataset ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Insights & Analytics Chart */}
            <div style={{
              background: 'white', borderRadius: 14, border: '1px solid #e8ede8',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', padding: 18, overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>Insights & Analytics</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { label: 'Chatbot Queries', color: '#1e88e5' },
                    { label: 'Stations', color: '#9c27b0' },
                    { label: 'Detections', color: '#ff7043' },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#666' }}>
                      <div style={{ width: 8, height: 2, borderRadius: 1, background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
              {/* Y-axis labels + chart */}
              <div style={{ position: 'relative', height: 110 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20 }}>
                  {['85.6k', '50k', '39.9k', '30.8k'].map(v => (
                    <span key={v} style={{ fontSize: 9, color: '#aaa' }}>{v}</span>
                  ))}
                </div>
                <div style={{ marginLeft: 30, height: '100%' }}>
                  <svg viewBox="0 0 300 80" style={{ width: '100%', height: 90 }} preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 25, 50, 75].map(y => (
                      <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f0f4f0" strokeWidth="0.5" />
                    ))}
                    {/* Chatbot queries line */}
                    <polyline fill="none" stroke="#1e88e5" strokeWidth="1.5"
                      points={chatbotStats?.daily_queries?.map((d, i, arr) =>
                        `${i * (300 / (arr.length - 1 || 1))},${70 - (d.count / (Math.max(...arr.map(x => x.count), 1))) * 60}`
                      ).join(' ') || '0,60 50,45 100,50 150,30 200,35 250,20 300,25'} />
                    {/* Detection line */}
                    <polyline fill="none" stroke="#ff7043" strokeWidth="1.5"
                      points={chatbotStats?.disease_daily?.map((d, i, arr) =>
                        `${i * (300 / (arr.length - 1 || 1))},${70 - (d.count / (Math.max(...arr.map(x => x.count), 1))) * 50}`
                      ).join(' ') || '0,70 50,65 100,60 150,55 200,50 250,45 300,40'} />
                  </svg>
                  {/* X axis dates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {(chatbotStats?.daily_queries || Array(7).fill({ date: '' })).map((d, i) => (
                      <span key={i} style={{ fontSize: 9, color: '#aaa' }}>{d.date?.split(' ')[1] || `Apr ${i + 1}`}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Crop Dataset Management */}
            <div style={{
              background: 'white', borderRadius: 14, border: '1px solid #e8ede8',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden'
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f4f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>Crop Dataset Management</h3>
                <button onClick={exportCSV} style={{
                  padding: '4px 10px', borderRadius: 6, border: '1px solid #e0e8e0',
                  background: '#f8fdf8', fontSize: 10, cursor: 'pointer', color: '#2d7a3a'
                }}>⬇ Export</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fdf8' }}>
                    {['Disease', 'Sel. pH', 'Miragen', 'Phono.'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontSize: 10, fontWeight: 600, textAlign: 'left', color: '#666', borderBottom: '1px solid #e8ede8' }}>{h}</th>
                    ))}
                    <th style={{ padding: '8px 14px', fontSize: 10, fontWeight: 600, color: '#666', borderBottom: '1px solid #e8ede8' }}>Act.</th>
                  </tr>
                </thead>
                <tbody>
                  {CROP_DATA.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f4f0' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fdf8'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#1a2e1a' }}>
                        {row.icon} {row.disease}
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: 11, color: '#555' }}>{row.sel_ph}</td>
                      <td style={{ padding: '8px 14px', fontSize: 11, color: '#555' }}>{row.miragen}</td>
                      <td style={{ padding: '8px 14px', fontSize: 11, color: '#555' }}>{row.phon}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <button style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          fontSize: 14, color: '#e53935'
                        }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>{/* end scrollable content */}
      </main>

      {/* ═══ RIGHT PANEL ═══ */}
      <aside style={{
        width: 250, flexShrink: 0, background: 'white',
        borderLeft: '1px solid #e8ede8', overflowY: 'auto', display: 'flex', flexDirection: 'column'
      }}>

        {/* Analytics & Reports */}
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f0f4f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>Analytics & Reports</h3>
            <span style={{ fontSize: 10, color: '#888' }}>● 3 notifications</span>
          </div>

          {/* Most asked question */}
          <div style={{
            padding: '10px 12px', borderRadius: 10, marginBottom: 12,
            background: '#f0faf0', border: '1px solid #c8e6c9'
          }}>
            <p style={{ fontSize: 10, color: '#2d7a3a', fontWeight: 700, margin: '0 0 4px' }}>
              ✦ Most Asked Question This Week
            </p>
            <p style={{ fontSize: 11, color: '#1a2e1a', margin: 0, lineHeight: 1.4 }}>
              What crop should I grow in Punjab? 🌾
            </p>
          </div>

          {/* Metric cards */}
          {[
            {
              title: 'New Crops Added', subtitle: 'this Month',
              value: (s.new_this_month || 3220).toLocaleString(),
              badge: 'Increase', growth: '+5.2%', icon: '🌱',
              color: '#2d7a3a', bg: '#e8f5e9'
            },
            {
              title: 'Chatbot Queries', subtitle: 'this Month',
              value: (s.chatbot_queries_month || 76450).toLocaleString(),
              badge: 'Vligius', growth: '↑7.8%', icon: '💬',
              color: '#7b1fa2', bg: '#f3e5f5'
            },
            {
              title: 'Disease Detections', subtitle: 'this Month',
              value: (s.total_disease_detections || 6540).toLocaleString(),
              badge: 'Increase', growth: '+6.1%', icon: '🔬',
              color: '#e65100', bg: '#fff3e0'
            },
          ].map((m, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < 2 ? '1px solid #f0f4f0' : 'none'
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: m.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16
                }}>{m.icon}</div>
                <div>
                  <p style={{ fontSize: 11, color: '#333', fontWeight: 600, margin: 0 }}>{m.title}</p>
                  <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{m.subtitle}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: m.color, margin: 0 }}>{m.value}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 4,
                    background: m.bg, color: m.color, fontWeight: 700
                  }}>{m.badge}</span>
                  <span style={{ fontSize: 9, color: m.color }}>{m.growth}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insights & Analytics feed */}
        <div style={{ padding: '12px 16px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#1a2e1a' }}>Insights & Analytics</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10 }}>
              <span style={{ padding: '2px 8px', borderRadius: 10, background: '#e8f5e9', color: '#2d7a3a', fontWeight: 600, fontSize: 9 }}>As Label</span>
              <span style={{ color: '#888' }}>Crop Dataset</span>
              <button style={{ fontSize: 10, background: 'none', border: 'none', color: '#2d7a3a', cursor: 'pointer', fontWeight: 600 }}>View All ↗</button>
            </div>
          </div>

          {/* Activity items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(recentActivity.length > 0 ? recentActivity : [
              { icon: '👤', text: 'Admin updated crop dataset', time: '' },
              { icon: '🌤️', text: 'Weather API key updated', time: '' },
              { icon: '🌾', text: 'Farmer Akshat Yadav account registered', time: '' },
              { icon: '🔬', text: 'Disease dataset backed up', time: '' },
              { icon: '📊', text: 'Monthly report generated', time: '' },
            ]).map((act, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
                borderBottom: i < 4 ? '1px solid #f0f4f0' : 'none'
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: '#f0faf0', border: '1px solid #c8e6c9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                }}>{act.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: '#1a2e1a', margin: 0, lineHeight: 1.35 }}>{act.text}</p>
                  {act.time && <p style={{ fontSize: 9, color: '#aaa', margin: '2px 0 0' }}>{timeAgo(act.time)}</p>}
                </div>
              </div>
            ))}
            <button style={{
              marginTop: 8, fontSize: 11, color: '#2d7a3a', background: 'none',
              border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'center', width: '100%'
            }}>View All ↓</button>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
