'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'loading') => void;
  }
}

export default function ToastSystem() {
  useEffect(() => {
    function showToast(message: string, type: 'success' | 'error' | 'warning' | 'loading' = 'error') {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-2';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className =
        'px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out opacity-0 translate-x-full flex flex-row items-center gap-3 border';

      const colorMap: Record<string, string[]> = {
        error: ['bg-white', 'dark:bg-neutral-800', 'text-red-600', 'dark:text-red-400', 'border-red-200', 'dark:border-red-500/20'],
        success: ['bg-white', 'dark:bg-neutral-800', 'text-emerald-600', 'dark:text-emerald-400', 'border-emerald-200', 'dark:border-emerald-500/20'],
        warning: ['bg-white', 'dark:bg-neutral-800', 'text-amber-600', 'dark:text-amber-400', 'border-amber-200', 'dark:border-amber-500/20'],
        loading: ['bg-white', 'dark:bg-neutral-800', 'text-blue-600', 'dark:text-blue-400', 'border-blue-200', 'dark:border-blue-500/20'],
      };

      toast.classList.add(...(colorMap[type] ?? colorMap.error));

      const iconMap: Record<string, string> = {
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        loading: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
      };

      toast.innerHTML = `
        <span class="shrink-0">${iconMap[type] ?? iconMap.error}</span>
        <span style="font-size:14px;font-weight:500">${message}</span>
      `;

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-x-full');
      });

      if (type !== 'loading') {
        setTimeout(() => {
          toast.classList.add('opacity-0', 'translate-x-full');
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      }
    }

    window.showToast = showToast;

    return () => {
      delete window.showToast;
    };
  }, []);

  return null;
}
