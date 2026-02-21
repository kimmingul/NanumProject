import { type ReactNode, useEffect, useState } from 'react';
import { NumberBox } from 'devextreme-react/number-box';
import { Switch } from 'devextreme-react/switch';
import { Button } from 'devextreme-react/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import './SecuritySection.css';

// Tab definition
type SecurityTab = 'password' | 'session';

interface TabMeta {
  key: SecurityTab;
  label: string;
  icon: string;
}

const TABS: TabMeta[] = [
  { key: 'password', label: 'Password Policy', icon: 'dx-icon-key' },
  { key: 'session', label: 'Session', icon: 'dx-icon-clock' },
];

const TAB_DESCRIPTIONS: Record<SecurityTab, string> = {
  password: 'Configure password requirements for all users',
  session: 'Manage session timeout and security settings',
};

export default function SecuritySection(): ReactNode {
  const { tenant, loading, updateTenantSettings } = useTenantSettings();

  // Tab state
  const [activeTab, setActiveTab] = useState<SecurityTab>('password');

  const [minLength, setMinLength] = useState(8);
  const [requireUppercase, setRequireUppercase] = useState(false);
  const [requireLowercase, setRequireLowercase] = useState(false);
  const [requireNumbers, setRequireNumbers] = useState(false);
  const [requireSymbols, setRequireSymbols] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
    setSaved(false);
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Render Password Policy tab
  const renderPasswordTab = () => (
    <div className="security-tab-content">
      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>Minimum Length</h4>
        </div>
        <div className="security-min-length">
          <NumberBox
            value={minLength}
            onValueChanged={(e) => setMinLength(e.value)}
            min={6}
            max={32}
            showSpinButtons={true}
            stylingMode="outlined"
            width={120}
          />
          <span className="admin-form-hint">Characters required (6-32)</span>
        </div>
      </div>

      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>Character Requirements</h4>
        </div>
        <p className="admin-card-box-hint">
          Select which character types must be included in passwords.
        </p>
        <div className="admin-settings-grid">
          <div className="admin-settings-item">
            <Switch
              value={requireUppercase}
              onValueChanged={(e) => setRequireUppercase(e.value)}
            />
            <span>Uppercase letter (A-Z)</span>
          </div>
          <div className="admin-settings-item">
            <Switch
              value={requireLowercase}
              onValueChanged={(e) => setRequireLowercase(e.value)}
            />
            <span>Lowercase letter (a-z)</span>
          </div>
          <div className="admin-settings-item">
            <Switch
              value={requireNumbers}
              onValueChanged={(e) => setRequireNumbers(e.value)}
            />
            <span>Number (0-9)</span>
          </div>
          <div className="admin-settings-item">
            <Switch
              value={requireSymbols}
              onValueChanged={(e) => setRequireSymbols(e.value)}
            />
            <span>Special character (!@#$...)</span>
          </div>
        </div>
      </div>

      <div className="admin-section-footer">
        <span className="admin-section-footer-hint">
          Password policy changes do not affect existing passwords.
        </span>
      </div>
    </div>
  );

  // Render Session tab
  const renderSessionTab = () => (
    <div className="security-tab-content">
      <div className="admin-card-box">
        <div className="admin-card-box-header">
          <h4>Session Timeout</h4>
        </div>
        <p className="admin-card-box-hint">
          Users will be automatically logged out after this period of inactivity.
        </p>
        <div className="security-timeout-input">
          <NumberBox
            value={sessionTimeout}
            onValueChanged={(e) => setSessionTimeout(e.value)}
            min={5}
            max={1440}
            showSpinButtons={true}
            stylingMode="outlined"
            width={120}
          />
          <span className="security-timeout-unit">minutes</span>
        </div>
        <div className="admin-form-hint">Valid range: 5 to 1440 minutes (24 hours)</div>
      </div>

      <div className="admin-section-footer">
        <span className="admin-section-footer-hint">
          Session settings apply to all users immediately.
        </span>
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'password':
        return renderPasswordTab();
      case 'session':
        return renderSessionTab();
      default:
        return renderPasswordTab();
    }
  };

  if (loading) {
    return (
      <div className="security-section admin-section-layout">
        <div className="admin-section-sidebar">
          {TABS.map((tab) => (
            <div key={tab.key} className="admin-section-sidebar-item">
              <i className={`${tab.icon} sidebar-tab-icon`} />
              {tab.label}
            </div>
          ))}
        </div>
        <div className="admin-section-main">
          <div className="admin-section-header">
            <div className="admin-section-header-info">
              <h3>Loading...</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="security-section admin-section-layout">
      {/* Sidebar */}
      <div className="admin-section-sidebar">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            className={`admin-section-sidebar-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab(tab.key)}
          >
            <i className={`${tab.icon} sidebar-tab-icon`} />
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="admin-section-main">
        {/* Sticky Header */}
        <div className="admin-section-header">
          <div className="admin-section-header-info">
            <h3>{TABS.find((t) => t.key === activeTab)?.label}</h3>
            <p className="admin-section-header-desc">{TAB_DESCRIPTIONS[activeTab]}</p>
          </div>
          <div className="admin-section-header-actions">
            <Button
              text={saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              type={saved ? 'success' : 'default'}
              stylingMode="contained"
              icon={saved ? 'check' : ''}
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {error && <div className="admin-form-error">{error}</div>}
      </div>
    </div>
  );
}
