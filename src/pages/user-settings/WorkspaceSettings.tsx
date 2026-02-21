import { type ReactNode } from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import { usePreferencesStore } from '@/lib/preferences-store';

type DefaultView = 'gantt' | 'board' | 'grid' | 'calendar';
type SidebarDefault = 'expanded' | 'collapsed';

const VIEW_OPTIONS: { value: DefaultView; label: string }[] = [
  { value: 'gantt', label: 'Gantt Chart' },
  { value: 'grid', label: 'Grid (List)' },
  { value: 'board', label: 'Board' },
  { value: 'calendar', label: 'Calendar' },
];

const SIDEBAR_OPTIONS: { value: SidebarDefault; label: string; desc: string }[] = [
  { value: 'expanded', label: 'Expanded', desc: 'Sidebar open on login' },
  { value: 'collapsed', label: 'Collapsed', desc: 'Sidebar closed on login' },
];

export default function WorkspaceSettings(): ReactNode {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  return (
    <>
      <div className="settings-section" style={{ marginBottom: '0.5rem' }}>
        <h2 className="section-title">Default View</h2>
        <p className="section-desc">The default tab when opening a project</p>

        <div className="form-field">
          <SelectBox
            items={VIEW_OPTIONS}
            value={prefs.defaultView}
            displayExpr="label"
            valueExpr="value"
            onValueChanged={(e) => setPreference('defaultView', e.value)}
            stylingMode="outlined"
            width="100%"
          />
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">Sidebar Default</h2>
        <p className="section-desc">Initial sidebar state when you log in</p>

        <div className="theme-selector">
          {SIDEBAR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${prefs.sidebarDefault === opt.value ? ' active' : ''}`}
              onClick={() => setPreference('sidebarDefault', opt.value)}
            >
              <span className="theme-option-label">{opt.label}</span>
              <span className="theme-option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
