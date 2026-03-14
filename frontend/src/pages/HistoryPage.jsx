import { useState, useEffect } from 'react';
import { dashboardAPI, feedbackAPI } from '../services/api';

const TYPE_META = {
  chat:             { icon: '💬', color: '#2d7a3a', label: 'Chat' },
  crop_prediction:  { icon: '🌾', color: '#4caf50', label: 'Crop' },
  disease_detection:{ icon: '🔬', color: '#f5a623', label: 'Disease' },
  weather:          { icon: '🌤️', color: '#1e88e5', label: 'Weather' },
  market:           { icon: '📊', color: '#e53935', label: 'Market' },
};

export default function HistoryPage() {
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [deleting, setDeleting]     = useState('');
  // Feedback modal
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbType, setFbType]         = useState('general');
  const [fbRating, setFbRating]     = useState(5);
  const [fbContent, setFbContent]   = useState('');
  const [fbPage, setFbPage]         = useState('History');
  const [fbLoading, setFbLoading]   = useState(false);
  const [fbSuccess, setFbSuccess]   = useState('');
  const [fbError, setFbError]       = useState('');

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

  const submitFeedback = async () => {
    if (!fbContent.trim()) { setFbError('Please enter your feedback.'); return; }
    setFbLoading(true); setFbError(''); setFbSuccess('');
    try {
      await feedbackAPI.submit({ type: fbType, rating: fbRating, content: fbContent, page: fbPage });
      setFbSuccess('✅ Thank you! Your feedback has been submitted.');
      setFbContent(''); setFbRating(5); setFbType('general');
      setTimeout(() => { setShowFeedback(false); setFbSuccess(''); }, 2500);
    } catch (e) { setFbError(e.response?.data?.detail || 'Submission failed. Please try again.'); }
    setFbLoading(false);
  };

  const FILTER_TABS = [
    { key: 'all',              label: 'All' },
    { key: 'chat',             label: '💬 Chat' },
    { key: 'crop_prediction',  label: '🌾 Crops' },
    { key: 'disease_detection',label: '🔬 Disease' },
    { key: 'weather',          label: '🌤️ Weather' },
    { key: 'market',           label: '📊 Market' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e1a', fontFamily: 'Outfit', margin: 0 }}>📋 Activity History</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Your past queries, predictions, and searches</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid #2d7a3a',
              background: '#f0faf0', color: '#2d7a3a', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            📝 Submit Feedback
          </button>
          {history.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca',
                background: '#fef2f2', color: '#e53935', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              🗑 Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key}
            className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* History list */}
      {loading ? (
        <div className="flex-center" style={{ height: '40vh' }}><div className="spinner" /></div>
      ) : history.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2e1a', marginBottom: 8 }}>No history found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Start using AI assistant, crop recommendations, or disease detection to see your history here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {history.map((item, i) => {
            const meta = TYPE_META[item.type] || { icon: '📋', color: '#7a9a7a', label: 'Activity' };
            return (
              <div key={item._id || i} style={{
                padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 14,
                borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `${meta.color}12`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 18,
                }}>{meta.icon}</div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1a2e1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {item.query}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(item.timestamp).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Badge + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: `${meta.color}12`, color: meta.color,
                  }}>{meta.label}</span>
                  <button
                    onClick={() => deleteItem(item._id)}
                    disabled={deleting === item._id}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: 'none',
                      background: '#fef2f2', color: '#e53935', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, transition: 'all 0.15s', opacity: deleting === item._id ? 0.5 : 1,
                    }}
                    title="Delete this item">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEEDBACK MODAL ── */}
      {showFeedback && (
        <>
          <div onClick={() => setShowFeedback(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 460, background: 'white', borderRadius: 20, zIndex: 301,
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#f0faf0,#fff)' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a2e1a', margin: 0 }}>📝 Share Feedback</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Help us improve AgriSmart</p>
              </div>
              <button onClick={() => setShowFeedback(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 24, display: 'grid', gap: 16 }}>
              {/* Type */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>Feedback Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { val: 'general', icon: '💬', label: 'General' },
                    { val: 'bug',     icon: '🐞', label: 'Bug Report' },
                    { val: 'suggestion', icon: '💡', label: 'Suggestion' },
                    { val: 'praise',  icon: '⭐', label: 'Praise' },
                  ].map(t => (
                    <button key={t.val} onClick={() => setFbType(t.val)} style={{
                      padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12,
                      cursor: 'pointer', border: `1.5px solid ${fbType === t.val ? '#2d7a3a' : 'var(--border)'}`,
                      background: fbType === t.val ? '#e8f5e9' : 'white',
                      color: fbType === t.val ? '#2d7a3a' : 'var(--text-secondary)',
                    }}>{t.icon} {t.label}</button>
                  ))}
                </div>
              </div>

              {/* Page */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 6 }}>Related Feature</label>
                <select className="input-field" value={fbPage} onChange={e => setFbPage(e.target.value)}>
                  {['History', 'AI Chatbot', 'Crop Recommendation', 'Disease Detection', 'Weather', 'Market Prices', 'Community', 'Dashboard', 'Profile', 'General'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Rating */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 8 }}>Rating</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setFbRating(n)} style={{
                      width: 40, height: 40, borderRadius: 8, border: `1.5px solid ${fbRating >= n ? '#f59e0b' : 'var(--border)'}`,
                      background: fbRating >= n ? '#fff8e1' : 'white', fontSize: 20, cursor: 'pointer',
                    }}>⭐</button>
                  ))}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>{fbRating}/5</span>
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#333', display: 'block', marginBottom: 6 }}>Your Message</label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Tell us what you think, what's broken, or what you'd like to see..."
                  value={fbContent}
                  onChange={e => setFbContent(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'Inter', fontSize: 13 }}
                />
              </div>

              {fbSuccess && <div className="alert alert-success">{fbSuccess}</div>}
              {fbError   && <div className="alert alert-error">{fbError}</div>}

              <button
                className="btn btn-primary btn-lg"
                onClick={submitFeedback}
                disabled={fbLoading}
                style={{ borderRadius: 10 }}>
                {fbLoading ? 'Submitting...' : '🚀 Submit Feedback'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
