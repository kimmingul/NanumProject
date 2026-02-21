import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------- Types ----------

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'blue' | 'saas';
type Density = 'compact' | 'normal';
type EffectiveTheme = 'light' | 'dark';

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

// ---------- 8 Fluent Theme CSS URLs ----------

import blueLight from 'devextreme/dist/css/dx.fluent.blue.light.css?url';
import blueLightCompact from 'devextreme/dist/css/dx.fluent.blue.light.compact.css?url';
import blueDark from 'devextreme/dist/css/dx.fluent.blue.dark.css?url';
import blueDarkCompact from 'devextreme/dist/css/dx.fluent.blue.dark.compact.css?url';
import saasLight from 'devextreme/dist/css/dx.fluent.saas.light.css?url';
import saasLightCompact from 'devextreme/dist/css/dx.fluent.saas.light.compact.css?url';
import saasDark from 'devextreme/dist/css/dx.fluent.saas.dark.css?url';
import saasDarkCompact from 'devextreme/dist/css/dx.fluent.saas.dark.compact.css?url';

const THEME_CSS_MAP: Record<string, string> = {
  'blue-light-normal': blueLight,
  'blue-light-compact': blueLightCompact,
  'blue-dark-normal': blueDark,
  'blue-dark-compact': blueDarkCompact,
  'saas-light-normal': saasLight,
  'saas-light-compact': saasLightCompact,
  'saas-dark-normal': saasDark,
  'saas-dark-compact': saasDarkCompact,
};

// ---------- Utility functions ----------

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

// ---------- Apply theme to DOM ----------

const DX_THEME_LINK_ID = 'dx-fluent-theme';

export function applyDxTheme(
  colorScheme: ColorScheme,
  density: Density,
  brightness: EffectiveTheme
): void {
  const key = `${colorScheme}-${brightness}-${density}`;
  const cssUrl = THEME_CSS_MAP[key];

  if (!cssUrl) {
    console.error(`Unknown theme combination: ${key}`);
    return;
  }

  let link = document.getElementById(DX_THEME_LINK_ID) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = DX_THEME_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  // Only update if URL changed
  if (link.href !== cssUrl) {
    link.href = cssUrl;
  }
}

function applyTheme(effective: EffectiveTheme): void {
  // Smooth transition
  document.documentElement.classList.add('theme-transition');
  document.documentElement.setAttribute('data-theme', effective);
  // Remove transition class after animation completes
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transition');
  }, 350);
}

// ---------- Combined apply function ----------

export function applyFullTheme(
  themeMode: ThemeMode,
  colorScheme: ColorScheme,
  density: Density
): void {
  const effective = getEffectiveTheme(themeMode);
  applyTheme(effective);
  applyDxTheme(colorScheme, density, effective);
}

// ---------- Store ----------

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light' as ThemeMode,
      setTheme: (theme) => {
        set({ theme });
        // Note: Full theme application is handled by preferences-store
        // which has access to colorScheme and density
        const effective = getEffectiveTheme(theme);
        document.documentElement.setAttribute('data-theme', effective);
      },
    }),
    {
      name: 'nanum-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effective = getEffectiveTheme(state.theme);
          document.documentElement.setAttribute('data-theme', effective);
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
        const effective = getSystemTheme();
        document.documentElement.setAttribute('data-theme', effective);
        // Trigger re-apply via event (preferences-store will handle)
        window.dispatchEvent(new CustomEvent('system-theme-change'));
      }
    });
}

// ---------- Export utilities ----------

export { getEffectiveTheme, getSystemTheme };
export type { ThemeMode, ColorScheme, Density, EffectiveTheme };
