import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then default to dark theme
    const stored = localStorage.getItem('theme');
    if (stored) {
      return stored === 'dark';
    }
    // Default to dark theme
    return true;
  });

  // Apply theme to document
  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('light-theme');
    } else {
      html.classList.add('light-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
