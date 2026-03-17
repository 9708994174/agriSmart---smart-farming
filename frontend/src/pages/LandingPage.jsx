import { Link } from 'react-router-dom';

const stats = [
  { num: '12', label: 'Crop Types Analyzed' },
  { num: '26', label: 'Disease Classifications' },
  { num: '23', label: 'Official MSP Crops' },
  { num: '13', label: 'Languages Supported' },
];

const features = [
  { title: 'AI Chatbot Assistant', desc: 'Ask anything about farming — voice & text, 13 Indian languages.', icon: '💬', color: '#2d7a3a' },
  { title: 'Crop Recommendation', desc: 'ML-powered crop suggestions based on soil, climate & region.', icon: '🌾', color: '#4caf50' },
  { title: 'Disease Detection', desc: 'Upload a plant photo for instant AI disease diagnosis.', icon: '🔬', color: '#f5a623' },
  { title: 'Weather Advisory', desc: 'Real-time weather with farming recommendations.', icon: '🌤️', color: '#1e88e5' },
  { title: 'Market Prices', desc: 'Live mandi prices and MSP data for 23+ crops.', icon: '📈', color: '#e53935' },
  { title: 'Voice in 13 Languages', desc: 'Speak naturally in Hindi, Punjabi, Tamil & more.', icon: '🎙️', color: '#7b1fa2' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Navigation ── */}
      <nav style={{
        padding: '0 20px', height: 56, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #e8f5e9', background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{
          fontSize: 20, fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #1b5e20, #2d7a3a)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>AGRISMART</span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Hide nav links on very small screens */}
          <a href="#features" style={{ fontSize: 13, fontWeight: 500, color: '#4a6a4a', padding: '8px 10px', textDecoration: 'none', display: window.innerWidth > 480 ? 'block' : 'none' }}>Features</a>
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ fontSize: 12, padding: '7px 14px' }}>Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: '7px 14px' }}>Sign Up</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '48px 20px 40px', textAlign: 'center', maxWidth: 860, margin: '0 auto', position: 'relative' }}>
        <div style={{
          position: 'absolute', width: '80%', height: '80%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,122,58,0.06) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px',
            borderRadius: 999, marginBottom: 20, background: '#e8f5e9',
            border: '1px solid #c8e6c9', fontSize: 12, fontWeight: 600, color: '#2d7a3a',
          }}>
            🌱 AI-Powered Agriculture Platform for Indian Farmers
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.03em', fontFamily: 'Outfit', color: '#1a2e1a' }}>
            Intelligent Farming with{' '}
            <span className="text-gradient">AgriSmart AI</span>
          </h1>

          <p style={{ fontSize: 'clamp(14px, 3vw, 17px)', color: '#4a6a4a', maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.6 }}>
            AI-powered crop recommendations, disease detection, weather forecasts, and market intelligence — in your own language.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg"
              style={{ fontSize: 'clamp(13px, 2.5vw, 16px)', padding: 'clamp(11px, 2vw, 15px) clamp(20px, 4vw, 36px)', borderRadius: 12 }}>
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg"
              style={{ fontSize: 'clamp(13px, 2.5vw, 16px)', padding: 'clamp(11px, 2vw, 15px) clamp(20px, 4vw, 36px)', borderRadius: 12 }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '0 16px 48px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '20px 12px', borderRadius: 16,
              background: 'linear-gradient(135deg, #f0faf0, #fff)',
              border: '1px solid #c8e6c9',
              boxShadow: '0 4px 16px rgba(45,122,58,0.06)',
            }}>
              <h3 style={{ fontSize: 'clamp(28px, 6vw, 38px)', fontWeight: 900, color: '#2d7a3a', fontFamily: 'Outfit', marginBottom: 4 }}>{s.num}</h3>
              <p style={{ fontSize: 12, color: '#4a6a4a', fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Highlight badges ── */}
      <section style={{ padding: '0 16px 40px', background: 'linear-gradient(180deg,#e8f5e9,#fff)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {['🌱 100% Free', '🗣️ 13 Languages', '🔬 26 Disease Types', '📊 23 MSP Crops', '🤖 Groq AI'].map(t => (
              <div key={t} style={{
                padding: '8px 14px', borderRadius: 8, background: 'white',
                border: '1px solid #c8e6c9', fontSize: 12, fontWeight: 600, color: '#2d7a3a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>{t}</div>
            ))}
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, color: '#1a2e1a', marginBottom: 8 }}>Your AI Farming Companion</h2>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#4a6a4a', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Get personalized crop advice, detect plant diseases instantly, and access real-time market prices — through a simple conversation.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '48px 16px 60px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#1a2e1a' }}>
          Complete Farming Toolkit
        </h2>
        <p style={{ textAlign: 'center', color: '#4a6a4a', marginBottom: 32, fontSize: 14 }}>
          Every tool a modern Indian farmer needs, powered by AI
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: '20px 18px', borderRadius: 16, background: '#ffffff',
              border: '1px solid #e8f5e9', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 14,
                background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#1a2e1a' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#4a6a4a', lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="about" style={{ padding: '48px 20px', textAlign: 'center', background: 'linear-gradient(180deg,#ffffff,#e8f5e9)' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, marginBottom: 10, color: '#1a2e1a' }}>Ready to Transform Your Farming?</h2>
        <p style={{ color: '#4a6a4a', marginBottom: 24, fontSize: 14 }}>Join farmers using AI to grow smarter</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: 'clamp(13px, 2.5vw, 16px)', padding: 'clamp(11px, 2vw, 15px) clamp(20px, 4vw, 36px)', borderRadius: 12 }}>
            Create Free Account
          </Link>
          <Link to="/login" className="btn btn-outline btn-lg" style={{ fontSize: 'clamp(13px, 2.5vw, 16px)', padding: 'clamp(11px, 2vw, 15px) clamp(20px, 4vw, 36px)', borderRadius: 12 }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '20px 16px', borderTop: '1px solid #e8f5e9', textAlign: 'center', background: '#f8faf8' }}>
        <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.01em', color: '#2d7a3a' }}>AGRISMART</span>
        <p style={{ color: '#7a9a7a', fontSize: 12, marginTop: 4 }}>
          AI Decision Support for Indian Farmers · 2026
        </p>
      </footer>
    </div>
  );
}
