import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type Theme = 'light' | 'dark';

export const useTheme = () => {
  const { t } = useTranslation('common');
  const [theme, setTheme] = useState<Theme>(() => {
    // Check saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return savedTheme;
  });

  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute
    root.setAttribute('data-theme', theme);

    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Update theme-color meta tag dynamically
    updateThemeColorMeta(theme);
  }, [theme]);

  const updateThemeColorMeta = (theme: Theme) => {
    // Find existing meta tag or create new one
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';

    toast.success(newTheme === 'dark' ? t('theme_changed_dark') : t('theme_changed_light'));
    setTheme(newTheme);

    // notify other listeners in same window
    try {
      const ev = new CustomEvent('themechange', { detail: { theme: newTheme } });
      window.dispatchEvent(ev);
    } catch (e) {
      // fallback: no-op
    }
  };

  // Keep multiple hook instances in sync across same-window and cross-window changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const val = (e.newValue || 'light') as Theme;
        setTheme((prev) => (prev === val ? prev : val));
      }
    };

    const onThemeChange = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        const val = (detail && detail.theme) || (localStorage.getItem('theme') as Theme) || 'light';
        setTheme((prev) => (prev === val ? prev : val));
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('themechange', onThemeChange as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('themechange', onThemeChange as EventListener);
    };
  }, []);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
};
