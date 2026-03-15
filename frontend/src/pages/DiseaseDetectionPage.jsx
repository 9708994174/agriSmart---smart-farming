import { useState, useRef } from 'react';
import { predictAPI } from '../services/api';
import { useToast } from '../components/Toast';

export default function DiseaseDetectionPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please upload an image file (JPEG, PNG, WEBP)'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File size must be under 10MB'); return; }
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) { setError('Please select an image first.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await predictAPI.diseaseDetection(file);
      setResult(res.data);
      toast.success('Analysis complete!');
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = detail || `Analysis failed (${err.response?.status || 'network error'}). Please try a different image.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); };
  const isHealthy = result?.disease_name?.toLowerCase().includes('healthy');

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1>🔬 Plant Disease Detection</h1>
        <p>Upload a plant leaf photo — our system analyzes color, texture and lesion patterns for diagnosis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: 24 }}>
        {/* ── Upload Panel ── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Upload Plant Image</h3>
            <span className="badge badge-info" style={{ fontSize: 10 }}>🤖 Image Analysis</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--primary)' : preview ? 'var(--primary-200)' : 'var(--border)'}`,
              borderRadius: 14, padding: preview ? 0 : 52, textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.2s', background: dragActive ? 'rgba(45,122,58,0.04)' : 'var(--bg-input)',
              overflow: 'hidden', position: 'relative', minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
            {preview ? (
              <img src={preview} alt="Selected plant leaf"
                style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }} />
            ) : (
              <div>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🌿</div>
                <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)', fontSize: 14 }}>
                  Drop image here or click to browse
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  JPEG, PNG, WEBP — max 10MB
                </p>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginTop: 14, fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-lg"
              disabled={!file || loading}
              style={{ flex: 1 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: 'white',
                        animation: `bounce 1.4s infinite ${i * 0.16}s`, display: 'inline-block'
                      }} />
                    ))}
                  </span>
                  Analyzing Image...
                </span>
              ) : '🔍 Detect Disease'}
            </button>
            {file && (
              <button onClick={reset} className="btn btn-secondary btn-lg">Reset</button>
            )}
          </div>

          {/* Tips */}
          <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: 'rgba(45,122,58,0.04)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              💡 Tips for best results:
            </p>
            {[
              'Take a clear, close-up photo of the affected leaf',
              'Use natural daylight — avoid harsh shadows',
              'Include both healthy and diseased parts of the leaf',
              'Use a plain background for better contrast'
            ].map((tip, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: i < 3 ? 3 : 0 }}>• {tip}</p>
            ))}
          </div>
        </div>

        {/* ── Results Panel ── */}
        {result && result.disease_name && (
          <div className="animate-slideIn">
            {/* Disease result */}
            <div className="card" style={{
              marginBottom: 14,
              borderColor: isHealthy ? 'rgba(67,160,71,0.3)' : 'rgba(229,57,53,0.3)',
              background: isHealthy
                ? 'linear-gradient(135deg, #e8f5e9, #f1f8e9)'
                : 'linear-gradient(135deg, #fbe9e7, #fff3e0)'
            }}>
              <div className="flex-between" style={{ marginBottom: 6 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {isHealthy ? '✅' : '⚠️'} {result.disease_name || 'Diagnosis Result'}
                </h3>
                <span className={`badge ${isHealthy ? 'badge-success' : 'badge-danger'}`}>
                  {result.confidence || 0}% confidence
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {result.description || 'No detailed description available for this condition.'}
              </p>
              {result.crop_type && result.crop_type !== 'Unknown' && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  🌱 Crop: {result.crop_type}
                </p>
              )}
              {result.analysis_method && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontSize: 10 }}>{result.analysis_method}</span>
                </div>
              )}
            </div>

            {/* Alternatives */}
            {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🔄 Alternative Diagnoses</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.alternatives.map((alt, i) => (
                    alt && (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)'
                      }}>
                        <span style={{ fontSize: 13 }}>{alt.name || 'Unknown'}</span>
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>{alt.confidence || 0}%</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Treatment */}
            {Array.isArray(result.treatment) && result.treatment.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💊 Treatment Plan</h3>
                {result.treatment.map((t, i) => (
                  <p key={i} style={{
                    fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6,
                    paddingLeft: 12, borderLeft: '3px solid var(--primary)', marginLeft: 2
                  }}>{t}</p>
                ))}
              </div>
            )}

            {/* Pesticides */}
            {Array.isArray(result.pesticide) && result.pesticide.length > 0 && (
              <div className="card" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🧪 Recommended Pesticides</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.pesticide.map((p, i) => (
                    <span key={i} className="badge badge-warning">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Prevention */}
            {Array.isArray(result.prevention) && result.prevention.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🛡️ Prevention</h3>
                {result.prevention.map((p, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    ✓ {p}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
