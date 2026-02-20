import { type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  AppearanceSettings,
  RegionalSettings,
  WorkspaceSettings,
} from './user-settings';
import './UserSettingsPage.css';

export default function UserSettingsPage(): ReactNode {
  const { section } = useParams<{ section?: string }>();
  const activeSection = section || 'appearance';

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
      <div className="page-header">
        <h1>Settings</h1>
        <p>Personal preferences and workspace configuration</p>
      </div>

      <div className="settings-content">
        {renderSection()}
      </div>
    </div>
  );
}
