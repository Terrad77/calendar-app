type Theme = 'light' | 'dark';

export const resolveInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme as Theme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const updateThemeColorMeta = (theme: Theme) => {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }

  metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
};
