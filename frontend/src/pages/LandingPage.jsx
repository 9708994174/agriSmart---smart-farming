import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const features = [
  { title: 'AI Chatbot', desc: 'Intelligent farming assistant with voice support and multilingual capabilities', icon: '💬', color: '#2d7a3a' },
  { title: 'Crop Recommendation', desc: 'ML-powered crop suggestions based on soil nutrients and climate parameters', icon: '🌾', color: '#4caf50' },
  { title: 'Disease Detection', desc: 'Upload plant leaf photos for AI-powered disease identification and treatment', icon: '🔬', color: '#f5a623' },
  { title: 'Weather Advisory', desc: 'Real-time weather data with farming-specific recommendations for your region', icon: '🌤️', color: '#1e88e5' },
  { title: 'Market Prices', desc: 'Live mandi prices and MSP data from government sources across India', icon: '📊', color: '#e53935' },
  { title: 'Voice Assistant', desc: 'Talk naturally with AI in English, Hindi, or Punjabi for instant help', icon: '🎙️', color: '#7b1fa2' },
];

const stats = [
  { num: '12+', label: 'Crop Types Analyzed' },
  { num: '8', label: 'Disease Classifications' },
  { num: '20+', label: 'Official MSP Crops' },
  { num: '3', label: 'Languages Supported' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Navigation */}
      <nav style={{
        padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e8f5e9', background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 4 20 4s.5 4.5-1.5 10.2A7 7 0 0 1 11 20z" />
            </svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: '#1b5e20' }}>AgriSmart</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: 13, fontWeight: 500, color: '#4a6a4a', padding: '8px 12px' }}>Features</a>
          <a href="#about" style={{ fontSize: 13, fontWeight: 500, color: '#4a6a4a', padding: '8px 12px' }}>About</a>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '80px 40px 60px', textAlign: 'center', maxWidth: 900, margin: '0 auto', position: 'relative'
      }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,122,58,0.06) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 999, marginBottom: 24,
            background: '#e8f5e9', border: '1px solid #c8e6c9',
            fontSize: 12, fontWeight: 600, color: '#2d7a3a'
          }}>
            🌱 AI-Powered Agriculture Platform
          </div>
          <h1 style={{
            fontSize: 52, fontWeight: 900, lineHeight: 1.08, marginBottom: 20,
            letterSpacing: '-0.03em', fontFamily: 'Outfit', color: '#1a2e1a'
          }}>
            Intelligent Farming with{' '}
            <span className="text-gradient">AgriSmart AI</span>
          </h1>
          <p style={{
            fontSize: 17, color: '#4a6a4a', maxWidth: 600,
            margin: '0 auto 36px', lineHeight: 1.7
          }}>
            AI-powered agricultural assistant providing crop recommendations, disease detection,
            weather forecasts, and market intelligence — built for Indian farmers.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: 16, padding: '16px 36px' }}>
              🚀 Create Free Account
            </Link>
            <a href="#features" className="btn btn-outline btn-lg">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '20px 40px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: 24, borderRadius: 16,
              background: '#f8faf8', border: '1px solid #e8f5e9',
              transition: 'all 0.3s'
            }}>
              <h3 style={{ fontSize: 32, fontWeight: 800, color: '#2d7a3a' }}>{s.num}</h3>
              <p style={{ fontSize: 13, color: '#4a6a4a', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Farmer Illustration Section */}
      <section style={{
        padding: '60px 40px',
        background: 'linear-gradient(180deg, #e8f5e9 0%, #ffffff 100%)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <img
            src="/images/farmer_mascot.png"
            alt="AI Farming Assistant"
            style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto 24px', display: 'block' }}
          />
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: '#1a2e1a' }}>
            Your AI Farming Companion
          </h2>
          <p style={{ fontSize: 15, color: '#4a6a4a', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Get personalized crop advice, detect plant diseases instantly, and access real-time market prices — all through a simple conversation.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '60px 40px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#1a2e1a' }}>
          Complete Farming Toolkit
        </h2>
        <p style={{ textAlign: 'center', color: '#4a6a4a', marginBottom: 44, fontSize: 15 }}>
          Every tool a modern farmer needs, powered by artificial intelligence
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} className="animate-fadeIn" style={{
              animationDelay: `${i * 0.08}s`,
              padding: 24, borderRadius: 16,
              background: '#ffffff', border: '1px solid #e8f5e9',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 16,
                background: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: '#1a2e1a' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#4a6a4a', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About / CTA */}
      <section id="about" style={{
        padding: '60px 40px', textAlign: 'center',
        background: 'linear-gradient(180deg, #ffffff 0%, #e8f5e9 100%)'
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: '#1a2e1a' }}>Ready to Transform Your Farming?</h2>
        <p style={{ color: '#4a6a4a', marginBottom: 24, fontSize: 15 }}>
          Join the next generation of data-driven agriculture
        </p>
        <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: 16, padding: '16px 36px' }}>
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 40px', borderTop: '1px solid #e8f5e9', textAlign: 'center',
        background: '#f8faf8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#2d7a3a">
            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 4 20 4s.5 4.5-1.5 10.2A7 7 0 0 1 11 20z" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1b5e20' }}>AgriSmart</span>
        </div>
        <p style={{ color: '#7a9a7a', fontSize: 12 }}>
          AI-Based Decision Support System for Farmers | Capstone Project 2026
        </p>
        <p style={{ color: '#9ab89a', fontSize: 11, marginTop: 4 }}>
          Ministry of Agriculture & Farmers Welfare · Government of India
        </p>
      </footer>
    </div>
  );
}
