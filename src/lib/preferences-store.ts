import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { useAuthStore } from './auth-store';
import { useThemeStore, applyFullTheme } from './theme-store';
import type { ThemeMode, ColorScheme, Density } from './theme-store';

type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYMMDD';
type DefaultView = 'gantt' | 'board' | 'grid' | 'calendar';
type SidebarDefault = 'expanded' | 'collapsed';

export interface UserPreferences {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  density: Density;
  dateFormat: DateFormat;
  timezone: string; // 'auto' | IANA timezone
  weekStart: 0 | 1; // 0=Sunday, 1=Monday
  defaultView: DefaultView;
  sidebarDefault: SidebarDefault;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  colorScheme: 'saas',
  density: 'compact',
  dateFormat: 'YYYY-MM-DD',
  timezone: 'auto',
  weekStart: 1,
  defaultView: 'gantt',
  sidebarDefault: 'expanded',
};

interface PreferencesStore {
  preferences: UserPreferences;
  loaded: boolean;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  loadFromDb: () => void;
  _saveToDb: () => void;
  _applyTheme: () => void;
}

// Debounce timer for DB saves
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function applyDensityClass(density: Density): void {
  document.documentElement.classList.toggle('density-normal', density === 'normal');
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: { ...DEFAULT_PREFERENCES },
      loaded: false,

      _applyTheme: () => {
        const { theme, colorScheme, density } = get().preferences;
        useThemeStore.getState().setTheme(theme);
        applyFullTheme(theme, colorScheme, density);
      },

      setPreference: (key, value) => {
        const next = { ...get().preferences, [key]: value };
        set({ preferences: next });

        // Apply side effects
        if (key === 'density') {
          applyDensityClass(value as Density);
        }

        // Re-apply full theme for theme-related changes
        if (key === 'theme' || key === 'colorScheme' || key === 'density') {
          get()._applyTheme();
        }

        // Debounced DB save
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => get()._saveToDb(), 1000);
      },

      loadFromDb: () => {
        const profile = useAuthStore.getState().profile;
        if (!profile) return;

        supabase
          .from('profiles')
          .select('preferences')
          .eq('id', profile.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data?.preferences) {
              set({ loaded: true });
              return;
            }
            const dbPrefs = data.preferences as Partial<UserPreferences>;
            const merged = { ...get().preferences, ...dbPrefs };
            set({ preferences: merged, loaded: true });

            // Apply DB values
            applyDensityClass(merged.density);
            get()._applyTheme();
          });
      },

      _saveToDb: () => {
        const profile = useAuthStore.getState().profile;
        if (!profile) return;

        const prefs = get().preferences;
        supabase
          .from('profiles')
          .update({ preferences: prefs })
          .eq('id', profile.id)
          .then(({ error }) => {
            if (error) console.error('Failed to save preferences:', error.message);
          });
      },
    }),
    {
      name: 'nanum-preferences',
      partialize: (state) => ({ preferences: state.preferences }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as { preferences?: Partial<UserPreferences> };
        return {
          ...current,
          preferences: { ...DEFAULT_PREFERENCES, ...p.preferences },
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyDensityClass(state.preferences.density);
          // Apply full theme on rehydrate
          const { theme, colorScheme, density } = state.preferences;
          applyFullTheme(theme, colorScheme, density);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.addEventListener('system-theme-change', () => {
    usePreferencesStore.getState()._applyTheme();
  });
}
