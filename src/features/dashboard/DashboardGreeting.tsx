import { type ReactNode } from 'react';
import { useAuthStore } from '@/lib/auth-store';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export default function DashboardGreeting(): ReactNode {
  const fullName = useAuthStore((s) => s.profile?.full_name);

  return (
    <div className="dashboard-greeting">
      <span className="greeting-text">
        {getGreeting()}, <strong>{fullName}</strong>
      </span>
      <span className="greeting-date">{formatDate()}</span>
    </div>
  );
}
