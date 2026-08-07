import React, { createContext, useContext, useState, useRef } from 'react';

type DialogType = 'alert' | 'confirm' | 'prompt';

interface DialogOptions {
  type: DialogType;
  message: string;
  defaultValue?: string;
  resolve: (value: any) => void;
}

interface DialogContextType {
  alert: (message: string) => Promise<void>;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const showDialog = (type: DialogType, message: string, defaultValue = '') => {
    return new Promise<any>((resolve) => {
      setInputValue(defaultValue);
      setDialog({ type, message, defaultValue, resolve });
      // Focus input after render if prompt
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    });
  };

  const handleConfirm = () => {
    if (!dialog) return;
    const { type, resolve } = dialog;
    setDialog(null);
    if (type === 'prompt') resolve(inputValue);
    else if (type === 'confirm') resolve(true);
    else resolve(undefined);
  };

  const handleCancel = () => {
    if (!dialog) return;
    const { type, resolve } = dialog;
    setDialog(null);
    if (type === 'prompt') resolve(null);
    else if (type === 'confirm') resolve(false);
    else resolve(undefined);
  };

  const handleCloseOverlay = () => {
    if (dialog?.type === 'alert') {
      handleConfirm();
    }
  };

  return (
    <DialogContext.Provider value={{
      alert: (message) => showDialog('alert', message),
      confirm: (message) => showDialog('confirm', message),
      prompt: (message, defaultValue) => showDialog('prompt', message, defaultValue)
    }}>
      {children}
      {dialog && (
        <div 
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(12, 14, 26, 0.45)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseOverlay}
        >
          <div 
            className="glass-panel fade-in-scale"
            style={{
              width: '100%', maxWidth: '440px',
              padding: '2rem', borderRadius: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
              boxShadow: '0 20px 50px rgba(109, 40, 217, 0.12)',
              background: 'var(--glass-bg)',
              color: 'var(--text-primary)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Title */}
            <div>
              <h3 style={{ 
                fontFamily: "'Plus Jakarta Sans', sans-serif", 
                fontSize: '1.2rem', fontWeight: 800, 
                color: 'var(--text-primary)', marginBottom: '0.5rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                {dialog.type === 'alert' && '📢 Notification'}
                {dialog.type === 'confirm' && '❓ Confirmation'}
                {dialog.type === 'prompt' && '✏️ Saisie requise'}
              </h3>
              <p style={{ 
                fontSize: '0.95rem', color: 'var(--text-secondary)', 
                lineHeight: 1.5, whiteSpace: 'pre-line' 
              }}>
                {dialog.message}
              </p>
            </div>

            {/* Input for prompts */}
            {dialog.type === 'prompt' && (
              <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
                <input
                  ref={inputRef}
                  type="text"
                  className="input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    borderRadius: '0.75rem', border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                    outline: 'none', fontSize: '0.9rem'
                  }}
                />
              </form>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                <button 
                  className="btn btn-outline" 
                  onClick={handleCancel}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '0.75rem' }}
                >
                  Annuler
                </button>
              )}
              <button 
                className="btn btn-primary" 
                onClick={handleConfirm}
                style={{ padding: '0.55rem 1.5rem', borderRadius: '0.75rem' }}
              >
                {dialog.type === 'alert' ? 'D\'accord' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within a DialogProvider');
  return context;
};
