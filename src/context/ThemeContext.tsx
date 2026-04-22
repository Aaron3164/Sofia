import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'glass';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  subjectColors: Record<string, string>;
  setSubjectColor: (subjectId: string, color: string) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('glass');
  const [subjectColors, setSubjectColors] = useState<Record<string, string>>({
    'math': '#3b82f6', // blue
    'physics': '#8b5cf6', // purple
    'history': '#f59e0b', // amber
    'biology': '#10b981', // emerald
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('glass');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'glass');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'glass') {
      document.documentElement.classList.add('glass');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'glass';
      return 'light';
    });
  };

  const setSubjectColor = (subjectId: string, color: string) => {
    setSubjectColors(prev => ({ ...prev, [subjectId]: color }));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, subjectColors, setSubjectColor, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
