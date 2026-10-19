import { useLayoutEffect, useState } from 'react';

const isTheme = (value) => value === 'light' || value === 'dark';

function readTheme(storageKey) {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (isTheme(saved)) return saved;
    // The older dashboard had its own preference. Keep it when migrating.
    if (storageKey === 'userTheme') {
      const legacy = window.localStorage.getItem('dashboardTheme');
      if (isTheme(legacy)) return legacy;
    }
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
  return 'light';
}

export default function useTheme(storageKey) {
  const [theme, setTheme] = useState(() => readTheme(storageKey));

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.dataset.theme = theme;
    body.classList.toggle('dark-mode', theme === 'dark');
    body.classList.add('theme-transition');
    const timeoutId = window.setTimeout(() => body.classList.remove('theme-transition'), 350);

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Persistence is optional; applying the selected theme is not.
    }

    return () => {
      window.clearTimeout(timeoutId);
      body.classList.remove('dark-mode', 'theme-transition');
      delete root.dataset.theme;
    };
  }, [storageKey, theme]);

  const toggleTheme = () => setTheme((previous) => previous === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggleTheme };
}
