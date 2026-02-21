import { type ReactNode, useEffect, useRef, useState } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { TextArea } from 'devextreme-react/text-area';
import { ColorBox } from 'devextreme-react/color-box';
import { Button } from 'devextreme-react/button';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import { resizeLogo } from '@/utils/imageResize';
import './OrganizationSection.css';

type OrgTab = 'basic' | 'details' | 'branding';

interface TabMeta {
  key: OrgTab;
  label: string;
}

const TABS: TabMeta[] = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'details', label: 'Details' },
  { key: 'branding', label: 'Branding' },
];

export default function OrganizationSection(): ReactNode {
  const { tenant, loading, updateTenant, updateTenantSettings } = useTenantSettings();
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);

  // Tab state
  const [activeTab, setActiveTab] = useState<OrgTab>('basic');

  // Basic info
  const [name, setName] = useState('');
  const [domainsText, setDomainsText] = useState('');

  // Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [secondaryColor, setSecondaryColor] = useState('#764ba2');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Organization details
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [representative, setRepresentative] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      const domains = tenant.settings?.domains || [];
      setDomainsText(domains.join('\n'));
      // Branding
      setLogoUrl(tenant.settings?.branding?.logo_url || null);
      setAppName(tenant.settings?.branding?.app_name || '');
      setPrimaryColor(tenant.settings?.branding?.primary_color || '#667eea');
      setSecondaryColor(tenant.settings?.branding?.secondary_color || '#764ba2');
      // Organization details
      const org = tenant.settings?.organization || {};
      setAddress(org.address || '');
      setPhone(org.phone || '');
      setEmail(org.email || '');
      setBusinessNumber(org.business_number || '');
      setRepresentative(org.representative || '');
    }
  }, [tenant]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    setError('');
    try {
      const resizedFile = await resizeLogo(file);
      const filePath = `${tenantId}/logo.webp`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedFile, {
          upsert: true,
          contentType: 'image/webp',
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateTenantSettings({
        branding: {
          ...tenant?.settings?.branding,
          logo_url: publicUrl,
        },
      });
      setLogoUrl(publicUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleLogoRemove = async () => {
    if (!tenantId) return;
    setError('');
    try {
      const filePath = `${tenantId}/logo.webp`;
      await supabase.storage.from('avatars').remove([filePath]);

      const { logo_url: _removed, ...restBranding } = tenant?.settings?.branding || {};
      await updateTenantSettings({
        branding: restBranding,
      });
      setLogoUrl(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    const domainsArray = domainsText
      .split(/[\n,]/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;
    for (const d of domainsArray) {
      if (!domainRegex.test(d)) {
        setError(`Invalid domain: ${d}`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateTenant({
        name: name.trim(),
      });

      const orgSettings: Record<string, string> = {};
      if (address.trim()) orgSettings.address = address.trim();
      if (phone.trim()) orgSettings.phone = phone.trim();
      if (email.trim()) orgSettings.email = email.trim();
      if (businessNumber.trim()) orgSettings.business_number = businessNumber.trim();
      if (representative.trim()) orgSettings.representative = representative.trim();

      const brandingSettings: Record<string, string> = {};
      if (logoUrl) brandingSettings.logo_url = logoUrl;
      if (appName.trim()) brandingSettings.app_name = appName.trim();
      if (primaryColor) brandingSettings.primary_color = primaryColor;
      if (secondaryColor) brandingSettings.secondary_color = secondaryColor;

      await updateTenantSettings({
        ...(domainsArray.length > 0 ? { domains: domainsArray } : {}),
        branding: brandingSettings,
        organization: orgSettings,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getTabDescription = (): string => {
    switch (activeTab) {
      case 'basic':
        return 'Organization name and allowed email domains';
      case 'details':
        return 'Contact information and business details';
      case 'branding':
        return 'Logo, application name, and brand colors';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="org-section admin-section-layout">
        <div className="admin-section-sidebar">
          {TABS.map((tab) => (
            <div key={tab.key} className="admin-section-sidebar-item">
              {tab.label}
            </div>
          ))}
        </div>
        <div className="admin-section-main">
          <div className="admin-section-header">
            <div className="admin-section-header-info">
              <h3>Organization</h3>
              <p className="admin-section-header-desc">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="org-section admin-section-layout">
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
            <p className="admin-section-header-desc">{getTabDescription()}</p>
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

        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className="org-tab-content">
            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Organization Name</h4>
              </div>
              <div className="admin-form-field">
                <label>Name *</label>
                <TextBox
                  value={name}
                  onValueChanged={(e) => setName(e.value)}
                  placeholder="Enter organization name"
                  stylingMode="outlined"
                />
              </div>
            </div>

            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Allowed Domains</h4>
              </div>
              <div className="admin-form-field">
                <TextArea
                  value={domainsText}
                  onValueChanged={(e) => setDomainsText(e.value)}
                  placeholder="example.com&#10;subdomain.example.com"
                  stylingMode="outlined"
                  height={120}
                />
                <div className="admin-form-hint">
                  One domain per line. Users with matching email domains can join this organization.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="org-tab-content">
            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Business Information</h4>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-field">
                  <label>Representative</label>
                  <TextBox
                    value={representative}
                    onValueChanged={(e) => setRepresentative(e.value)}
                    placeholder="CEO name"
                    stylingMode="outlined"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Business Registration Number</label>
                  <TextBox
                    value={businessNumber}
                    onValueChanged={(e) => setBusinessNumber(e.value)}
                    placeholder="000-00-00000"
                    stylingMode="outlined"
                  />
                </div>
              </div>
            </div>

            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Contact Information</h4>
              </div>
              <div className="admin-form-field">
                <label>Address</label>
                <TextBox
                  value={address}
                  onValueChanged={(e) => setAddress(e.value)}
                  placeholder="Organization address"
                  stylingMode="outlined"
                />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-field">
                  <label>Phone</label>
                  <TextBox
                    value={phone}
                    onValueChanged={(e) => setPhone(e.value)}
                    placeholder="+82-2-0000-0000"
                    stylingMode="outlined"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Email</label>
                  <TextBox
                    value={email}
                    onValueChanged={(e) => setEmail(e.value)}
                    placeholder="contact@example.com"
                    stylingMode="outlined"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <div className="org-tab-content">
            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Logo</h4>
              </div>
              <div className="org-logo-section">
                <div className="org-logo-preview-wrap">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Organization logo" className="org-logo-preview" />
                  ) : (
                    <span className="org-logo-placeholder">
                      <i className="dx-icon-image" />
                    </span>
                  )}
                </div>
                <div className="org-logo-actions">
                  <Button
                    text="Upload Logo"
                    icon="image"
                    stylingMode="outlined"
                    onClick={() => logoInputRef.current?.click()}
                  />
                  {logoUrl && (
                    <Button
                      text="Remove"
                      icon="trash"
                      stylingMode="text"
                      onClick={handleLogoRemove}
                    />
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    aria-label="Upload logo file"
                  />
                </div>
              </div>
              <p className="admin-card-box-hint">
                Recommended: PNG or SVG with transparent background. Height will be scaled to 128px.
              </p>
            </div>

            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Application Name</h4>
              </div>
              <div className="admin-form-field">
                <TextBox
                  value={appName}
                  onValueChanged={(e) => setAppName(e.value)}
                  placeholder="Nanum Project"
                  stylingMode="outlined"
                />
                <div className="admin-form-hint">
                  Custom name displayed next to the logo. Leave empty for default "Nanum Project".
                </div>
              </div>
            </div>

            <div className="admin-card-box">
              <div className="admin-card-box-header">
                <h4>Brand Colors</h4>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-field">
                  <label>Primary Color</label>
                  <ColorBox
                    value={primaryColor}
                    onValueChanged={(e) => setPrimaryColor(e.value)}
                    stylingMode="outlined"
                  />
                </div>
                <div className="admin-form-field">
                  <label>Secondary Color</label>
                  <ColorBox
                    value={secondaryColor}
                    onValueChanged={(e) => setSecondaryColor(e.value)}
                    stylingMode="outlined"
                  />
                </div>
              </div>
              <div className="org-color-preview-wrap">
                <label>Preview</label>
                <div
                  className="org-color-preview"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                />
                <div className="admin-form-hint">
                  This gradient is used for avatars and accent elements.
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="admin-form-error">{error}</div>}

        {/* Footer */}
        <div className="admin-section-footer">
          <span className="admin-section-footer-hint">
            Organization settings apply to all users in this tenant.
          </span>
        </div>
      </div>
    </div>
  );
}
