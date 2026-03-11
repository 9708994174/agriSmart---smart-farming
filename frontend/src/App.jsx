import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChatbotPage from './pages/ChatbotPage';
import CropRecommendationPage from './pages/CropRecommendationPage';
import DiseaseDetectionPage from './pages/DiseaseDetectionPage';
import WeatherPage from './pages/WeatherPage';
import MarketPage from './pages/MarketPage';
import AdminPage from './pages/AdminPage';
import CommunityPage from './pages/CommunityPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin — own full-page layout, no farmer Layout wrapper */}
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

          {/* Farmer Protected Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chatbot" element={<ChatbotPage />} />
            <Route path="/crop-recommendation" element={<CropRecommendationPage />} />
            <Route path="/disease-detection" element={<DiseaseDetectionPage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
