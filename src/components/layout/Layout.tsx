import { Sidebar } from './Sidebar';
import { GlobalSearchModal } from './GlobalSearchModal';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Sidebar />
      <main className="page-container">
        {children}
      </main>
      <GlobalSearchModal />
    </>
  );
};
