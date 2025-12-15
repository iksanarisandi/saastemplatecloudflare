import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

function getInitialTheme(): Theme {
  if (!browser) return 'system';
  
  const stored = localStorage.getItem('theme') as Theme | null;
  return stored || 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (!browser) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (!browser) return;
  
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(getInitialTheme());

  return {
    subscribe,
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        applyTheme(theme);
      }
      set(theme);
    },
    toggle: () => {
      update((current) => {
        let next: Theme;
        if (current === 'light') {
          next = 'dark';
        } else if (current === 'dark') {
          next = 'system';
        } else {
          next = 'light';
        }
        
        if (browser) {
          localStorage.setItem('theme', next);
          applyTheme(next);
        }
        
        return next;
      });
    },
    initialize: () => {
      if (!browser) return;
      
      const theme = getInitialTheme();
      applyTheme(theme);
      set(theme);

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const currentTheme = localStorage.getItem('theme') as Theme | null;
        if (currentTheme === 'system' || !currentTheme) {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
    }
  };
}

export const theme = createThemeStore();
