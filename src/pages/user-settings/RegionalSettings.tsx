import { type ReactNode, useMemo } from 'react';
import { SelectBox } from 'devextreme-react/select-box';
import { usePreferencesStore } from '@/lib/preferences-store';
import { formatDate } from '@/utils/formatDate';

type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYMMDD';

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYMMDD', label: 'YYMMDD' },
];

const TIMEZONE_OPTIONS = [
  { value: 'auto', label: 'Auto (Browser)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST, UTC+9)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST, UTC+8)' },
  { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST, UTC-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST, UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT, UTC+0)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET, UTC+1)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET, UTC+1)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST, UTC+12)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10)' },
];

const WEEK_START_OPTIONS: { value: 0 | 1; label: string; desc: string }[] = [
  { value: 0, label: 'Sunday', desc: 'Common in US, Japan' },
  { value: 1, label: 'Monday', desc: 'Common in Korea, Europe' },
];

export default function RegionalSettings(): ReactNode {
  const prefs = usePreferencesStore((s) => s.preferences);
  const setPreference = usePreferencesStore((s) => s.setPreference);

  const datePreview = useMemo(() => {
    return formatDate(new Date(), prefs.dateFormat);
  }, [prefs.dateFormat]);

  return (
    <>
      <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Date Format</h2>
        <p className="section-desc">How dates are displayed throughout the app</p>

        <div className="form-field">
          <label>Format</label>
          <SelectBox
            items={DATE_FORMAT_OPTIONS}
            value={prefs.dateFormat}
            displayExpr="label"
            valueExpr="value"
            onValueChanged={(e) => setPreference('dateFormat', e.value)}
            stylingMode="outlined"
            width="100%"
          />
        </div>
        <div className="form-field">
          <label>Preview</label>
          <div className="date-preview">{datePreview}</div>
        </div>
      </div>

      <div className="settings-section" style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Timezone</h2>
        <p className="section-desc">Used for scheduling and date display</p>

        <div className="form-field">
          <SelectBox
            items={TIMEZONE_OPTIONS}
            value={prefs.timezone}
            displayExpr="label"
            valueExpr="value"
            onValueChanged={(e) => setPreference('timezone', e.value)}
            stylingMode="outlined"
            width="100%"
            searchEnabled
          />
        </div>
      </div>

      <div className="settings-section">
        <h2 className="section-title">Week Start</h2>
        <p className="section-desc">First day of the week in calendars and Gantt charts</p>

        <div className="theme-selector">
          {WEEK_START_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${prefs.weekStart === opt.value ? ' active' : ''}`}
              onClick={() => setPreference('weekStart', opt.value)}
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
