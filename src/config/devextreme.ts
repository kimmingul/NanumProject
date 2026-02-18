/**
 * DevExtreme configuration and license
 */

// Set DevExtreme license key (dynamic import to handle version differences)
const DEVEXTREME_KEY = import.meta.env.VITE_DEVEXTREME_KEY || '';

if (DEVEXTREME_KEY) {
  import('devextreme/common').then((mod) => {
    if ('licenseKey' in mod && typeof mod.licenseKey === 'function') {
      mod.licenseKey(DEVEXTREME_KEY);
    }
  }).catch(() => {
    // licenseKey not available in this DevExtreme version
  });
}

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
