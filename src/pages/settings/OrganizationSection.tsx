import { type ReactNode, useEffect, useState } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export default function OrganizationSection(): ReactNode {
  const { tenant, loading, updateTenant } = useTenantSettings();

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setDomain(tenant.domain || '');
    }
  }, [tenant]);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    if (domain && !/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(domain)) {
      setError('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setSaving(true);
    try {
      await updateTenant({
        name: name.trim(),
        domain: domain.trim() || null,
      });
      setSuccess('Organization settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <h2 className="section-title">Organization</h2>
        <p className="section-desc">Loading...</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2 className="section-title">Organization</h2>
      <p className="section-desc">Manage your organization details</p>

      <div className="form-field">
        <label>Organization Name</label>
        <TextBox
          value={name}
          onValueChanged={(e) => setName(e.value)}
          placeholder="Enter organization name"
          stylingMode="outlined"
        />
      </div>

      <div className="form-field">
        <label>Domain</label>
        <TextBox
          value={domain}
          onValueChanged={(e) => setDomain(e.value)}
          placeholder="example.com"
          stylingMode="outlined"
        />
        <div className="field-hint">Used for email domain verification</div>
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
