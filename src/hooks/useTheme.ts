import { useEffect, useState } from 'react';
import { ThemeMode } from '../types/cycle';

const THEME_KEY = 'lunacycle_theme';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', shouldBeDark ? '#0E0D11' : '#FAF8F7');
      }
    };

    applyTheme();
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage quota errors
    }

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  const toggleQuick = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setTheme(isCurrentlyDark ? 'light' : 'dark');
  };

  return { theme, setTheme, toggleQuick };
}
