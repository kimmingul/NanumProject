import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  AppearanceSettings,
  RegionalSettings,
  WorkspaceSettings,
} from './user-settings';
import './UserSettingsPage.css';

const SECTION_LABELS: Record<string, string> = {
  appearance: 'Appearance',
  regional: 'Regional',
  workspace: 'Workspace',
};

export default function UserSettingsPage(): ReactNode {
  const { section } = useParams<{ section?: string }>();
  const activeSection = section || 'appearance';
  const sectionLabel = SECTION_LABELS[activeSection] || 'Appearance';

  const renderSection = (): ReactNode => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'regional':
        return <RegionalSettings />;
      case 'workspace':
        return <WorkspaceSettings />;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <div className="user-settings-page">
      <div className="settings-breadcrumb">
        <span className="breadcrumb-root">Settings</span>
        <i className="dx-icon-chevronright breadcrumb-sep" />
        <span className="breadcrumb-current">{sectionLabel}</span>
      </div>

      <div className="settings-content">
        {renderSection()}
      </div>
    </div>
  );
}
