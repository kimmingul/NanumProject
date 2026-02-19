import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import darkThemeUrl from '../styles/dx.fluent.nanum-dark.css?url';

type ThemeMode = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

// ---------- Apply theme to DOM ----------

const DX_DARK_LINK_ID = 'dx-dark-theme';

function applyDxTheme(effective: EffectiveTheme): void {
  let link = document.getElementById(DX_DARK_LINK_ID) as HTMLLinkElement | null;

  if (effective === 'dark') {
    if (!link) {
      link = document.createElement('link');
      link.id = DX_DARK_LINK_ID;
      link.rel = 'stylesheet';
      link.href = darkThemeUrl;
      document.head.appendChild(link);
    }
  } else {
    link?.remove();
  }
}

function applyTheme(effective: EffectiveTheme): void {
  // Smooth transition
  document.documentElement.classList.add('theme-transition');
  document.documentElement.setAttribute('data-theme', effective);
  applyDxTheme(effective);
  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition');
  }, 350);
}

// ---------- Store ----------

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light' as ThemeMode,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(getEffectiveTheme(theme));
      },
    }),
    {
      name: 'nanum-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply immediately on rehydrate (no transition)
          const effective = getEffectiveTheme(state.theme);
          document.documentElement.setAttribute('data-theme', effective);
          applyDxTheme(effective);
        }
      },
    }
  )
);

// ---------- System theme listener ----------

if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') {
        applyTheme(getSystemTheme());
      }
    });
}

// ---------- Initialize on import ----------

const initial = useThemeStore.getState().theme;
const effective = getEffectiveTheme(initial);
document.documentElement.setAttribute('data-theme', effective);
applyDxTheme(effective);
