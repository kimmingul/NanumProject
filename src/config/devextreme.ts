/**
 * DevExtreme configuration and license
 */
import config from 'devextreme/core/config';
import DateBox from 'devextreme/ui/date_box';

// Set DevExtreme license key synchronously before any components render
const DEVEXTREME_KEY = import.meta.env.VITE_DEVEXTREME_KEY || '';

if (DEVEXTREME_KEY) {
  config({ licenseKey: DEVEXTREME_KEY });
}

// Global DateBox defaults: show Today button in calendar picker
DateBox.defaultOptions({
  options: {
    calendarOptions: { showTodayButton: true },
  },
});

// Theme configuration
export const dxTheme = {
  name: 'fluent.blue.light',
  baseTheme: 'fluent',
  colorScheme: 'light',
} as const;

// Common DevExtreme component props
export const dxDefaults = {
  button: {
    stylingMode: 'contained' as const,
    type: 'default' as const,
  },
  textBox: {
    stylingMode: 'outlined' as const,
  },
  selectBox: {
    stylingMode: 'outlined' as const,
  },
  dateBox: {
    stylingMode: 'outlined' as const,
  },
  dataGrid: {
    showBorders: true,
    showRowLines: true,
    showColumnLines: false,
    rowAlternationEnabled: true,
    hoverStateEnabled: true,
  },
} as const;
