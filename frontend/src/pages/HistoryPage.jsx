import { useState, useEffect } from 'react';
import { dashboardAPI, feedbackAPI } from '../services/api';

const TYPE_META = {
  chat:             { icon: '💬', color: '#2d7a3a', label: 'Chat' },
  crop_prediction:  { icon: '🌾', color: '#4caf50', label: 'Crop' },
  disease_detection:{ icon: '🔬', color: '#f5a623', label: 'Disease' },
  weather:          { icon: '🌤️', color: '#1e88e5', label: 'Weather' },
  market:           { icon: '📊', color: '#e53935', label: 'Market' },
};

/** Format a UTC ISO string to readable local date + time */
function formatDateTime(isoStr) {
  if (!isoStr) return 'Unknown time';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return isoStr;
  }
}

/** Relative time (e.g. "5m ago") — only for recent items */
function timeAgo(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(isoStr);
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function HistoryPage() {
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [deleting, setDeleting]     = useState('');

  // Feedback modal
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbType, setFbType]         = useState('general');
  const [fbRating, setFbRating]     = useState(0);
  const [fbHover, setFbHover]       = useState(0);   // hover state for star rating
  const [fbContent, setFbContent]   = useState('');
  const [fbPage, setFbPage]         = useState('History');
  const [fbLoading, setFbLoading]   = useState(false);
  const [fbSuccess, setFbSuccess]   = useState('');
  const [fbError, setFbError]       = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  useEffect(() => { loadHistory(); }, [filter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const type = filter === 'all' ? undefined : filter;
      const res = await dashboardAPI.getSearchHistory(type, 50);
      setHistory(res.data?.history || []);
    } catch { setHistory([]); }
    finally { setLoading(false); }
  };

  const deleteItem = async (id) => {
    setDeleting(id);
    try {
      await dashboardAPI.deleteHistoryItem(id);
      setHistory(prev => prev.filter(h => h._id !== id));
    } catch { alert('Failed to delete item'); }
    setDeleting('');
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    try {
      await dashboardAPI.clearHistory();
      setHistory([]);
    } catch { alert('Failed to clear history'); }
  };

  const openFeedback = () => {
    setFbType('general');
    setFbRating(0);
    setFbHover(0);
    setFbContent('');
    setFbPage('History');
    setFbSuccess('');
    setFbError('');
    setSubmittedAt('');
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    if (!fbContent.trim()) { setFbError('Please enter your feedback.'); return; }
    if (fbRating === 0) { setFbError('Please select a rating (1–5 stars).'); return; }

    setFbLoading(true); setFbError(''); setFbSuccess('');
    try {
      const res = await feedbackAPI.submit({
        type: fbType,
        rating: fbRating,
        content: fbContent,
        page: fbPage,
      });

      // Use the server-returned timestamp OR current local time as fallback
      const ts = res.data?.submitted_at
        ? formatDateTime(res.data.submitted_at)
        : formatDateTime(new Date().toISOString());

      setSubmittedAt(ts);
      setFbSuccess(`✅ Feedback submitted on ${ts}`);
      setFbContent('');
      setFbRating(0);
      setFbType('general');
      setTimeout(() => { setShowFeedback(false); setFbSuccess(''); setSubmittedAt(''); }, 3500);
    } catch (e) {
      setFbError(e.response?.data?.detail || 'Submission failed. Please try again.');
    }
    setFbLoading(false);
  };

  const FILTER_TABS = [
    { key: 'all',              label: 'All' },
    { key: 'chat',             label: '💬 Chat' },
    { key: 'crop_prediction',  label: '🌾 Crops' },
    { key: 'disease_detection',label: '🔬 Disease' },
    { key: 'weather',          label: '🌤 Weather' },
    { key: 'market',           label: '📊 Market' },
  ];

  const activeStar = fbHover || fbRating;

  return (
    <div className="animate-fadeIn" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, color: '#1a2e1a', fontFamily: 'Outfit', margin: 0 }}>
            📋 Activity History
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Your past queries, predictions and searches
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={openFeedback}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid #2d7a3a',
              background: '#f0faf0', color: '#2d7a3a', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            📝 Feedback
          </button>
          {history.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca',
                background: '#fef2f2', color: '#e53935', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              🗑 Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs — scrollable on small screens */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key}
            className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* History list */}
      {loading ? (
        <div className="flex-center" style={{ height: '40vh' }}><div className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>📭</p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2e1a', marginBottom: 6 }}>No history found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Use AI assistant, crop recommendations, or disease detection to see history here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.map((item, i) => {
            const meta = TYPE_META[item.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
            return (
              <div key={item._id || i} style={{
                padding: '12px 14px', display: 'flex', gap: 10,
                borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                flexWrap: 'wrap', alignItems: 'flex-start',
              }}>

                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: `${meta.color}12`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16,
                }}>{meta.icon}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500, color: '#1a2e1a',
                    wordBreak: 'break-word', lineHeight: 1.4, margin: 0,
                  }}>
                    {item.query}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: `${meta.color}12`, color: meta.color,
                    }}>{meta.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      🕐 {formatDateTime(item.timestamp)}
                    </span>
                    {item.timestamp && <span style={{ fontSize: 10, color: '#aaa' }}>({timeAgo(item.timestamp)})</span>}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteItem(item._id)}
                  disabled={deleting === item._id}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: 'none',
                    background: '#fef2f2', color: '#e53935', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, flexShrink: 0, opacity: deleting === item._id ? 0.5 : 1,
                    touchAction: 'manipulation',
                  }}
                  title="Delete">🗑</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEEDBACK MODAL ── */}
      {showFeedback && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowFeedback(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300,
          }} />

          {/* Modal */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(480px, calc(100vw - 20px))',
            background: 'white', borderRadius: 20, zIndex: 301,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            maxHeight: '94dvh', overflowY: 'auto',
          }}>

            {/* Modal header */}
            <div style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg,#f0faf0,#fff)',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a2e1a', margin: 0 }}>
                  📝 Share Your Feedback
                </h2>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Help us improve AgriSmart</p>
              </div>
              <button onClick={() => setShowFeedback(false)} style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
                color: '#999', lineHeight: 1, padding: '4px 8px',
              }}>×</button>
            </div>

            <div style={{ padding: '18px 22px', display: 'grid', gap: 16 }}>

              {/* ── Feedback Type ── */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Feedback Type
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { val: 'general',    icon: '💬', label: 'General' },
                    { val: 'bug',        icon: '🐞', label: 'Bug' },
                    { val: 'suggestion', icon: '💡', label: 'Suggestion' },
                    { val: 'praise',     icon: '⭐', label: 'Praise' },
                  ].map(t => (
                    <button key={t.val} onClick={() => setFbType(t.val)} style={{
                      padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: `1.5px solid ${fbType === t.val ? '#2d7a3a' : 'var(--border)'}`,
                      background: fbType === t.val ? '#e8f5e9' : 'white',
                      color: fbType === t.val ? '#2d7a3a' : 'var(--text-secondary)',
                    }}>{t.icon} {t.label}</button>
                  ))}
                </div>
              </div>

              {/* ── Related Feature ── */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Related Feature
                </label>
                <select className="input-field" value={fbPage} onChange={e => setFbPage(e.target.value)}>
                  {['History', 'AI Chatbot', 'Crop Recommendation', 'Disease Detection', 'Weather', 'Market Prices', 'Community', 'Dashboard', 'Profile', 'General'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* ── Star Rating ── */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rating <span style={{ color: '#e53935' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setFbRating(n)}
                      onMouseEnter={() => setFbHover(n)}
                      onMouseLeave={() => setFbHover(0)}
                      style={{
                        width: 42, height: 42, borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${n <= activeStar ? '#f59e0b' : '#e5e7eb'}`,
                        background: n <= activeStar ? '#fffbeb' : 'white',
                        fontSize: 22, transition: 'all 0.15s',
                        transform: n <= activeStar ? 'scale(1.1)' : 'scale(1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {n <= activeStar ? '⭐' : '☆'}
                    </button>
                  ))}
                  {/* Label */}
                  <div style={{ marginLeft: 10 }}>
                    {activeStar > 0 ? (
                      <>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                          {activeStar}/5
                        </span>
                        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>
                          — {STAR_LABELS[activeStar]}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Tap a star</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Message ── */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Message <span style={{ color: '#e53935' }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Tell us what you think, what's broken, or what you'd like to see…"
                  value={fbContent}
                  onChange={e => setFbContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'Inter', fontSize: 13 }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {fbContent.length}/2000 characters
                </p>
              </div>

              {/* Status messages */}
              {fbError && (
                <div className="alert alert-error" style={{ padding: '10px 14px', fontSize: 13 }}>
                  ❌ {fbError}
                </div>
              )}
              {fbSuccess && (
                <div className="alert alert-success" style={{ padding: '10px 14px', fontSize: 13 }}>
                  {fbSuccess}
                </div>
              )}

              {/* Submit */}
              <button
                className="btn btn-primary btn-lg"
                onClick={submitFeedback}
                disabled={fbLoading || fbRating === 0 || !fbContent.trim()}
                style={{ borderRadius: 12, position: 'relative' }}>
                {fbLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Submitting…
                  </span>
                ) : '🚀 Submit Feedback'}
              </button>

              {/* Current time notice */}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>
                🕐 Will be submitted at: <strong>{formatDateTime(new Date().toISOString())}</strong>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
