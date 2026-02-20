import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/auth-store';
import { useAutoRefresh } from './useAutoRefresh';
import type { Notification } from '@/types';

export function useNotifications() {
  const profile = useAuthStore((s) => s.profile);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.user_id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifications((data as Notification[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useAutoRefresh(fetchNotifications, 30_000, !!profile?.user_id);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(
        'mark_notification_read',
        { p_notification_id: notificationId },
      );
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(
        'mark_all_notifications_read',
        {},
      );
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
