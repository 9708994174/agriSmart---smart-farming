import { Link } from 'react-router-dom';

/* Real data from the platform */
const stats = [
  { num: '12', label: 'Crop Types Analyzed' },
  { num: '26', label: 'Disease Classifications' },
  { num: '23', label: 'Official MSP Crops' },
  { num: '13', label: 'Languages Supported' },
];

const features = [
  { title: 'AI Chatbot Assistant', desc: 'Ask anything about farming — voice & text, 13 Indian languages supported.', icon: '💬', color: '#2d7a3a' },
  { title: 'Crop Recommendation', desc: 'ML-powered crop suggestions based on soil nutrients, climate, and your region.', icon: '🌾', color: '#4caf50' },
  { title: 'Disease Detection', desc: 'Upload a plant leaf photo for instant AI-powered disease diagnosis & treatment advice.', icon: '🔬', color: '#f5a623' },
  { title: 'Weather Advisory', desc: 'Real-time weather with farming-specific recommendations powered by Open-Meteo.', icon: '🌤️', color: '#1e88e5' },
  { title: 'Market Prices', desc: 'Live mandi prices and MSP data for 23+ government-notified crops across India.', icon: '📈', color: '#e53935' },
  { title: 'Voice in 13 Languages', desc: 'Speak naturally in Hindi, Punjabi, Tamil, Telugu, Bengali and 8 more Indian languages.', icon: '🎙️', color: '#7b1fa2' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Navigation ── */}
      <nav style={{
        padding: '0 40px', height: 60, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #e8f5e9', background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Brand — just text, no logo */}
        <span style={{
          fontSize: 22, fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #1b5e20, #2d7a3a)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>AGRISMART</span>

        {/* Nav links + CTA */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: 13, fontWeight: 500, color: '#4a6a4a', padding: '8px 12px', textDecoration: 'none' }}>Features</a>
          <a href="#about" style={{ fontSize: 13, fontWeight: 500, color: '#4a6a4a', padding: '8px 12px', textDecoration: 'none' }}>About</a>
          {/* Always show Login + Signup in navbar */}
          <Link to="/register" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '80px 40px 56px', textAlign: 'center', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,122,58,0.06) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px',
            borderRadius: 999, marginBottom: 24, background: '#e8f5e9',
            border: '1px solid #c8e6c9', fontSize: 12, fontWeight: 600, color: '#2d7a3a',
          }}>
            🌱 AI-Powered Agriculture Platform for Indian Farmers
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.07, marginBottom: 20, letterSpacing: '-0.03em', fontFamily: 'Outfit', color: '#1a2e1a' }}>
            Intelligent Farming with{' '}
            <span className="text-gradient">AgriSmart AI</span>
          </h1>

          <p style={{ fontSize: 17, color: '#4a6a4a', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.7 }}>
            AI-powered crop recommendations, instant disease detection, weather forecasts,
            and live market intelligence — built for Indian farmers in their own language.
          </p>

          {/* Hero CTA — always Login + Signup */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg"
              style={{ fontSize: 16, padding: '15px 36px', borderRadius: 12 }}>
              Create Free Account
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg"
              style={{ fontSize: 16, padding: '15px 36px', borderRadius: 12 }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats — Real Data ── */}
      <section style={{ padding: '0 40px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '28px 20px', borderRadius: 18,
              background: 'linear-gradient(135deg, #f0faf0, #fff)',
              border: '1px solid #c8e6c9',
              boxShadow: '0 4px 16px rgba(45,122,58,0.06)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,122,58,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,122,58,0.06)'; }}>
              <h3 style={{ fontSize: 38, fontWeight: 900, color: '#2d7a3a', fontFamily: 'Outfit', marginBottom: 4 }}>{s.num}</h3>
              <p style={{ fontSize: 13, color: '#4a6a4a', fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Highlight badges ── */}
      <section style={{ padding: '0 40px 56px', background: 'linear-gradient(180deg,#e8f5e9,#fff)' }}>
        <div style={{ maxWidth: 850, margin: '0 auto', padding: '36px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {['🌱 100% Free to Use', '🗣️ Voice in 13 Languages', '🔬 26 Disease Classes', '📊 23 MSP Crops Tracked', '☁️ Open-Meteo Weather', '🤖 Groq AI Powered'].map(t => (
              <div key={t} style={{
                padding: '10px 18px', borderRadius: 10, background: 'white',
                border: '1px solid #c8e6c9', fontSize: 13, fontWeight: 600, color: '#2d7a3a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>{t}</div>
            ))}
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800, color: '#1a2e1a', marginBottom: 10 }}>Your AI Farming Companion</h2>
          <p style={{ textAlign: 'center', fontSize: 15, color: '#4a6a4a', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Get personalized crop advice, detect plant diseases instantly, and access real-time market prices — all through a simple conversation in your language.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '60px 40px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#1a2e1a' }}>
          Complete Farming Toolkit
        </h2>
        <p style={{ textAlign: 'center', color: '#4a6a4a', marginBottom: 44, fontSize: 15 }}>
          Every tool a modern Indian farmer needs, powered by artificial intelligence
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: 24, borderRadius: 18, background: '#ffffff',
              border: '1px solid #e8f5e9', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              transition: 'all 0.25s', cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.09)'; e.currentTarget.style.borderColor = `${f.color}40`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e8f5e9'; }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 16,
                background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1a2e1a' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#4a6a4a', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="about" style={{ padding: '60px 40px', textAlign: 'center', background: 'linear-gradient(180deg,#ffffff,#e8f5e9)' }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, color: '#1a2e1a' }}>Ready to Transform Your Farming?</h2>
        <p style={{ color: '#4a6a4a', marginBottom: 28, fontSize: 15 }}>Join thousands of farmers using AI to grow smarter</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: 16, padding: '15px 36px', borderRadius: 12 }}>
            Create Free Account
          </Link>
          <Link to="/login" className="btn btn-outline btn-lg" style={{ fontSize: 16, padding: '15px 36px', borderRadius: 12 }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '24px 40px', borderTop: '1px solid #e8f5e9', textAlign: 'center', background: '#f8faf8' }}>
        <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '-0.01em', color: '#2d7a3a' }}>AGRISMART</span>
        <p style={{ color: '#7a9a7a', fontSize: 12, marginTop: 6 }}>
          AI Decision Support System for Indian Farmers · Capstone Project 2026
        </p>
        <p style={{ color: '#9ab89a', fontSize: 11, marginTop: 4 }}>
          Ministry of Agriculture &amp; Farmers Welfare · Government of India
        </p>
      </footer>
    </div>
  );
}
