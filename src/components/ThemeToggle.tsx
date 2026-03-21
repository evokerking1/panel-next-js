'use client';

import { useEffect } from 'react';

export default function ThemeToggle() {
  useEffect(() => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function applyThemeSheets(isDark: boolean) {
      const light = document.getElementById('light-theme-css') as HTMLLinkElement | null;
      const dark = document.getElementById('dark-theme-css') as HTMLLinkElement | null;
      if (light) light.disabled = isDark;
      if (dark) dark.disabled = !isDark;
    }

    function updateDot(isDark: boolean) {
      const dot = btn!.querySelector('.dot');
      if (dot) dot.classList.toggle('translate-x-6', isDark);
    }

    function init() {
      const pref = localStorage.getItem('theme');
      const isDark =
        pref === 'dark' || (!pref && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      applyThemeSheets(isDark);
      updateDot(isDark);
      // Remove the js-loading class so content animates in
      document.documentElement.classList.remove('js-loading');
    }

    function toggle() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyThemeSheets(isDark);
      updateDot(isDark);
    }

    btn.addEventListener('click', toggle);
    init();

    return () => btn.removeEventListener('click', toggle);
  }, []);

  return (
    <button
      id="theme-toggle"
      className="fixed right-4 top-4 w-14 h-8 flex items-center bg-neutral-300 dark:bg-neutral-700/70 rounded-full p-1 transition-colors duration-500 z-50"
      aria-label="Toggle dark mode"
    >
      <span className="dot bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-500 border border-neutral-950/20" />
    </button>
  );
}
