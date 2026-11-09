import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalMigration } from './components/auth/GlobalMigration';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import AuthPage from './pages/AuthPage';

const Library = lazy(() => import('./pages/Library'));
const ChatSofia = lazy(() => import('./pages/ChatSofia'));
const PlanningCenter = lazy(() => import('./pages/PlanningCenter'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const AnnaleDetail = lazy(() => import('./pages/AnnaleDetail'));
const Statistics = lazy(() => import('./pages/StatsPage'));
const FlashcardsExplorer = lazy(() => import('./pages/FlashcardsExplorer'));
const ErrorBookPage = lazy(() => import('./pages/ErrorBookPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

import { DialogProvider } from './context/DialogContext';
import { useTheme } from './context/ThemeContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { FileSystemProvider } from './hooks/useFileSystem';
import { SpacedRepetitionProvider } from './hooks/useSpacedRepetition';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { setTheme } = useTheme();

  // Sync theme from profile only when profile preference changes
  useEffect(() => {
    if (profile?.preferences?.theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile?.preferences?.theme, setTheme]);

  // If auth is still checking and user hasn't been established
  if (loading) {
    if (user) {
      // In-app loading once connected: keep exact existing design
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1.5rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Initialisation de votre espace Sof.IA...</p>
          </div>
        </div>
      );
    }

    // Unauthenticated initial load / refresh: show the Landing Page immediately
    // so visitors never see the white/pink loading screen
    return <AuthPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <GlobalMigration />
      <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement en cours...</div>}>
          <Routes>
            <Route path="/chat" element={<ChatSofia />} />
            <Route path="/:folderId?" element={<Library />} />
            <Route path="/subject/:id" element={<SubjectDetail />} />
            <Route path="/annale/:id" element={<AnnaleDetail />} />
            <Route path="/planning" element={<PlanningCenter />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/flashcards" element={<FlashcardsExplorer />} />
            <Route path="/errors" element={<ErrorBookPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <FileSystemProvider>
        <SpacedRepetitionProvider>
          <DialogProvider>
            <PomodoroProvider>
              <AppContent />
            </PomodoroProvider>
          </DialogProvider>
        </SpacedRepetitionProvider>
      </FileSystemProvider>
    </AuthProvider>
  );
}

export default App;
