import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalMigration } from './components/auth/GlobalMigration';
import AuthPage from './pages/AuthPage';

const Library = lazy(() => import('./pages/Library'));
const PlanningCenter = lazy(() => import('./pages/PlanningCenter'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const Statistics = lazy(() => import('./pages/StatsPage'));
const FlashcardsExplorer = lazy(() => import('./pages/FlashcardsExplorer'));

import { useTheme } from './context/ThemeContext';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  // Sync theme from profile
  useEffect(() => {
    if (profile?.preferences?.theme && profile.preferences.theme !== theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile, theme, setTheme]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1.5rem' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Initialisation de votre espace Sof.IA...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <GlobalMigration />
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement en cours...</div>}>
        <Routes>
          <Route path="/:folderId?" element={<Library />} />
          <Route path="/subject/:id" element={<SubjectDetail />} />
          <Route path="/planning" element={<PlanningCenter />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/flashcards" element={<FlashcardsExplorer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
