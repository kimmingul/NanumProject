import { type ReactNode } from 'react';
import { useThemeStore } from '@/lib/theme-store';
import { usePreferencesStore } from '@/lib/preferences-store';
import type { ThemeMode, ColorScheme, Density } from '@/lib/theme-store';

const THEME_OPTIONS: { value: ThemeMode; label: string; desc: string; iconClass: string }[] = [
  { value: 'light', label: 'Light', desc: 'Clean and bright interface', iconClass: 'light-icon' },
  { value: 'dark', label: 'Dark', desc: 'Easy on the eyes in low light', iconClass: 'dark-icon' },
  { value: 'system', label: 'System', desc: 'Match your OS preference', iconClass: 'system-icon' },
];

const COLOR_SCHEME_OPTIONS: { value: ColorScheme; label: string; desc: string; color: string }[] = [
  { value: 'saas', label: 'SaaS', desc: 'Modern and clean look', color: '#0078d4' },
  { value: 'blue', label: 'Blue', desc: 'Classic Fluent style', color: '#106ebe' },
];

const DENSITY_OPTIONS: { value: Density; label: string; desc: string; icon: string }[] = [
  { value: 'compact', label: 'Compact', desc: 'More data per screen', icon: 'rowproperties' },
  { value: 'normal', label: 'Normal', desc: 'Comfortable spacing for readability', icon: 'columnproperties' },
];

export default function AppearanceSettings(): ReactNode {
  const theme = useThemeStore((s) => s.theme);
  const colorScheme = usePreferencesStore((s) => s.preferences.colorScheme);
  const density = usePreferencesStore((s) => s.preferences.density);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  const handleThemeChange = (value: ThemeMode) => {
    setPreference('theme', value);
  };

  return (
    <>
      {/* Theme (Light / Dark / System) */}
      <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Theme</h2>
        <p className="section-desc">Choose your preferred color scheme</p>

        <div className="theme-selector">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${theme === opt.value ? ' active' : ''}`}
              onClick={() => handleThemeChange(opt.value)}
            >
              <div className={`theme-option-icon ${opt.iconClass}`}>
                {opt.value === 'light' && <i className="dx-icon-sun" />}
                {opt.value === 'dark' && <i className="dx-icon-moon" />}
                {opt.value === 'system' && <i className="dx-icon-preferences" />}
              </div>
              <span className="theme-option-label">{opt.label}</span>
              <span className="theme-option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme (SaaS / Blue) */}
      <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Color Scheme</h2>
        <p className="section-desc">Select the DevExtreme Fluent color palette</p>

        <div className="theme-selector">
          {COLOR_SCHEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${colorScheme === opt.value ? ' active' : ''}`}
              onClick={() => setPreference('colorScheme', opt.value)}
            >
              <div
                className="theme-option-icon"
                style={{ background: opt.color }}
              >
                <i className="dx-icon-palette" style={{ color: '#fff' }} />
              </div>
              <span className="theme-option-label">{opt.label}</span>
              <span className="theme-option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Density (Compact / Normal) */}
      <div className="settings-section">
        <h2 className="section-title">Density</h2>
        <p className="section-desc">Control the spacing of UI elements</p>

        <div className="theme-selector">
          {DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${density === opt.value ? ' active' : ''}`}
              onClick={() => setPreference('density', opt.value)}
            >
              <div className="theme-option-icon" style={{ background: 'var(--bg-secondary)' }}>
                <i className={`dx-icon-${opt.icon}`} />
              </div>
              <span className="theme-option-label">{opt.label}</span>
              <span className="theme-option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
