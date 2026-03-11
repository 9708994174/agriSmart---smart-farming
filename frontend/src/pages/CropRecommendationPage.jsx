import { useState } from 'react';
import { predictAPI } from '../services/api';

export default function CropRecommendationPage() {
  const [form, setForm] = useState({ nitrogen: '', phosphorus: '', potassium: '', temperature: '', humidity: '', ph: '', rainfall: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presets = [
    { label: '🌾 Rice Season', values: { nitrogen: 80, phosphorus: 48, potassium: 40, temperature: 28, humidity: 80, ph: 6.5, rainfall: 200 } },
    { label: '🌿 Wheat Season', values: { nitrogen: 100, phosphorus: 55, potassium: 35, temperature: 18, humidity: 55, ph: 7.0, rainfall: 80 } },
    { label: '🌻 Cotton Belt', values: { nitrogen: 120, phosphorus: 45, potassium: 50, temperature: 30, humidity: 50, ph: 7.2, rainfall: 70 } },
  ];

  const fields = [
    { key: 'nitrogen', label: 'Nitrogen (N)', unit: 'kg/ha', min: 0, max: 200 },
    { key: 'phosphorus', label: 'Phosphorus (P)', unit: 'kg/ha', min: 0, max: 200 },
    { key: 'potassium', label: 'Potassium (K)', unit: 'kg/ha', min: 0, max: 200 },
    { key: 'temperature', label: 'Temperature', unit: '°C', min: -10, max: 60 },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100 },
    { key: 'ph', label: 'Soil pH', unit: '', min: 0, max: 14, step: 0.1 },
    { key: 'rainfall', label: 'Rainfall', unit: 'mm', min: 0, max: 500 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null);
    try {
      const data = {};
      for (const [k, v] of Object.entries(form)) {
        if (!v && v !== 0) { setError(`Please enter ${k}`); setLoading(false); return; }
        data[k] = parseFloat(v);
      }
      const res = await predictAPI.cropRecommendation(data);
      setResult(res.data);
    } catch (err) { setError(err.response?.data?.detail || 'Prediction failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>🌾 Crop Recommendation</h1>
        <p>Enter soil and climate parameters for AI-powered crop suggestions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {presets.map((p, i) => (
              <button key={i} className="btn btn-secondary btn-sm"
                onClick={() => setForm(Object.fromEntries(Object.entries(p.values).map(([k, v]) => [k, String(v)])))}>
                {p.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {fields.map(f => (
                <div key={f.key} className="input-group">
                  <label>{f.label} {f.unit && <span style={{ color: 'var(--text-muted)' }}>({f.unit})</span>}</label>
                  <input className="input-field" type="number" step={f.step || 1} min={f.min} max={f.max}
                    placeholder={`${f.min} - ${f.max}`} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
              {loading ? 'Analyzing...' : '🔍 Get Recommendations'}
            </button>
          </form>
        </div>

        {result && (
          <div className="animate-slideIn">
            <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🧪 Soil Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(result.soil_analysis || {}).filter(([k]) => k.endsWith('_status')).map(([key, val]) => (
                  <div key={key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 10, background: 'white'
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace('_status', '')}</span>
                    <span className={`badge badge-${val === 'High' ? 'success' : val === 'Low' ? 'danger' : val === 'Acidic' || val === 'Alkaline' ? 'warning' : 'info'}`}>{val}</span>
                  </div>
                ))}
              </div>
              {result.soil_analysis?.recommendations?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Recommendations:</p>
                  {result.soil_analysis.recommendations.map((r, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>✓ {r}</p>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🌱 Recommended Crops</h3>
            {result.model_used && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Model: {result.model_used}</p>}
            {(result.recommended_crops || result.crops || []).map((crop, i) => (
              <div key={i} className="card" style={{ marginBottom: 10, padding: 16 }}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700 }}>{i + 1}. {crop.name}</h4>
                  <span className={`badge ${crop.confidence > 70 ? 'badge-success' : crop.confidence > 50 ? 'badge-warning' : 'badge-info'}`}>
                    {crop.confidence}% match
                  </span>
                </div>
                <div className="progress-bar" style={{ marginBottom: 8 }}>
                  <div className="progress-fill" style={{
                    width: `${crop.confidence}%`,
                    background: crop.confidence > 70 ? 'var(--success)' : crop.confidence > 50 ? 'var(--warning)' : 'var(--info)'
                  }} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{crop.description}</p>
                {crop.season && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>🗓️ Season: {crop.season}</p>}
              </div>
            ))}

            {(result.farming_tips || result.tips)?.length > 0 && (
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, #fff3e0, #fff8e1)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💡 Farming Tips</h3>
                {(result.farming_tips || result.tips).map((tip, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {tip}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
