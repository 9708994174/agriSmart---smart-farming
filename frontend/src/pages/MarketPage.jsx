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
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>📊 Market Prices</h1>
        <p>Live mandi prices and official MSP data from Government of India sources</p>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input-field" placeholder="Search crop (e.g., wheat, rice)"
            value={crop} onChange={e => setCrop(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchPrices()}
            style={{ flex: 1, minWidth: 200 }} />
          <select className="input-field" value={state} onChange={e => setState(e.target.value)} style={{ minWidth: 180 }}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => fetchPrices()} className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : '🔍 Search'}
          </button>
          <button onClick={() => { setCrop(''); setState(''); fetchPrices('', ''); }} className="btn btn-secondary">Reset</button>
        </div>
        {source && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>📎 Source: {source}</p>}
        {note && <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>{note}</div>}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: trends ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr', gap: 20 }}>
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
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Crop</th><th>Market</th><th>Min Price</th><th>Max Price</th>
                      <th>Modal Price</th><th>MSP</th><th>Season</th><th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => fetchTrends(p.crop)}>
                        <td style={{ fontWeight: 600 }}>🌾 {p.crop}</td>
                        <td style={{ fontSize: 12 }}>{p.market || p.state}</td>
                        <td>₹{p.min_price?.toLocaleString('en-IN')}</td>
                        <td>₹{p.max_price?.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
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
        </div>

        {trends && (
          <div className="animate-slideIn">
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="flex-between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>🌾 {trends.crop} Details</h3>
                <button onClick={() => setTrends(null)} className="btn-ghost btn-sm" style={{ fontSize: 18, lineHeight: 1 }}>×</button>
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
          </div>
        )}
      </div>
    </div>
  );
}
