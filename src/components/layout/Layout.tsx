import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { Menu } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="mobile-only mobile-top-bar glass-panel">
        <button className="icon-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open Menu">
          <Menu size={24} />
        </button>
        <div className="logo-placeholder" style={{ fontSize: '1.5rem' }}>Sof.IA</div>
        <div style={{ width: '40px' }}></div> {/* Spacer for symmetry */}
      </header>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="mobile-only sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="page-container">
        {children}
      </main>
      
      <GlobalSearchModal />
    </>
  );
};
