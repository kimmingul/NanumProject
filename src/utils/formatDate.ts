import { usePreferencesStore } from '@/lib/preferences-store';

type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYMMDD';

export function formatDate(date: string | Date, format?: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const fmt = format || usePreferencesStore.getState().preferences.dateFormat;
  const yyyy = d.getFullYear().toString();
  const yy = yyyy.slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  switch (fmt) {
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD.MM.YYYY': return `${dd}.${mm}.${yyyy}`;
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'YYMMDD':     return `${yy}${mm}${dd}`;
    case 'YYYY-MM-DD':
    default:           return `${yyyy}-${mm}-${dd}`;
  }
}

/** Convert our DateFormat to a DevExtreme format string for Column.format */
const DX_FORMAT_MAP: Record<DateFormat, string> = {
  'YYYY-MM-DD': 'yyyy-MM-dd',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'DD.MM.YYYY': 'dd.MM.yyyy',
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'YYMMDD':     'yyMMdd',
};

export function getDxDateFormat(): string {
  const fmt = usePreferencesStore.getState().preferences.dateFormat;
  return DX_FORMAT_MAP[fmt] || 'yyyy-MM-dd';
}

export function getDxDateTimeFormat(): string {
  return `${getDxDateFormat()}, HH:mm`;
}
