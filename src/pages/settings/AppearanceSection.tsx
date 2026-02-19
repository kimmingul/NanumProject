import { type ReactNode, useEffect, useState } from 'react';
import { ColorBox } from 'devextreme-react/color-box';
import { Button } from 'devextreme-react/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useThemeStore } from '@/lib/theme-store';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; iconClass: string }[] = [
  { value: 'light', label: 'Light', iconClass: 'light-icon' },
  { value: 'dark', label: 'Dark', iconClass: 'dark-icon' },
  { value: 'system', label: 'System', iconClass: 'system-icon' },
];

export default function AppearanceSection(): ReactNode {
  const { tenant, loading, updateTenantSettings } = useTenantSettings();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [secondaryColor, setSecondaryColor] = useState('#764ba2');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tenant?.settings?.branding) {
      const b = tenant.settings.branding;
      setPrimaryColor(b.primary_color || '#667eea');
      setSecondaryColor(b.secondary_color || '#764ba2');
    }
  }, [tenant?.settings?.branding]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateTenantSettings({
        branding: {
          ...tenant?.settings?.branding,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        },
      });
      setSuccess('Appearance settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <h2 className="section-title">Appearance</h2>
        <p className="section-desc">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Theme Section */}
      <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Theme</h2>
        <p className="section-desc">Choose your preferred color scheme</p>

        <div className="theme-selector">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${theme === opt.value ? ' active' : ''}`}
              onClick={() => setTheme(opt.value)}
            >
              <div className={`theme-option-icon ${opt.iconClass}`}>
                {opt.value === 'light' && <i className="dx-icon-sun" />}
                {opt.value === 'dark' && <i className="dx-icon-moon" />}
                {opt.value === 'system' && <i className="dx-icon-preferences" />}
              </div>
              <span className="theme-option-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Branding Section */}
      <div className="settings-section">
        <h2 className="section-title">Branding Colors</h2>
        <p className="section-desc">Customize your organization&apos;s branding colors</p>

        <div className="form-row">
          <div className="form-field">
            <label>Primary Color</label>
            <ColorBox
              value={primaryColor}
              onValueChanged={(e) => setPrimaryColor(e.value)}
              stylingMode="outlined"
            />
          </div>
          <div className="form-field">
            <label>Secondary Color</label>
            <ColorBox
              value={secondaryColor}
              onValueChanged={(e) => setSecondaryColor(e.value)}
              stylingMode="outlined"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Preview</label>
          <div
            className="color-preview"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          />
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="section-actions">
          <Button
            text={saving ? 'Saving...' : 'Save Changes'}
            type="default"
            stylingMode="contained"
            onClick={handleSave}
            disabled={saving}
          />
        </div>
      </div>
    </>
  );
}
