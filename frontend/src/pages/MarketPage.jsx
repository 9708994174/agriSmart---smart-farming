import { useState, useEffect, useRef } from 'react';
import { marketAPI } from '../services/api';

// ── State→Region mapping for geolocation ─────────────────────────────────────
const STATE_BY_REGION = {
  'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Tirupati'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Hisar'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubli', 'Mangalore'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Chandigarh'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Udaipur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol'],
  'Delhi': ['Delhi', 'New Delhi'],
  'All India': [],
};

const STATES = ['All India', ...Object.keys(STATE_BY_REGION).filter(s => s !== 'All India').sort()];

// ── Sparkline mini-chart ──────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 40 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const trend = data[data.length - 1] >= data[0];
  const lineColor = trend ? '#16a34a' : '#dc2626';
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`${pts.join(' ')} ${width},${height} 0,${height}`}
        fill={`url(#sg${width})`} stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={lineColor}
        strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={3} fill={lineColor} stroke="white" strokeWidth={1.5} />
    </svg>
  );
}

// ── Price bar chart with proper MSP calculation ───────────────────────────────
function PriceChart({ prices }) {
  if (!prices || prices.length < 1) return (
    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>📊 No data</div>
  );
  const vals = prices.map(p => p.modal_price).filter(Boolean);
  if (!vals.length) return null;
  const maxVal = Math.max(...vals);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {prices.slice(0, 12).map((p, i) => {
        const pct = maxVal ? ((p.modal_price || 0) / maxVal) * 100 : 0;
        // Fix: only compute vs_msp when both values exist AND are different
        const msp = p.msp && p.msp > 0 ? p.msp : null;
        const modal = p.modal_price && p.modal_price > 0 ? p.modal_price : null;
        const vs_msp = (msp && modal && msp !== modal)
          ? ((modal - msp) / msp * 100).toFixed(1)
          : null;
        const above = vs_msp !== null && parseFloat(vs_msp) >= 0;
        return (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 80 }}>🌾 {p.crop}</span>
              <div style={{ flex: 1, height: 10, borderRadius: 99, background: 'var(--bg-input)', overflow: 'hidden', margin: '0 10px' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 99,
                  background: 'linear-gradient(90deg,#006028,#1a7a3a,#4caf50)',
                  transition: 'width 0.9s cubic-bezier(.4,2,.6,1)',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 'max-content' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>₹{(p.modal_price || 0).toLocaleString('en-IN')}</span>
                {vs_msp !== null ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: above ? '#dcfce7' : '#fee2e2',
                    color: above ? '#15803d' : '#b91c1c',
                  }}>
                    {above ? '▲' : '▼'} {Math.abs(parseFloat(vs_msp))}% vs MSP
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px' }}>— MSP N/A</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Trend price history chart ─────────────────────────────────────────────────
function TrendHistoryChart({ history }) {
  if (!history || history.length < 2) return null;
  const prices = history.map(h => h.modal_price || h.price || 0);
  const dates = history.map(h => h.date || h.label || '');
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 340, H = 120, PAD = 28;
  const pts = prices.map((v, i) => {
    const x = PAD + (i / (prices.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return { x, y, v, d: dates[i] };
  });
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaClose = `${pts[pts.length-1].x},${H-PAD} ${pts[0].x},${H-PAD}`;
  const trend = prices[prices.length-1] >= prices[0];
  const lineColor = trend ? '#16a34a' : '#dc2626';

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 280 }}>
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = PAD + f * (H - PAD * 2);
          const val = max - f * range;
          return (
            <g key={i}>
              <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3,3" />
              <text x={PAD - 4} y={y + 4} fontSize={8} fill="#9ca3af" textAnchor="end">
                ₹{Math.round(val).toLocaleString('en-IN')}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <polygon points={`${polyPts} ${areaClose}`} fill="url(#area-grad)" />
        {/* Line */}
        <polyline points={polyPts} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={lineColor} stroke="white" strokeWidth={1.5} />
            {i === pts.length - 1 && (
              <text x={p.x} y={p.y - 8} fontSize={8} fill={lineColor} textAnchor="middle" fontWeight="700">
                ₹{p.v.toLocaleString('en-IN')}
              </text>
            )}
          </g>
        ))}
        {/* X-axis dates */}
        {pts.filter((_, i) => i === 0 || i === pts.length - 1 || (i === Math.floor(pts.length / 2))).map((p, i) => (
          <text key={i} x={p.x} y={H - 4} fontSize={7} fill="#9ca3af" textAnchor="middle">
            {String(p.d).slice(0, 6)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function MarketPage() {
  const [prices, setPrices] = useState([]);
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [crop, setCrop] = useState('');
  const [state, setState] = useState('');
  const [trends, setTrends] = useState(null);
  const [geoState, setGeoState] = useState(''); // detected state
  const [geoCity, setGeoCity] = useState('');
  const [geoStatus, setGeoStatus] = useState(''); // 'detecting' | 'done' | 'denied' | ''
  const [activeChart, setActiveChart] = useState('bar'); // 'bar' | 'trend'
  const [selectedCrop, setSelectedCrop] = useState(null);

  // ── Auto-detect location on mount ─────────────────────────────────────────
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) { fetchPrices(); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode via open-meteo nominatim (free, no key needed)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const stateRaw = data.address?.state || '';
          // Match to our state list
          const matched = STATES.find(s => s !== 'All India' && stateRaw.toLowerCase().includes(s.toLowerCase()));
          const detectedState = matched || 'All India';
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          setGeoCity(city);
          setGeoState(detectedState);
          setState(detectedState);
          setGeoStatus('done');
          fetchPrices(undefined, detectedState);
        } catch {
          setGeoStatus('done');
          fetchPrices();
        }
      },
      () => { setGeoStatus('denied'); fetchPrices(); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const fetchPrices = async (cropFilter, stateFilter) => {
    setLoading(true); setError('');
    try {
      const res = await marketAPI.getPrices(
        (cropFilter ?? crop) || undefined,
        (stateFilter ?? state) === 'All India' ? undefined : ((stateFilter ?? state) || undefined)
      );
      setPrices(res.data.prices || []);
      setSource(res.data.source || '');
      setNote(res.data.note || '');
    } catch (err) { setError(err.response?.data?.detail || 'Failed to fetch market prices.'); }
    finally { setLoading(false); }
  };

  const fetchTrends = async (cropName) => {
    setSelectedCrop(cropName);
    try {
      const res = await marketAPI.getTrends(cropName);
      setTrends(res.data);
    } catch { setTrends(null); }
  };

  // Generate mock sparkline data for visual demonstration when no history data
  const generateSparkData = (basePrice) => {
    const points = [];
    let cur = basePrice;
    for (let i = 0; i < 8; i++) {
      cur += (Math.random() - 0.45) * basePrice * 0.04;
      points.push(Math.round(cur));
    }
    return points;
  };

  const trendChange = trends?.price_history?.length >= 2
    ? ((trends.price_history[trends.price_history.length - 1].modal_price - trends.price_history[0].modal_price) / trends.price_history[0].modal_price * 100).toFixed(1)
    : null;

  return (
    <div className="animate-fadeIn" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      {/* ── Header ── */}
      <div className="page-header">
        <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)' }}>📊 Market Prices</h1>
        <p>Live mandi prices near you — auto-detected by location</p>
      </div>

      {/* ── Location Banner ── */}
      {geoStatus === 'detecting' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10,
          background: 'linear-gradient(90deg,#e8f5e9,#f1f8e9)', border: '1px solid #c8e6c9',
          marginBottom: 14, fontSize: 13, color: '#2d7a3a', fontWeight: 600,
        }}>
          <span style={{ animation: 'pulse 1.5s infinite' }}>📡</span>
          Detecting your location to show nearby mandi prices…
        </div>
      )}
      {geoStatus === 'done' && geoCity && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
          background: '#e8f5e9', border: '1px solid #a5d6a7', marginBottom: 14, fontSize: 13,
        }}>
          <span>📍</span>
          <span>Showing mandi prices near <strong>{geoCity}</strong>{geoState && geoState !== 'All India' ? `, ${geoState}` : ''}</span>
          <button onClick={() => { setGeoStatus(''); detectLocation(); }} style={{
            marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: '1px solid #2d7a3a',
            background: 'transparent', color: '#2d7a3a', fontSize: 11, cursor: 'pointer', fontWeight: 600,
          }}>🔄 Refresh</button>
        </div>
      )}
      {geoStatus === 'denied' && (
        <div style={{
          padding: '9px 14px', borderRadius: 10, background: '#fff3e0',
          border: '1px solid #ffe0b2', marginBottom: 14, fontSize: 12, color: '#e65100',
        }}>
          ⚠️ Location permission denied. Showing all-India prices. Use the filter to select your state.
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input-field" placeholder="Search crop (e.g., wheat, rice)"
            value={crop} onChange={e => setCrop(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchPrices()}
            style={{ flex: '1 1 140px', minWidth: 0 }} />
          <select className="input-field" value={state} onChange={e => { setState(e.target.value); fetchPrices(undefined, e.target.value); }}
            style={{ flex: '0 1 180px', minWidth: 0 }}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => fetchPrices()} className="btn btn-primary" disabled={loading}
            style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
            {loading ? '⏳' : '🔍 Search'}
          </button>
          <button onClick={() => { setCrop(''); setState(geoState || ''); fetchPrices('', geoState || ''); }}
            className="btn btn-secondary" style={{ flex: '0 0 auto' }}>Reset</button>
        </div>
        {source && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>📎 {source}</p>}
        {note && <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>{note}</div>}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Price Fluctuation Chart ── */}
      {prices.length > 0 && !loading && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📈 Price Overview</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['bar', 'trend'].map(ch => (
                <button key={ch} onClick={() => setActiveChart(ch)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${activeChart === ch ? '#2d7a3a' : 'var(--border)'}`,
                  background: activeChart === ch ? '#e8f5e9' : 'white',
                  color: activeChart === ch ? '#2d7a3a' : 'var(--text-muted)',
                }}>
                  {ch === 'bar' ? '📊 By Crop' : '📈 Comparison'}
                </button>
              ))}
            </div>
          </div>

          {activeChart === 'bar' && <PriceChart prices={prices} />}
          {activeChart === 'trend' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {prices.slice(0, 8).map((p, i) => {
                const sparkData = p.price_history || generateSparkData(p.modal_price || 2000);
                const trend = sparkData[sparkData.length - 1] >= sparkData[0];
                return (
                  <div key={i} onClick={() => fetchTrends(p.crop)} style={{
                    padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-light)',
                    background: selectedCrop === p.crop ? '#e8f5e9' : 'var(--bg-input)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>🌾 {p.crop}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.market || p.state}</div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                        background: trend ? '#d1fae5' : '#fee2e2',
                        color: trend ? '#059669' : '#dc2626',
                      }}>{trend ? '▲' : '▼'}</span>
                    </div>
                    <Sparkline data={sparkData} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Modal</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.modal_price?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Price Table ── */}
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
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>🏪 Mandi Prices — {prices.length} results</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click a crop for details & history</span>
            </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)' }}>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>Crop</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>Market/District</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1, color: '#1e88e5' }}>Min ↓</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1, color: '#dc2626' }}>Max ↑</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1, color: 'var(--primary)' }}>Modal</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>MSP</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>vs MSP</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-input)', zIndex: 1 }}>Season</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((p, i) => {
                    // Robust MSP calc: only show when msp > 0 and genuinely different from modal
                    const msp   = p.msp   && p.msp   > 0 ? p.msp   : null;
                    const modal = p.modal_price && p.modal_price > 0 ? p.modal_price : null;
                    const vsMSP = (msp && modal && Math.abs(modal - msp) > 1)
                      ? ((modal - msp) / msp * 100).toFixed(1)
                      : null;
                    const isAbove = vsMSP !== null && parseFloat(vsMSP) >= 0;
                    return (
                      <tr key={i}
                        style={{ cursor: 'pointer', transition: 'background 0.12s', background: selectedCrop === p.crop ? '#f0fdf4' : undefined }}
                        onClick={() => fetchTrends(p.crop)}
                        onMouseEnter={e => { e.currentTarget.style.background = selectedCrop === p.crop ? '#f0fdf4' : '#f8faf8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = selectedCrop === p.crop ? '#f0fdf4' : ''; }}
                      >
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🌾 {p.crop}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.market || p.state || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', color: '#1e88e5', fontWeight: 600 }}>₹{(p.min_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ whiteSpace: 'nowrap', color: '#dc2626', fontWeight: 600 }}>₹{(p.max_price||0).toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: 14 }}>
                          ₹{(modal||0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          {msp ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>₹{msp.toLocaleString('en-IN')}</span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          {vsMSP !== null ? (
                            <span style={{
                              display: 'inline-block',
                              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                              background: isAbove ? '#dcfce7' : '#fee2e2',
                              color: isAbove ? '#15803d' : '#b91c1c',
                            }}>
                              {isAbove ? '▲' : '▼'} {Math.abs(parseFloat(vsMSP))}%
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                            {p.season || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Crop Detail & Fluctuation Panel ── */}
        {trends && (
          <div style={{
            marginTop: 20, borderRadius: 18, border: '2px solid #a5d6a7',
            background: 'white', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(26,122,58,0.12)',
            animation: 'slideUp 0.3s ease-out',
          }}>
            {/* Panel header */}
            <div style={{ padding: '16px 22px', background: 'linear-gradient(135deg,#006028,#1a7a3a)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'white' }}>🌾 {trends.crop} — Price Analysis</h3>
                {trends.season && <span style={{ fontSize: 12, color: '#86efac', marginTop: 2, display: 'block' }}>Season: {trends.season}</span>}
              </div>
              <button onClick={() => { setTrends(null); setSelectedCrop(null); }}
                style={{ width: 34, height: 34, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
              >×</button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              {/* Summary stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { icon: '🏛️', label: 'MSP',        val: trends.msp  ? `₹${trends.msp.toLocaleString('en-IN')}` : 'N/A', color: '#1a7a3a' },
                  { icon: '💰', label: 'Last Price',  val: trends.price_history?.length ? `₹${(trends.price_history[trends.price_history.length-1]?.modal_price||0).toLocaleString('en-IN')}` : 'N/A', color: '#059669' },
                  { icon: '📈', label: 'Change',      val: trendChange !== null ? `${parseFloat(trendChange) >= 0 ? '▲' : '▼'} ${Math.abs(trendChange)}%` : 'N/A', color: trendChange !== null ? (parseFloat(trendChange) >= 0 ? '#059669' : '#dc2626') : '#6b7280' },
                  { icon: '📅', label: 'Data Points', val: String(trends.price_history?.length || 0), color: '#7c3aed' },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Fluctuation Chart */}
              {trends.price_history?.length >= 2 && (
                <div style={{ marginBottom: 20, padding: '16px', borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>📉 Price Fluctuation History</h4>
                  <TrendHistoryChart history={trends.price_history} />
                </div>
              )}

              {/* Recommendation */}
              {trends.recommendation && (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💡 Recommendation</p>
                  <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.65, margin: 0 }}>{trends.recommendation}</p>
                </div>
              )}

              {/* Tips */}
              {trends.tips?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📋 Market Tips</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trends.tips.map((t, i) => (
                      <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: '#f8faf8', borderLeft: '3px solid #a5d6a7', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{t}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}
