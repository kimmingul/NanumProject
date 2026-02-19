import { type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface DateFilter {
  key: string;
  label: string;
  icon: string;
}

const dateFilters: DateFilter[] = [
  { key: 'today', label: 'Today', icon: 'dx-icon-clock' },
  { key: 'yesterday', label: 'Yesterday', icon: 'dx-icon-clock' },
  { key: '7days', label: 'Last 7 Days', icon: 'dx-icon-event' },
  { key: '30days', label: 'Last 30 Days', icon: 'dx-icon-event' },
  { key: 'all', label: 'All Time', icon: 'dx-icon-fieldchooser' },
];

export function AuditSidebarList(): ReactNode {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('range') || 'all';

  const handleFilter = (key: string) => {
    if (key === 'all') {
      searchParams.delete('range');
    } else {
      searchParams.set('range', key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="sidebar-list">
      {dateFilters.map((f) => (
        <div
          key={f.key}
          className={`sidebar-list-item ${activeFilter === f.key ? 'active' : ''}`}
          onClick={() => handleFilter(f.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter(f.key)}
        >
          <i className={f.icon} />
          <span className="sidebar-item-name">{f.label}</span>
        </div>
      ))}
    </div>
  );
}
