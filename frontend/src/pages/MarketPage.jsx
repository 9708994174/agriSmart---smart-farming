import { useState, useEffect } from 'react';
import { marketAPI } from '../services/api';

const STATES = ['All India', 'Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana', 'Karnataka',
  'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal'];

export default function MarketPage() {
  const [prices, setPrices] = useState([]);
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState('');
  const [state, setState] = useState('');
  const [trends, setTrends] = useState(null);

  useEffect(() => { fetchPrices(); }, []);

  const fetchPrices = async (cropFilter, stateFilter) => {
    setLoading(true); setError('');
    try {
      const res = await marketAPI.getPrices(
        cropFilter || crop || undefined,
        stateFilter === 'All India' ? undefined : (stateFilter || state || undefined)
      );
      setPrices(res.data.prices || []);
      setSource(res.data.source || '');
      setNote(res.data.note || '');
    } catch (err) { setError(err.response?.data?.detail || 'Failed to fetch market prices.'); }
    finally { setLoading(false); }
  };

  const fetchTrends = async (cropName) => {
    try {
      const res = await marketAPI.getTrends(cropName);
      setTrends(res.data);
    } catch { setTrends(null); }
  };

  return (
    <div className="animate-fadeIn" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      <div className="page-header">
        <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)' }}>📊 Market Prices</h1>
        <p>Live mandi prices and official MSP data</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input-field" placeholder="Search crop (e.g., wheat)"
            value={crop} onChange={e => setCrop(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchPrices()}
            style={{ flex: '1 1 140px', minWidth: 0 }} />
          <select className="input-field" value={state} onChange={e => setState(e.target.value)}
            style={{ flex: '0 1 160px', minWidth: 0 }}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => fetchPrices()} className="btn btn-primary" disabled={loading}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            {loading ? '...' : '🔍 Search'}
          </button>
          <button onClick={() => { setCrop(''); setState(''); fetchPrices('', ''); }}
            className="btn btn-secondary" style={{ flex: '0 0 auto' }}>Reset</button>
        </div>
        {source && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>📎 {source}</p>}
        {note && <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>{note}</div>}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div>
        {loading ? (
          <div className="flex-center" style={{ padding: 48 }}><div className="spinner" /></div>
        ) : prices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h3>No data found</h3>
              <p>Try adjusting your search filters.</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Scrollable table — only the table scrolls horizontally, not the page */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Crop</th><th>Market</th><th>Min</th><th>Max</th>
                    <th>Modal</th><th>MSP</th><th>Season</th><th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p, i) => (
                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => fetchTrends(p.crop)}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>🌾 {p.crop}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{p.market || p.state}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>₹{p.min_price?.toLocaleString('en-IN')}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>₹{p.max_price?.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        ₹{p.modal_price?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        {p.msp ? (
                          <span className={`badge ${p.modal_price >= p.msp ? 'badge-success' : 'badge-danger'}`}>
                            ₹{p.msp.toLocaleString('en-IN')}
                          </span>
                        ) : '-'}
                      </td>
                      <td><span className="badge badge-neutral">{p.season || '-'}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {trends && (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🌾 {trends.crop} Details</h3>
              <button onClick={() => setTrends(null)} type="button"
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #eee', background: '#f9f9f9', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>MSP</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{trends.msp?.toLocaleString('en-IN')}
                </p>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-input)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Season</p>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{trends.season}</p>
              </div>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Source</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{trends.source}</p>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>💡 Recommendation</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{trends.recommendation}</p>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>📋 Market Tips</p>
            {trends.tips?.map((t, i) => (
              <p key={i} style={{
                fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 10,
                borderLeft: '3px solid var(--primary-200)'
              }}>{t}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
