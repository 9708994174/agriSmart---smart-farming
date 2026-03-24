import { useState, useEffect } from 'react';
import { predictAPI, weatherAPI } from '../services/api';
import { useToast } from '../components/Toast';

const LOCATION_PRESETS = {
  Punjab:           { nitrogen: 100, phosphorus: 55, potassium: 35, temperature: 20, humidity: 60, ph: 7.0, rainfall: 80,  region: 'Punjab / Haryana', note: 'Wheat-growing belt, cool winters, canal irrigation' },
  Haryana:          { nitrogen: 100, phosphorus: 55, potassium: 35, temperature: 22, humidity: 55, ph: 7.1, rainfall: 75,  region: 'Haryana',          note: 'Mix of wheat and rice cultivation' },
  Maharashtra:      { nitrogen: 90,  phosphorus: 40, potassium: 50, temperature: 27, humidity: 70, ph: 6.8, rainfall: 600, region: 'Maharashtra',       note: 'Cotton & soybean belt' },
  Bihar:            { nitrogen: 75,  phosphorus: 35, potassium: 30, temperature: 26, humidity: 72, ph: 6.5, rainfall: 150, region: 'Bihar / Eastern UP', note: 'Rice-wheat rotation zone' },
  Rajasthan:        { nitrogen: 60,  phosphorus: 25, potassium: 30, temperature: 30, humidity: 35, ph: 7.8, rainfall: 40,  region: 'Rajasthan',         note: 'Drought-tolerant crops ideal' },
  Tamil_Nadu:       { nitrogen: 85,  phosphorus: 40, potassium: 45, temperature: 29, humidity: 78, ph: 6.2, rainfall: 300, region: 'Tamil Nadu',         note: 'Multi-crop, rice dominant' },
  Gujarat:          { nitrogen: 80,  phosphorus: 35, potassium: 45, temperature: 28, humidity: 60, ph: 7.2, rainfall: 70,  region: 'Gujarat',            note: 'Cotton & groundnut belt' },
  West_Bengal:      { nitrogen: 90,  phosphorus: 45, potassium: 35, temperature: 28, humidity: 80, ph: 6.0, rainfall: 250, region: 'West Bengal',        note: 'Paddy dominant, humid subtropical' },
  Madhya_Pradesh:   { nitrogen: 85,  phosphorus: 40, potassium: 40, temperature: 25, humidity: 55, ph: 6.8, rainfall: 100, region: 'Madhya Pradesh',     note: 'Wheat, soybean, pulses belt' },
};

const STATE_PRESET_MAP = {
  'punjab': 'Punjab', 'haryana': 'Haryana', 'maharashtra': 'Maharashtra',
  'bihar': 'Bihar', 'rajasthan': 'Rajasthan', 'tamil nadu': 'Tamil_Nadu',
  'gujarat': 'Gujarat', 'west bengal': 'West_Bengal', 'madhya pradesh': 'Madhya_Pradesh',
  'uttar pradesh': 'Bihar', 'andhra pradesh': 'Tamil_Nadu', 'telangana': 'Tamil_Nadu', 'karnataka': 'Tamil_Nadu',
};

const QUICK_PRESETS = [
  { label: '🌾 Rice Season',  values: { nitrogen: 80, phosphorus: 48, potassium: 40, temperature: 28, humidity: 80, ph: 6.5, rainfall: 200 } },
  { label: '🌿 Wheat Season', values: { nitrogen: 100, phosphorus: 55, potassium: 35, temperature: 18, humidity: 55, ph: 7.0, rainfall: 80 } },
  { label: '🌻 Cotton Belt',  values: { nitrogen: 120, phosphorus: 45, potassium: 50, temperature: 30, humidity: 50, ph: 7.2, rainfall: 70 } },
];

const FIELDS = [
  { key: 'nitrogen',    label: 'Nitrogen (N)',    unit: 'kg/ha', min: 0,   max: 200, step: 1 },
  { key: 'phosphorus',  label: 'Phosphorus (P)', unit: 'kg/ha', min: 0,   max: 200, step: 1 },
  { key: 'potassium',   label: 'Potassium (K)',  unit: 'kg/ha', min: 0,   max: 200, step: 1 },
  { key: 'temperature', label: 'Temperature',    unit: '°C',    min: -10, max: 60,  step: 0.1 },
  { key: 'humidity',    label: 'Humidity',        unit: '%',     min: 0,   max: 100, step: 1 },
  { key: 'ph',          label: 'Soil pH',         unit: '',      min: 0,   max: 14,  step: 0.1 },
  { key: 'rainfall',    label: 'Rainfall',        unit: 'mm',    min: 0,   max: 500, step: 1 },
];

