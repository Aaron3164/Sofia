import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private isChunkLoadError = (error: Error | null): boolean => {
    if (!error) return false;
    const msg = error.message || error.toString();
    return (
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Loading chunk')
    );
  };

  public render() {
    if (this.state.hasError) {
      const isUpdate = this.isChunkLoadError(this.state.error);

      if (isUpdate) {
        return (
          <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-primary)',
          }}>
            <div style={{
              maxWidth: '440px',
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '1.25rem',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={28} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Nouvelle mise à jour disponible
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Une nouvelle version de Sof.IA a été déployée. Veuillez rafraîchir la page pour appliquer les nouveautés.
                </p>
              </div>

              <button 
                onClick={this.handleReload}
                className="btn btn-primary shadow-sm hover-lift"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  marginTop: '0.25rem'
                }}
              >
                <RefreshCw size={16} />
                Rafraîchir la page
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '1.25rem',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={30} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                {this.props.fallbackTitle || 'Oups, une erreur inattendue est survenue'}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {this.props.fallbackMessage || "Un élément n'a pas pu être chargé correctement (document PDF complexe ou synchronisation en cours)."}
              </p>
            </div>

            {this.state.error?.message && (
              <div style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(0,0,0,0.1)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
                overflowX: 'auto',
                textAlign: 'left',
                maxHeight: '100px'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                onClick={this.handleReload}
                className="btn btn-outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} />
                Réessayer
              </button>
              <button 
                onClick={this.handleGoHome}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Home size={16} />
                Bibliothèque
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
