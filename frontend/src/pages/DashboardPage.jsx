import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, weatherAPI } from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [weather, setWeather] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, actRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getActivity(7)
        ]);
        setStats(statsRes.data);
        setActivities(actRes.data?.activities?.slice(0, 6) || []);
      } catch { /* ignore */ }

      const city = user?.location?.city || user?.location?.state || 'Delhi';
      if (city) {
        try {
          const wRes = await weatherAPI.getCurrent(city);
          if (!wRes.data.error) setWeather(wRes.data);
        } catch { /* ignore */ }
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  const featureCards = [
    {
      title: 'Crop Recommendation', desc: 'AI-powered crop suggestions based on soil & climate',
      path: '/crop-recommendation', color: '#e8f5e9', accent: '#2d7a3a',
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="1.8"><path d="M7 20h10M12 20v-8" /><path d="M12 12C12 12 6 8 6 4c0-1.5 1.5-3 3-3 1.5 0 3 2 3 2s1.5-2 3-2c1.5 0 3 1.5 3 3 0 4-6 8-6 8z" /></svg>
    },
    {
      title: 'Disease Detection', desc: 'Upload leaf image for AI plant disease analysis',
      path: '/disease-detection', color: '#fff3e0', accent: '#e65100',
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6M8 11h6" /></svg>
    },
    {
      title: 'AI Assistant', desc: 'Chat with AI expert — voice & text support',
      path: '/chatbot', color: '#e3f2fd', accent: '#1565c0',
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    },
    {
      title: 'Weather Forecast', desc: 'Real-time weather data for your location',
      path: '/weather', color: '#fce4ec', accent: '#c62828',
      icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="1.8"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" /></svg>
    },
  ];

  const quickActions = [
    {
      label: 'Market Prices', desc: 'Current mandi & MSP rates', path: '/market',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a6a4a" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
    },
    {
      label: 'Community', desc: 'Farmer discussions', path: '/community',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a6a4a" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    },
    {
      label: 'History', desc: 'Your activity log', path: '/history',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a6a4a" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    },
    {
      label: 'My Profile', desc: 'Manage your account', path: '/profile',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a6a4a" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    },
  ];

  const typeIcons  = { chat: '💬', crop_prediction: '🌾', disease_detection: '🔬', weather: '🌤️', market: '📊' };
  const typeColors  = { chat: '#2d7a3a', crop_prediction: '#4caf50', disease_detection: '#f5a623', weather: '#1e88e5', market: '#e53935' };
  const typeLabels  = { chat: 'Chat', crop_prediction: 'Crop', disease_detection: 'Disease', weather: 'Weather', market: 'Market' };

  if (loading) {
    return <div className="flex-center" style={{ height: '60vh' }}><div className="spinner" /></div>;
  }

  return (
    <div className="animate-fadeIn">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit', color: '#1a2e1a' }}>
          Welcome back, <span style={{ color: 'var(--primary)' }}>{firstName}</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          Here's your farming dashboard for today
        </p>
      </div>

      {/* Feature Cards */}
      <div className="dash-feature-grid" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
        {featureCards.map(card => (
          <div key={card.title} onClick={() => navigate(card.path)}
            style={{
              cursor: 'pointer', padding: '24px 20px', borderRadius: 16,
              background: 'white', border: `1.5px solid ${card.color}`,
              transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 28px ${card.accent}20`;
              e.currentTarget.style.borderColor = card.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = card.color;
            }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: card.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              border: `1px solid ${card.accent}25`
            }}>{card.icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#1a2e1a' }}>{card.title}</h3>
            <p style={{ fontSize: 12, color: '#6a8a6a', lineHeight: 1.4 }}>{card.desc}</p>
            <svg style={{ position: 'absolute', top: 20, right: 16, opacity: 0.3 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={card.accent} strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
        ))}
      </div>

      {/* Stats + Weather Row */}
      <div className="dash-stats-grid" style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        {/* Activity Summary */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
            Activity Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Chat Queries', value: stats?.total_chats || 0 },
              { label: 'Crop Predictions', value: stats?.crop_predictions || 0 },
              { label: 'Disease Scans', value: stats?.disease_detections || 0 },
              { label: 'Weather Checks', value: stats?.weather_checks || 0 },
              { label: 'Market Searches', value: stats?.market_searches || 0 },
              { label: 'This Week', value: stats?.recent_activity || 0 },
            ].map(s => (
              <div key={s.label} style={{
                padding: 14, borderRadius: 10, background: 'var(--bg-input)', textAlign: 'center',
                border: '1px solid var(--border-light)'
              }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #f5f9f5, #fff8e1)', border: '1px solid #e0e8d8' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" /></svg>
            Today's Weather
          </h3>
          {weather ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 48, lineHeight: 1 }}>{weather.icon || '🌤️'}</div>
                <div>
                  <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: '#1a2e1a' }}>{weather.temperature}°C</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: 2 }}>{weather.description}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{weather.city}{weather.state ? `, ${weather.state}` : ''}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Humidity', value: `${weather.humidity}%` },
                  { label: 'Wind', value: `${weather.wind_speed} km/h` },
                  { label: 'Feels Like', value: `${weather.feels_like}°C` },
                ].map(w => (
                  <div key={w.label} style={{ padding: 10, borderRadius: 8, background: 'white', textAlign: 'center', border: '1px solid #e8e8e8' }}>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{w.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2e1a', marginTop: 2 }}>{w.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
              <p>Weather data not available</p>
              <button onClick={() => navigate('/weather')} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                Check Weather
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1a2e1a' }}>Quick Actions</h3>
      <div className="dash-quick-grid" style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        {quickActions.map(a => (
          <div key={a.label} className="card card-hover" onClick={() => navigate(a.path)}
            style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: 16,
              transition: 'transform 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#e8f5e9',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>{a.icon}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13, color: '#1a2e1a' }}>{a.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12, color: '#1a2e1a' }}>📋 Recent Activity</h3>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activities.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
            No recent activity. Start exploring the features above!
          </div>
        ) : (
          activities.map((act, i) => {
            const accent = typeColors[act.type] || ['#2d7a3a','#1565c0','#7b1fa2','#e65100','#e53935'][i % 5];
            const emoji  = typeIcons[act.type] || '📋';
            return (
              <div key={i} style={{
                padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < activities.length - 1 ? '1px solid var(--border-light)' : 'none',
                borderLeft: `3px solid ${accent}`, transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: `${accent}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{emoji}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e1a', margin: 0 }}>{act.query?.substring(0, 80)}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    {new Date(act.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: `${accent}12`, color: accent,
                }}>
                  {typeLabels[act.type] || 'Activity'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
