import { useState } from 'react';
import { weatherAPI } from '../services/api';

const CITIES = ['Delhi', 'Ludhiana', 'Chandigarh', 'Jaipur', 'Lucknow', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Patna', 'Pune'];

const getWindDir = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
};

const fmt = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (d) => fmt(d, { weekday: 'short', month: 'short', day: 'numeric' });

// Score ring component
function ScoreRing({ score, label, color, size = 64 }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>{score}</text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center' }}>{label}</span>
    </div>
  );
}

// Stat mini card
function StatCard({ icon, label, value, sub, accent = '#2d7a3a' }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'var(--bg-input)', border: '1px solid var(--border-light)',
      transition: 'transform 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export default function WeatherPage() {
  const [city, setCity]       = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('overview');

  const fetchWeather = async (searchCity) => {
    const c = (searchCity || city).trim();
    if (!c) { setError('Please enter a city name.'); return; }
    setLoading(true); setError(''); setCity(c);
    try {
      const [wRes, fRes] = await Promise.all([
        weatherAPI.getCurrent(c), weatherAPI.getForecast(c)
      ]);
      if (wRes.data.error) {
        setError(wRes.data.msg || 'Unable to fetch weather data.');
        setWeather(null);
      } else {
        setWeather(wRes.data);
        setTab('overview');
      }
      if (fRes.data?.daily) setForecast(fRes.data);
      else setForecast(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to connect to weather service.');
    } finally {
      setLoading(false);
    }
  };

  const adv  = weather?.farming_advisory || {};
  const score = adv.field_score ?? 70;
  const fcolor = adv.field_color ?? '#2d7a3a';

  // Day/night gradient
  const bgGrad = weather?.is_day
    ? 'linear-gradient(135deg, #1a5c2a 0%, #2d7a3a 40%, #388e3c 100%)'
    : 'linear-gradient(135deg, #0d1b2a 0%, #1a2e3a 50%, #243447 100%)';

  const tabs = [
    { id: 'overview', label: '🌾 Overview' },
    { id: 'advisory', label: '📋 Advisory' },
    { id: 'forecast', label: '📅 7-Day' },
    { id: 'hourly',   label: '⏰ Hourly' },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1>🌤️ Farmer Weather Advisory</h1>
        <p>Real-time weather intelligence with field activity scores, irrigation planning & spray window assessment — Free, no API key needed</p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-field"
            placeholder="Enter city name (e.g., Ludhiana, Jaipur, Delhi...)"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchWeather()}
            style={{ flex: 1 }}
          />
          <button onClick={() => fetchWeather()} className="btn btn-primary" disabled={loading}
            style={{ minWidth: 130, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {loading ? (
              <>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: 'white',
                    animation: `bounce 1.2s infinite ${i * 0.15}s`, display: 'inline-block'
                  }} />
                ))}
                <span>Fetching...</span>
              </>
            ) : '🔍 Get Weather'}
          </button>
        </div>

        {/* Quick city buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {CITIES.map(c => (
            <button key={c}
              onClick={() => { setCity(c); fetchWeather(c); }}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: `1.5px solid ${city === c ? '#2d7a3a' : 'var(--border)'}`,
                background: city === c ? '#e8f5e9' : 'white',
                color: city === c ? '#2d7a3a' : 'var(--text-secondary)',
                fontWeight: city === c ? 700 : 400, transition: 'all 0.15s'
              }}>
              📍 {c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14
        }}>
          ❌ {error}
        </div>
      )}

      {/* ── WEATHER DATA ── */}
      {weather && (
        <>
          {/* Hero banner */}
          <div style={{
            borderRadius: 18, padding: '28px 32px', marginBottom: 20,
            background: bgGrad, color: 'white', position: 'relative', overflow: 'hidden'
          }}>
            {/* Subtle pattern */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 200, height: 200,
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)'
            }} />
            <div style={{
              position: 'absolute', bottom: -60, right: 80, width: 150, height: 150,
              borderRadius: '50%', background: 'rgba(255,255,255,0.04)'
            }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', position: 'relative' }}>
              <div>
                <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  📍 {weather.city}{weather.state ? `, ${weather.state}` : ''} · {weather.latitude?.toFixed(2)}°N, {weather.longitude?.toFixed(2)}°E
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
                  <span style={{ fontSize: 72, lineHeight: 1 }}>{weather.icon}</span>
                  <div>
                    <h2 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, margin: 0 }}>
                      {weather.temperature}°<span style={{ fontSize: 28, fontWeight: 400 }}>C</span>
                    </h2>
                    <p style={{ fontSize: 16, opacity: 0.85, margin: '4px 0', textTransform: 'capitalize' }}>
                      {weather.description}
                    </p>
                    <p style={{ fontSize: 12, opacity: 0.6 }}>
                      Feels like {weather.feels_like}°C · Low {weather.temp_min}° / High {weather.temp_max}°
                    </p>
                  </div>
                </div>

                {/* Quick metrics row */}
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { icon: '💧', label: 'Humidity', val: `${weather.humidity}%` },
                    { icon: '💨', label: 'Wind', val: `${weather.wind_speed} km/h ${getWindDir(weather.wind_direction)}` },
                    { icon: '🌡️', label: 'Pressure', val: `${weather.pressure} hPa` },
                    { icon: '☁️', label: 'Clouds', val: `${weather.clouds}%` },
                    { icon: '☀️', label: 'UV Index', val: weather.uv_index ?? 'N/A' },
                    { icon: '🌧️', label: 'Rain', val: weather.rain > 0 ? `${weather.rain} mm` : 'None' },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{m.icon} {m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Activity Score Ring */}
              <div style={{
                textAlign: 'center', padding: '20px 24px', borderRadius: 14,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)'
              }}>
                <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>🌾 FIELD ACTIVITY</p>
                <ScoreRing score={score} label={adv.field_label ?? 'Good'} color="white" size={80} />
                <div style={{ marginTop: 12, fontSize: 11, opacity: 0.75 }}>
                  <div>💧 Irrigation: <strong>{adv.irrigation_label ?? 'Moderate'}</strong></div>
                  <div style={{ marginTop: 4 }}>🧴 Spray: <strong>{adv.spray_suitable ? '✅ OK' : '❌ No'}</strong></div>
                </div>
              </div>
            </div>

            {/* Sunrise / Sunset */}
            {(weather.sunrise || weather.sunset) && (
              <div style={{ display: 'flex', gap: 24, marginTop: 16, opacity: 0.75, fontSize: 12 }}>
                {weather.sunrise && <span>🌅 Sunrise: {fmtTime(weather.sunrise)}</span>}
                {weather.sunset  && <span>🌇 Sunset: {fmtTime(weather.sunset)}</span>}
                <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 10 }}>
                  📡 {weather.data_source} · Cached 30 min
                </span>
              </div>
            )}
          </div>

          {/* Tab nav */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
            background: 'var(--bg-input)', padding: 4, borderRadius: 12
          }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '9px 12px', borderRadius: 10, border: 'none',
                background: tab === t.id ? 'white' : 'transparent',
                boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.2s'
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── TAB: OVERVIEW ── */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Conditions grid */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>☁️ Current Conditions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <StatCard icon="🌡️" label="Feels Like" value={`${weather.feels_like}°C`} />
                  <StatCard icon="💧" label="Humidity" value={`${weather.humidity}%`}
                    accent={weather.humidity > 80 ? '#d97706' : '#2d7a3a'} />
                  <StatCard icon="💨" label="Wind Speed" value={`${weather.wind_speed} km/h`} />
                  <StatCard icon="🌪️" label="Wind Gusts" value={`${weather.wind_gusts} km/h`} />
                  <StatCard icon="🔵" label="Pressure" value={`${weather.pressure} hPa`} />
                  <StatCard icon="☁️" label="Cloud Cover" value={`${weather.clouds}%`} />
                  <StatCard icon="🌧️" label="Rainfall" value={weather.rain > 0 ? `${weather.rain} mm` : 'None'} />
                  <StatCard icon="☀️" label="UV Index" value={weather.uv_index ?? 'N/A'}
                    accent={(weather.uv_index ?? 0) >= 8 ? '#dc2626' : (weather.uv_index ?? 0) >= 5 ? '#d97706' : '#2d7a3a'} />
                  <StatCard icon="💦" label="Precip" value={weather.precipitation > 0 ? `${weather.precipitation} mm` : 'None'} />
                </div>
              </div>

              {/* Farmer scores */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🌾 Farmer Activity Scores</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
                  <ScoreRing score={score} label="Field Work" color={fcolor} size={72} />
                  <ScoreRing score={adv.irrigation_score ?? 50} label="Irrigation Need"
                    color={adv.irrigation_score >= 70 ? '#dc2626' : adv.irrigation_score >= 40 ? '#d97706' : '#2d7a3a'} size={72} />
                  <ScoreRing score={adv.spray_suitable ? 85 : 20} label="Spray Window"
                    color={adv.spray_suitable ? '#16a34a' : '#dc2626'} size={72} />
                </div>

                {/* Activity legend */}
                {[
                  { key: 'field',      label: 'Field Activity',   val: adv.field_label,      color: fcolor },
                  { key: 'irrig',      label: 'Irrigation Need',  val: adv.irrigation_label, color: '#1e88e5' },
                  { key: 'spray',      label: 'Pesticide Spray',  val: adv.spray_label,      color: adv.spray_suitable ? '#16a34a' : '#dc2626' },
                ].map(row => (
                  <div key={row.key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', marginBottom: 6
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: ADVISORY ── */}
          {tab === 'advisory' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Warnings */}
              {adv.warnings?.length > 0 && (
                <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#dc2626' }}>
                    🚨 Warnings ({adv.warnings.length})
                  </h3>
                  {adv.warnings.map((w, i) => (
                    <div key={i} style={{
                      padding: '10px 14px', borderRadius: 10, background: '#fef2f2',
                      border: '1px solid #fecaca', marginBottom: 8, fontSize: 13,
                      color: '#991b1b', lineHeight: 1.6
                    }}>⚠️ {w}</div>
                  ))}
                </div>
              )}

              {/* Tips */}
              <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#16a34a' }}>
                  ✅ Farming Tips ({adv.tips?.length ?? 0})
                </h3>
                {adv.tips?.map((t, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: 10, background: '#f0fdf4',
                    border: '1px solid #bbf7d0', marginBottom: 8, fontSize: 13,
                    color: '#166534', lineHeight: 1.6
                  }}>{t}</div>
                ))}
              </div>

              {/* Best time to work */}
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🕐 Best Farming Windows Today</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { time: '5–7 AM', icon: '🌅', activity: 'Irrigation & Watering', good: weather.temperature < 35, reason: 'Cool & low evaporation' },
                    { time: '8–11 AM', icon: '🌤️', activity: 'Pesticide Spray', good: adv.spray_suitable, reason: adv.spray_suitable ? 'Calm & suitable' : 'Wind/rain risk' },
                    { time: '12–3 PM', icon: '☀️', activity: 'Harvesting & Drying', good: weather.rain === 0 && weather.clouds < 50, reason: 'Peak sun hours' },
                    { time: '5–7 PM', icon: '🌇', activity: 'Transplanting', good: weather.temperature > 15 && weather.temperature < 35, reason: 'Cooler temps optimal' },
                  ].map((w, i) => (
                    <div key={i} style={{
                      padding: 14, borderRadius: 12, textAlign: 'center',
                      background: w.good ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${w.good ? '#bbf7d0' : '#fecaca'}`
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{w.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{w.time}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{w.activity}</div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: w.good ? '#16a34a' : '#dc2626',
                        padding: '3px 8px', borderRadius: 20,
                        background: w.good ? '#dcfce7' : '#fee2e2', display: 'inline-block'
                      }}>
                        {w.good ? '✅ Good' : '⚠️ Caution'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{w.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: 7-DAY FORECAST ── */}
          {tab === 'forecast' && forecast?.daily && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>📅 7-Day Forecast — {forecast.city}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Each day includes field activity score & spray suitability for planning your week
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
                {forecast.daily.map((f, i) => (
                  <div key={i} style={{
                    padding: '16px 10px', textAlign: 'center',
                    borderRight: i < 6 ? '1px solid var(--border-light)' : 'none',
                    background: i === 0 ? 'rgba(45,122,58,0.04)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,122,58,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'rgba(45,122,58,0.04)' : 'transparent'}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? '#2d7a3a' : 'var(--text-muted)', marginBottom: 6 }}>
                      {i === 0 ? 'TODAY' : fmtDate(f.date).toUpperCase().split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{f.description}</div>

                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: '#e53935' }}>{f.temp_max}°</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 2px' }}>/</span>
                      <span style={{ color: '#1e88e5' }}>{f.temp_min}°</span>
                    </div>

                    {f.rain_sum > 0 && (
                      <div style={{ fontSize: 10, color: '#1e88e5', marginBottom: 4 }}>🌧️ {f.rain_sum}mm</div>
                    )}

                    {/* Rain probability bar */}
                    <div style={{ margin: '6px auto', width: 40 }}>
                      <div style={{ height: 3, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{
                          width: `${f.precipitation_probability}%`, height: '100%',
                          background: f.precipitation_probability > 60 ? '#1e88e5' : '#93c5fd',
                          borderRadius: 2, transition: 'width 0.8s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        💧{f.precipitation_probability}%
                      </div>
                    </div>

                    {/* Field score badge */}
                    {f.field_score != null && (
                      <div style={{
                        marginTop: 6, fontSize: 10, fontWeight: 700,
                        color: f.field_color, padding: '2px 6px', borderRadius: 10,
                        background: `${f.field_color}18`, display: 'inline-block'
                      }}>
                        🌾 {f.field_label}
                      </div>
                    )}

                    {/* Spray window */}
                    {f.spray_suitable != null && (
                      <div style={{ fontSize: 10, marginTop: 4, color: f.spray_suitable ? '#16a34a' : '#9ca3af' }}>
                        {f.spray_suitable ? '🧴✅' : '🧴❌'} Spray
                      </div>
                    )}

                    {/* UV */}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      ☀️ UV {f.uv_index ?? '-'} · 💨 {f.wind_speed_max} km/h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: HOURLY ── */}
          {tab === 'hourly' && forecast?.hourly && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>⏰ Hourly Forecast — Next 48 Hours</h3>
              </div>
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
                    <tr>
                      {['Time','Condition','Temp','Humidity','Rain Prob.','Precip.','Wind','Visibility'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.hourly.map((h, i) => {
                      const dt       = new Date(h.datetime);
                      const isNewDay = i === 0 || new Date(forecast.hourly[i-1]?.datetime).getDate() !== dt.getDate();
                      return (
                        <>
                          {isNewDay && (
                            <tr key={`day-${i}`}>
                              <td colSpan="8" style={{
                                background: '#f0f5f0', fontWeight: 700, color: '#2d7a3a',
                                fontSize: 11, padding: '7px 14px',
                                borderTop: i > 0 ? '2px solid var(--border-light)' : 'none'
                              }}>
                                📅 {dt.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </td>
                            </tr>
                          )}
                          <tr key={i} style={{
                            background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                            transition: 'background 0.1s'
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,122,58,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'}
                          >
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 16 }}>{h.icon}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.description}</span>
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>{h.temperature}°C</td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>
                              <span style={{ color: h.humidity > 80 ? '#d97706' : 'inherit' }}>{h.humidity}%</span>
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>
                              {h.precipitation_probability > 0 ? (
                                <span style={{ color: h.precipitation_probability > 60 ? '#1e88e5' : 'var(--text-muted)' }}>
                                  {h.precipitation_probability}%
                                </span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{h.precipitation > 0 ? `${h.precipitation} mm` : '-'}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{h.wind_speed} km/h</td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{h.visibility} km</td>
                          </tr>
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!weather && !loading && !error && (
        <div className="card">
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🌾</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Enter your city to get started</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
              Get real-time weather with farming-specific field scores, irrigation needs, spray windows, and 7-day planner
            </p>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
              {['🌾 Field Activity Score', '💧 Irrigation Planner', '🧴 Spray Window', '📅 7-Day Forecast', '⚡ Instant Alerts', '🔄 30-min Cache'].map(f => (
                <div key={f} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12,
                  background: '#e8f5e9', color: '#2d7a3a', fontWeight: 500
                }}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
