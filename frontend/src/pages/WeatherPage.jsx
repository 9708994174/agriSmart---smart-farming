import { useState } from 'react';
import { weatherAPI } from '../services/api';

export default function WeatherPage() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('daily');

  const fetchWeather = async (searchCity) => {
    const c = searchCity || city;
    if (!c.trim()) { setError('Please enter a city name.'); return; }
    setLoading(true); setError(''); setCity(c);
    try {
      const [wRes, fRes] = await Promise.all([
        weatherAPI.getCurrent(c), weatherAPI.getForecast(c)
      ]);
      if (wRes.data.error) {
        // Backend returns {error: true, msg: '...'} or {error: 'legacy string'}
        setError(wRes.data.msg || wRes.data.error || 'Unable to fetch weather.');
        setWeather(null);
      } else {
        setWeather(wRes.data);
      }
      if (fRes.data.daily) setForecast(fRes.data);
      else setForecast(null);
    } catch (err) { setError(err.response?.data?.detail || 'Unable to fetch weather data.'); }
    finally { setLoading(false); }
  };

  const cities = ['Delhi', 'Mumbai', 'Chandigarh', 'Jaipur', 'Lucknow', 'Bengaluru', 'Hyderabad', 'Patna', 'Ludhiana', 'Pune'];

  // Wind direction to compass
  const getWindDir = (deg) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  // Format datetime
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>🌤️ Weather Advisory</h1>
        <p>Real-time weather data with farming-specific recommendations — <strong>Powered by Open-Meteo</strong> (no API key needed)</p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input-field" placeholder="Enter city name (e.g., Ludhiana)"
            value={city} onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchWeather()} style={{ flex: 1 }} />
          <button onClick={() => fetchWeather()} className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 5, height: 5, borderRadius: '50%', background: 'white',
                      animation: `bounce 1.4s infinite ${i * 0.16}s`, display: 'inline-block'
                    }} />
                  ))}
                </span>
                Loading...
              </span>
            ) : '🔍 Get Weather'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {cities.map(c => (
            <button key={c} className="btn btn-sm" onClick={() => { setCity(c); fetchWeather(c); }}
              style={{
                background: city === c ? '#e8f5e9' : 'white',
                border: `1px solid ${city === c ? '#2d7a3a' : 'var(--border)'}`,
                fontSize: 11, padding: '4px 10px', cursor: 'pointer',
                color: city === c ? '#2d7a3a' : 'var(--text-secondary)',
                fontWeight: city === c ? 600 : 400,
                transition: 'all 0.15s'
              }}>
              📍 {c}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Current Weather */}
      {weather && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Main Weather Card */}
          <div className="card" style={{
            background: weather.is_day
              ? 'linear-gradient(135deg, #e8f5e9 0%, #fff8e1 100%)'
              : 'linear-gradient(135deg, #1a2e3a 0%, #2c3e50 100%)',
            color: weather.is_day ? 'inherit' : 'white'
          }}>
            <p style={{ fontSize: 12, color: weather.is_day ? 'var(--text-muted)' : '#94a3b8', marginBottom: 4 }}>
              Current Weather
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
              📍 {weather.city}{weather.state ? `, ${weather.state}` : ''}{weather.country ? ` (${weather.country})` : ''}
            </h2>
            <p style={{ fontSize: 11, color: weather.is_day ? 'var(--text-muted)' : '#94a3b8', marginBottom: 12 }}>
              {weather.latitude?.toFixed(2)}°N, {weather.longitude?.toFixed(2)}°E
            </p>

            {/* Big temp + icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 64, lineHeight: 1 }}>{weather.icon}</div>
              <div>
                <h3 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{weather.temperature}°C</h3>
                <p style={{
                  fontSize: 15, textTransform: 'capitalize', marginTop: 4,
                  color: weather.is_day ? 'var(--text-secondary)' : '#cbd5e1'
                }}>
                  {weather.description}
                </p>
              </div>
            </div>

            {/* Detail grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Feels Like', val: `${weather.feels_like}°C`, icon: '🌡️' },
                { label: 'Humidity', val: `${weather.humidity}%`, icon: '💧' },
                { label: 'Wind', val: `${weather.wind_speed} km/h ${getWindDir(weather.wind_direction)}`, icon: '💨' },
                { label: 'Pressure', val: `${Math.round(weather.pressure)} hPa`, icon: '🔵' },
                { label: 'Clouds', val: `${weather.clouds}%`, icon: '☁️' },
                { label: 'UV Index', val: weather.uv_index || 'N/A', icon: '☀️' },
                { label: 'Wind Gusts', val: `${weather.wind_gusts} km/h`, icon: '🌪️' },
                { label: 'Rain', val: weather.rain > 0 ? `${weather.rain} mm` : 'None', icon: '🌧️' },
                { label: 'Precipitation', val: weather.precipitation > 0 ? `${weather.precipitation} mm` : 'None', icon: '💦' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 10,
                  background: weather.is_day ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)'
                }}>
                  <p style={{ fontSize: 10, color: weather.is_day ? 'var(--text-muted)' : '#94a3b8' }}>{item.icon} {item.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{item.val}</p>
                </div>
              ))}
            </div>

            {/* Sunrise/Sunset */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, padding: '8px 0' }}>
              {weather.sunrise && (
                <span style={{ fontSize: 12, color: weather.is_day ? 'var(--text-muted)' : '#94a3b8' }}>
                  🌅 Sunrise: {formatTime(weather.sunrise)}
                </span>
              )}
              {weather.sunset && (
                <span style={{ fontSize: 12, color: weather.is_day ? 'var(--text-muted)' : '#94a3b8' }}>
                  🌇 Sunset: {formatTime(weather.sunset)}
                </span>
              )}
            </div>
          </div>

          {/* Farming Advisory */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🌾 Farming Advisory</h3>
            {weather.farming_advice?.map((advice, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 10, background: 'var(--bg-input)',
                marginBottom: 8, borderLeft: '3px solid var(--primary)', fontSize: 13,
                color: 'var(--text-secondary)', lineHeight: 1.5
              }}>
                {advice}
              </div>
            ))}
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 10,
              background: 'rgba(45,122,58,0.04)', border: '1px solid rgba(45,122,58,0.15)'
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>🌡️ Temperature Range Today</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Low: <strong>{weather.temp_min}°C</strong> &nbsp;|&nbsp; High: <strong>{weather.temp_max}°C</strong>
              </p>
            </div>

            {/* Data source badge */}
            <div style={{ marginTop: 12, padding: '6px 12px', borderRadius: 8, background: '#e3f2fd', display: 'inline-block' }}>
              <span style={{ fontSize: 11, color: '#1565c0', fontWeight: 500 }}>
                📡 Data: Open-Meteo API (Free, No API Key)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Section */}
      {forecast && (
        <>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-input)', padding: 4, borderRadius: 10 }}>
            {[
              { id: 'daily', label: '📅 7-Day Forecast' },
              { id: 'hourly', label: '⏰ Hourly Forecast (48h)' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 500,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Daily Forecast */}
          {activeTab === 'daily' && forecast.daily && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, padding: '16px 20px 12px' }}>
                📅 7-Day Forecast — {forecast.city}
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Condition</th>
                      <th>Temp</th>
                      <th>Rain</th>
                      <th>Probability</th>
                      <th>Wind</th>
                      <th>UV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.daily.map((f, i) => (
                      <tr key={i} style={{ background: i === 0 ? 'rgba(45,122,58,0.04)' : 'transparent' }}>
                        <td style={{ fontWeight: i === 0 ? 700 : 500 }}>
                          {i === 0 ? '📌 Today' : formatDate(f.date)}
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 18 }}>{f.icon}</span>
                            <span style={{ textTransform: 'capitalize', fontSize: 12 }}>{f.description}</span>
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ color: '#e53935' }}>{f.temp_max}°</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                          <span style={{ color: '#1e88e5' }}>{f.temp_min}°</span>
                        </td>
                        <td>
                          {f.rain_sum > 0 ? (
                            <span className="badge badge-info" style={{ fontSize: 10 }}>{f.rain_sum} mm</span>
                          ) : '-'}
                        </td>
                        <td>
                          {f.precipitation_probability != null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 40, height: 4, borderRadius: 2, background: '#e0e0e0', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${f.precipitation_probability}%`, height: '100%',
                                  background: f.precipitation_probability > 60 ? '#1e88e5' : '#90caf9',
                                  borderRadius: 2
                                }} />
                              </div>
                              <span style={{ fontSize: 11 }}>{f.precipitation_probability}%</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ fontSize: 12 }}>{f.wind_speed_max} km/h</td>
                        <td>
                          <span style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: f.uv_index > 7 ? '#fecdd3' : f.uv_index > 5 ? '#fed7aa' : '#dcfce7',
                            color: f.uv_index > 7 ? '#dc2626' : f.uv_index > 5 ? '#ea580c' : '#16a34a'
                          }}>
                            {f.uv_index != null ? f.uv_index : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hourly Forecast */}
          {activeTab === 'hourly' && forecast.hourly && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, padding: '16px 20px 12px' }}>
                ⏰ Hourly Forecast (Next 48h) — {forecast.city}
              </h3>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                    <tr>
                      <th>Time</th>
                      <th>Condition</th>
                      <th>Temp</th>
                      <th>Humidity</th>
                      <th>Rain Prob.</th>
                      <th>Precip.</th>
                      <th>Wind</th>
                      <th>Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.hourly.map((h, i) => {
                      const dt = new Date(h.datetime);
                      const isNewDay = i === 0 || new Date(forecast.hourly[i - 1]?.datetime).getDate() !== dt.getDate();
                      return (
                        <>
                          {isNewDay && (
                            <tr key={`day-${i}`}>
                              <td colSpan="8" style={{
                                background: '#f0f5f0', fontWeight: 700, color: '#2d7a3a', fontSize: 12,
                                padding: '8px 14px', borderTop: i > 0 ? '2px solid var(--border)' : 'none'
                              }}>
                                📅 {dt.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </td>
                            </tr>
                          )}
                          <tr key={i}>
                            <td style={{ fontWeight: 500, fontSize: 12 }}>{formatTime(h.datetime)}</td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 16 }}>{h.icon}</span>
                                <span style={{ fontSize: 11 }}>{h.description}</span>
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{h.temperature}°C</td>
                            <td style={{ fontSize: 12 }}>{h.humidity}%</td>
                            <td style={{ fontSize: 12 }}>
                              {h.precipitation_probability > 0 ? (
                                <span style={{
                                  color: h.precipitation_probability > 50 ? '#1e88e5' : 'var(--text-muted)'
                                }}>{h.precipitation_probability}%</span>
                              ) : '-'}
                            </td>
                            <td style={{ fontSize: 12 }}>{h.precipitation > 0 ? `${h.precipitation} mm` : '-'}</td>
                            <td style={{ fontSize: 12 }}>{h.wind_speed} km/h</td>
                            <td style={{ fontSize: 12 }}>{h.visibility} km</td>
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

      {/* Empty State */}
      {!weather && !error && (
        <div className="card">
          <div className="empty-state" style={{ padding: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌾</div>
            <h3>Enter a city to view weather data</h3>
            <p>Get real-time weather information with farming-specific advisories for your region</p>
            <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8, fontWeight: 500 }}>
              📡 Powered by Open-Meteo — Free, No API Key Required
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