const EMPTY_FORM = { nitrogen: '', phosphorus: '', potassium: '', temperature: '', humidity: '', ph: '', rainfall: '' };

// ── Confidence bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
  const color = value > 70 ? '#16a34a' : value > 50 ? '#d97706' : '#1e88e5';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>Confidence</span>
        <span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: 'width 1s cubic-bezier(.4,2,.6,1)',
        }} />
      </div>
    </div>
  );
}

export default function CropRecommendationPage() {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [geoInfo, setGeoInfo]     = useState(null);
  const [weatherInfo, setWeather] = useState(null);
  const [locationNote, setNote]   = useState('');
  const toast = useToast();

  useEffect(() => { detectAndFillLocation(); }, []);

  const detectAndFillLocation = () => {
    if (!('geolocation' in navigator)) return;
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const geoData = await geoRes.json();
          const stateRaw = (geoData.address?.state || '').toLowerCase();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
          const presetKey = Object.keys(STATE_PRESET_MAP).find(k => stateRaw.includes(k));
          const preset = presetKey ? LOCATION_PRESETS[STATE_PRESET_MAP[presetKey]] : null;
          let liveWeather = null;
          try {
            const wRes = await weatherAPI.getByLocation(pos.coords.latitude, pos.coords.longitude);
            if (wRes.data && !wRes.data.error) liveWeather = wRes.data;
          } catch {}
          setGeoInfo({ state: geoData.address?.state || '', city, preset });
          setWeather(liveWeather);
          setGeoStatus('done');
          if (preset) {
            setForm({
              nitrogen:    String(preset.nitrogen),
              phosphorus:  String(preset.phosphorus),
              potassium:   String(preset.potassium),
              temperature: liveWeather ? String(Math.round(liveWeather.temperature)) : String(preset.temperature),
              humidity:    liveWeather ? String(Math.round(liveWeather.humidity))    : String(preset.humidity),
              ph:          String(preset.ph),
              rainfall:    String(preset.rainfall),
            });
            setNote(preset.note);
            toast.success(`📍 Auto-filled for ${city || preset.region}`);
          } else if (liveWeather) {
            setForm(p => ({ ...p, temperature: String(Math.round(liveWeather.temperature)), humidity: String(Math.round(liveWeather.humidity)) }));
          }
        } catch { setGeoStatus('denied'); }
      },
      () => setGeoStatus('denied'),
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const applyPreset = (values) => {
    setForm(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null);
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (!v && v !== 0) { setError(`Please fill in: ${k}`); setLoading(false); return; }
        data[k] = parseFloat(v);
      }
      let lastErr;
      for (let i = 1; i <= 3; i++) {
        try { const res = await predictAPI.cropRecommendation(data); setResult(res.data); toast.success('Recommendation ready!'); return; }
        catch (err) { lastErr = err; if (i < 3) await new Promise(r => setTimeout(r, 1000 * i)); }
      }
      setError(lastErr?.response?.data?.detail || 'Prediction failed. Please try again.');
    } catch (err) { setError(err.response?.data?.detail || 'Prediction failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fadeIn">
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>🌾 Crop Recommendation</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 14 }}>
          AI-powered crop suggestions based on your location, soil &amp; live weather data
        </p>
      </div>

      {/* ── Location Banner ── */}
      {geoStatus === 'detecting' && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderRadius:12, background:'linear-gradient(90deg,#e8f5e9,#f1f8e9)', border:'1px solid #c8e6c9', marginBottom:16, fontSize:13, color:'#2d7a3a', fontWeight:600 }}>
          <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>📡</span>
          Detecting your location to auto-fill parameters…
        </div>
      )}
      {geoStatus === 'done' && geoInfo && (
        <div style={{ padding:'13px 18px', borderRadius:14, background:'#e8f5e9', border:'1.5px solid #a5d6a7', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1b5e20' }}>
                📍 {geoInfo.city ? `${geoInfo.city}, ${geoInfo.state}` : geoInfo.state || 'Location detected'}
              </div>
              {locationNote && <div style={{ fontSize:12, color:'#388e3c', marginTop:2 }}>💡 {locationNote}</div>}
            </div>
            <button onClick={detectAndFillLocation} style={{ padding:'5px 14px', borderRadius:99, border:'1.5px solid #2d7a3a', background:'white', color:'#2d7a3a', fontSize:12, cursor:'pointer', fontWeight:600 }}>
              🔄 Re-detect
            </button>
          </div>
          {weatherInfo && (
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              {[
                { icon:'🌡️', lbl:'Live Temp',  val:`${Math.round(weatherInfo.temperature)}°C` },
                { icon:'💧', lbl:'Humidity',   val:`${Math.round(weatherInfo.humidity)}%` },
                { icon:'☁️', lbl:'Clouds',     val:`${weatherInfo.clouds}%` },
                { icon:'🌤️', lbl:'Conditions', val: weatherInfo.description },
              ].map((b,i)=>(
                <span key={i} style={{ padding:'4px 12px', borderRadius:99, background:'white', border:'1px solid #c8e6c9', fontSize:12, fontWeight:600, color:'#1b5e20', display:'flex', alignItems:'center', gap:5 }}>
                  {b.icon} {b.lbl}: {b.val}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {geoStatus === 'denied' && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'#fff3e0', border:'1px solid #ffe0b2', marginBottom:14, fontSize:12, color:'#e65100' }}>
          ⚠️ Location permission denied. Fill parameters manually or pick a region preset.
        </div>
      )}

      {/* ── Preset Buttons ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Quick presets</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {QUICK_PRESETS.map((p,i) => (
            <button key={i} onClick={() => applyPreset(p.values)} style={{
              padding:'7px 16px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer',
              border:'1.5px solid var(--border)', background:'white', color:'var(--text-secondary)', transition:'all 0.15s',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#e8f5e9'; e.currentTarget.style.color='#1b5e20'; e.currentTarget.style.borderColor='#a5d6a7'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='white'; e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.borderColor='var(--border)'; }}
            >{p.label}</button>
          ))}
          <div style={{ width:'1px', background:'var(--border)', margin:'0 4px' }} />
          {Object.entries(LOCATION_PRESETS).slice(0,5).map(([key,p]) => (
            <button key={key} onClick={() => { applyPreset(Object.fromEntries(Object.entries(p).filter(([k])=>FIELDS.some(f=>f.key===k)))); setNote(p.note); toast.success(`📍 ${p.region}`); }} style={{
              padding:'7px 16px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer',
              border:'1.5px solid var(--border)', background:'white', color:'var(--text-secondary)', transition:'all 0.15s',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#e8f5e9'; e.currentTarget.style.color='#1b5e20'; e.currentTarget.style.borderColor='#a5d6a7'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='white'; e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.borderColor='var(--border)'; }}
            >📍 {p.region.split('/')[0].trim()}</button>
          ))}
        </div>
      </div>

      {/* ── Two-column layout: form left, results right ── */}
      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap:24, alignItems:'start' }}>

        {/* ── LEFT: Parameter Form ── */}
        <div style={{ background:'white', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-light)', background:'linear-gradient(90deg,#f0fdf4,#ffffff)' }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>🌱 Soil &amp; Climate Parameters</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Auto-filled from your location where available</p>
          </div>
          <form onSubmit={handleSubmit} style={{ padding:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                    {f.label}
                    {f.unit && <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:4 }}>({f.unit})</span>}
                    {(f.key==='temperature'||f.key==='humidity') && weatherInfo && (
                      <span style={{ marginLeft:6, fontSize:10, color:'#16a34a', fontWeight:700, padding:'1px 6px', borderRadius:99, background:'#dcfce7' }}>📡 live</span>
                    )}
                  </label>
                  <input className="input-field" type="number" step={f.step||1} min={f.min} max={f.max}
                    placeholder={`${f.min}–${f.max}`} value={form[f.key]}
                    onChange={e => setForm(p=>({...p, [f.key]: e.target.value}))}
                    style={{ width:'100%', background: (f.key==='temperature'||f.key==='humidity')&&weatherInfo ? '#f0fdf4' : undefined, borderColor: (f.key==='temperature'||f.key==='humidity')&&weatherInfo ? '#a5d6a7' : undefined }} />
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:13 }}>
                ❌ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop:20, width:'100%', padding:'14px', borderRadius:12, fontSize:15, fontWeight:700,
              background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#1b5e20,#2d7a3a,#4caf50)',
              color: loading ? 'var(--text-muted)' : 'white', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(45,122,58,0.35)',
              transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {loading ? (
                <><span className="spinner" style={{ width:18, height:18, borderWidth:2, borderTopColor:'white', borderColor:'rgba(255,255,255,0.3)' }} /><span>Analyzing your parameters…</span></>
              ) : '🔍 Get AI Recommendation'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Results ── */}
        {result && (
          <div className="animate-slideIn" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Location context */}
            {geoInfo?.city && (
              <div style={{ padding:'12px 16px', borderRadius:14, background:'linear-gradient(135deg,#e8f5e9,#f1f8e9)', border:'1px solid #c8e6c9' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#1b5e20', marginBottom:4 }}>
                  📍 Results for {geoInfo.city}{geoInfo.state ? `, ${geoInfo.state}` : ''}
                </div>
                {weatherInfo && (
                  <div style={{ fontSize:12, color:'#388e3c' }}>
                    🌡️ {Math.round(weatherInfo.temperature)}°C · 💧 {Math.round(weatherInfo.humidity)}% · {weatherInfo.description}
                  </div>
                )}
              </div>
            )}

            {/* Soil Analysis */}
            <div style={{ background:'white', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border-light)', background:'linear-gradient(90deg,#e8f5e9,#fff)' }}>
                <h3 style={{ fontSize:14, fontWeight:700, margin:0 }}>🧪 Soil Analysis</h3>
              </div>
              <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(result.soil_analysis||{}).filter(([k])=>k.endsWith('_status')).map(([key,val])=>(
                  <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderRadius:10, background:'#f8faf8' }}>
                    <span style={{ fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>{key.replace('_status','')}</span>
                    <span className={`badge badge-${val==='High'?'success':val==='Low'?'danger':val==='Acidic'||val==='Alkaline'?'warning':'info'}`}>{val}</span>
                  </div>
                ))}
              </div>
              {result.soil_analysis?.recommendations?.length > 0 && (
                <div style={{ padding:'0 16px 14px' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Recommendations</p>
                  {result.soil_analysis.recommendations.map((r,i)=>(
                    <p key={i} style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:4, display:'flex', gap:6, alignItems:'flex-start' }}>
                      <span style={{ color:'#16a34a', flexShrink:0 }}>✓</span>{r}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Crops */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>🌱 Best Crops for Your Location</h3>
                {result.model_used && <span style={{ fontSize:10, color:'var(--text-muted)', padding:'2px 8px', borderRadius:99, background:'var(--bg-input)' }}>Model: {result.model_used}</span>}
              </div>

              {(result.recommended_crops||result.crops||[]).map((crop,i)=>{
                const isBest = i===0;
                const confColor = crop.confidence>70?'#16a34a':crop.confidence>50?'#d97706':'#1e88e5';
                return (
                  <div key={i} style={{
                    background:'white', borderRadius:14, border: isBest ? '2px solid #2d7a3a' : '1px solid var(--border)',
                    padding:'16px 18px', marginBottom:10, position:'relative',
                    boxShadow: isBest ? '0 4px 20px rgba(45,122,58,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    {isBest && (
                      <div style={{ position:'absolute', top:0, right:16, padding:'3px 12px', background:'linear-gradient(135deg,#1b5e20,#2d7a3a)', color:'white', borderRadius:'0 0 10px 10px', fontSize:10, fontWeight:800, letterSpacing:'0.05em' }}>
                        ⭐ BEST CHOICE
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, paddingTop: isBest ? 6 : 0 }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:400, color:'var(--text-muted)', marginRight:4 }}>#{i+1}</span>
                        <span style={{ fontSize:17, fontWeight:800, color:'#1a2e1a' }}>{crop.name}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:confColor, padding:'3px 10px', borderRadius:99, background:`${confColor}18` }}>{crop.confidence}% match</span>
                    </div>
                    <ConfidenceBar value={crop.confidence} />
                    <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.55, marginBottom:8 }}>{crop.description}</p>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {crop.season && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#e8f5e9', color:'#1b5e20', fontWeight:600 }}>🗓️ {crop.season}</span>}
                      {weatherInfo && (
                        <>
                          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#e8f5e9', color:'#1b5e20' }}>🌡️ {Math.round(weatherInfo.temperature)}°C</span>
                          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:99, background:'#e8f5e9', color:'#1b5e20' }}>💧 {Math.round(weatherInfo.humidity)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Farming Tips */}
            {(result.farming_tips||result.tips)?.length>0 && (
              <div style={{ background:'linear-gradient(135deg,#1b5e20,#2d7a3a)', borderRadius:14, padding:'18px 20px', color:'white' }}>
                <h3 style={{ fontSize:14, fontWeight:800, marginBottom:12, color:'white' }}>💡 Farming Tips</h3>
                {(result.farming_tips||result.tips).map((tip,i)=>(
                  <p key={i} style={{ fontSize:13, lineHeight:1.6, marginBottom:6, opacity:0.9, display:'flex', gap:8 }}>
                    <span style={{ color:'#86efac', flexShrink:0 }}>•</span>{tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Empty results placeholder (before submit) ── */}
      {!result && !loading && (
        <div style={{ marginTop:20, padding:'36px 24px', borderRadius:16, background:'linear-gradient(135deg,#f0fdf4,#f1f8e9)', border:'2px dashed #c8e6c9', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🌱</div>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#1b5e20', marginBottom:6 }}>AI Recommendation Appears Here</h3>
          <p style={{ fontSize:13, color:'#388e3c', maxWidth:380, margin:'0 auto' }}>
            Fill in your soil &amp; climate parameters above and click "Get AI Recommendation" to see crop suggestions tailored to your location.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
