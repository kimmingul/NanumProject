import { type ReactNode, useEffect, useState } from 'react';
import { NumberBox } from 'devextreme-react/number-box';
import { CheckBox } from 'devextreme-react/check-box';
import { Button } from 'devextreme-react/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export default function SecuritySection(): ReactNode {
  const { tenant, loading, updateTenantSettings } = useTenantSettings();

  const [minLength, setMinLength] = useState(8);
  const [requireUppercase, setRequireUppercase] = useState(false);
  const [requireLowercase, setRequireLowercase] = useState(false);
  const [requireNumbers, setRequireNumbers] = useState(false);
  const [requireSymbols, setRequireSymbols] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tenant?.settings?.security) {
      const s = tenant.settings.security;
      setMinLength(s.password_min_length ?? 8);
      setRequireUppercase(s.password_require_uppercase ?? false);
      setRequireLowercase(s.password_require_lowercase ?? false);
      setRequireNumbers(s.password_require_numbers ?? false);
      setRequireSymbols(s.password_require_symbols ?? false);
      setSessionTimeout(s.session_timeout_minutes ?? 60);
    }
  }, [tenant?.settings?.security]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateTenantSettings({
        security: {
          password_min_length: minLength,
          password_require_uppercase: requireUppercase,
          password_require_lowercase: requireLowercase,
          password_require_numbers: requireNumbers,
          password_require_symbols: requireSymbols,
          session_timeout_minutes: sessionTimeout,
        },
      });
      setSuccess('Security settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <h2 className="section-title">Security</h2>
        <p className="section-desc">Loading...</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2 className="section-title">Security</h2>
      <p className="section-desc">Configure password rules and session settings</p>

      <div className="form-field">
        <label>Minimum Password Length</label>
        <NumberBox
          value={minLength}
          onValueChanged={(e) => setMinLength(e.value)}
          min={6}
          max={32}
          showSpinButtons={true}
          stylingMode="outlined"
        />
      </div>

      <div className="form-field">
        <label>Password Requirements</label>
        <div className="checkbox-row">
          <CheckBox
            value={requireUppercase}
            onValueChanged={(e) => setRequireUppercase(e.value)}
          />
          <span>Require uppercase letter</span>
        </div>
        <div className="checkbox-row">
          <CheckBox
            value={requireLowercase}
            onValueChanged={(e) => setRequireLowercase(e.value)}
          />
          <span>Require lowercase letter</span>
        </div>
        <div className="checkbox-row">
          <CheckBox
            value={requireNumbers}
            onValueChanged={(e) => setRequireNumbers(e.value)}
          />
          <span>Require number</span>
        </div>
        <div className="checkbox-row">
          <CheckBox
            value={requireSymbols}
            onValueChanged={(e) => setRequireSymbols(e.value)}
          />
          <span>Require special character</span>
        </div>
      </div>

      <div className="form-divider" />

      <div className="form-field">
        <label>Session Timeout (minutes)</label>
        <NumberBox
          value={sessionTimeout}
          onValueChanged={(e) => setSessionTimeout(e.value)}
          min={5}
          max={1440}
          showSpinButtons={true}
          stylingMode="outlined"
        />
        <div className="field-hint">Users will be logged out after this period of inactivity</div>
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
  );
}
