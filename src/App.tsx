import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LearningDashboard from './pages/LearningDashboard';
import LoginPage from './pages/LoginPage';
import './index.css';

function AppRouter() {
  const { session, loading } = useAuth();

  // Apply saved theme on load
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') document.documentElement.classList.add('light-theme');
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        gap: '10px'
      }}>
        <span style={{ opacity: 0.6 }}>Loading...</span>
      </div>
    );
  }

  return session ? <LearningDashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
