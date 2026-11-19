import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalMigration } from './components/auth/GlobalMigration';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import AuthPage from './pages/AuthPage';

const loadLibrary = () => import('./pages/Library');
const loadChatSofia = () => import('./pages/ChatSofia');
const loadPlanningCenter = () => import('./pages/PlanningCenter');
const loadDashboard = () => import('./pages/Dashboard');
const loadSubjectDetail = () => import('./pages/SubjectDetail');
const loadAnnaleDetail = () => import('./pages/AnnaleDetail');
const loadStatistics = () => import('./pages/StatsPage');
const loadFlashcardsExplorer = () => import('./pages/FlashcardsExplorer');
const loadErrorBookPage = () => import('./pages/ErrorBookPage');
const loadLegalPage = () => import('./pages/LegalPage');

const Library = lazy(loadLibrary);
const ChatSofia = lazy(loadChatSofia);
const PlanningCenter = lazy(loadPlanningCenter);
const Dashboard = lazy(loadDashboard);
const SubjectDetail = lazy(loadSubjectDetail);
const AnnaleDetail = lazy(loadAnnaleDetail);
const Statistics = lazy(loadStatistics);
const FlashcardsExplorer = lazy(loadFlashcardsExplorer);
const ErrorBookPage = lazy(loadErrorBookPage);
const LegalPage = lazy(loadLegalPage);

let routesPreloaded = false;
export function preloadAllRoutes() {
  if (routesPreloaded) return;
  routesPreloaded = true;
  Promise.allSettled([
    loadLibrary(),
    loadSubjectDetail(),
    loadAnnaleDetail(),
    loadChatSofia(),
    loadFlashcardsExplorer(),
    loadStatistics(),
    loadPlanningCenter(),
    loadErrorBookPage(),
    loadDashboard(),
  ]);
}

import { DialogProvider } from './context/DialogContext';
import { useTheme } from './context/ThemeContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { FileSystemProvider } from './hooks/useFileSystem';
import { SpacedRepetitionProvider } from './hooks/useSpacedRepetition';

function AppContent() {
  const { user, profile, loading, isPasswordRecovery } = useAuth();
  const { setTheme } = useTheme();

  // Sync theme from profile only when profile preference changes
  useEffect(() => {
    if (profile?.preferences?.theme) {
      setTheme(profile.preferences.theme);
    }
  }, [profile?.preferences?.theme, setTheme]);

  // Preload all route chunks in background once authenticated so tab transitions take 0ms
  useEffect(() => {
    if (!user || loading) return;
    const idleCb = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 150));
    const handle = idleCb(() => preloadAllRoutes());
    return () => {
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
    };
  }, [user, loading]);

  // Special public route accessible with or without authentication
  if (window.location.pathname === '/legal') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>}>
          <LegalPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

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

  if (!user || isPasswordRecovery) {
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
