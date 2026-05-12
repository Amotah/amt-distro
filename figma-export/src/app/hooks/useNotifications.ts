/**
 * useNotifications — fetches live notifications from `user_notifications`
 * and subscribes to Supabase Realtime so the bell badge updates the instant
 * the backend (or an admin) inserts a new row for this user.
 *
 * The backend Edge Function should call:
 *   supabaseAdmin.from('user_notifications').insert({
 *     user_id,
 *     title: '...',
 *     body:  '...',
 *     type:  'release' | 'earnings' | 'info' | 'promo' | 'alert',
 *     link:  '/dashboard/releases',
 *   })
 * after any meaningful event (release status change, payout, promo, etc.).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'release' | 'earnings' | 'news' | 'promo' | 'alert';
  link: string | null;
  read: boolean;
  created_at: string;
}

const MAX_SHOWN = 20;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof getSupabaseClient>['channel'] extends (...args: infer A) => infer R ? R : never | null>(null);

  const supabase = getSupabaseClient();

  // ── Fetch latest notifications from DB ────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_SHOWN);

      if (error) throw error;
      setNotifications((data as Notification[]) ?? []);
    } catch (err) {
      console.error('[useNotifications] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Subscribe to realtime inserts ─────────────────────────────────────────
  useEffect(() => {
    fetchNotifications();

    // Get the current user's id for the realtime filter
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId) return;

      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // Prepend the new notification — no refetch needed
            setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, MAX_SHOWN));
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)),
            );
          },
        )
        .subscribe();

      channelRef.current = channel as typeof channelRef.current;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current as Parameters<typeof supabase.removeChannel>[0]);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mark one notification as read ─────────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase.from('user_notifications').update({ read: true }).eq('id', id);
    },
    [supabase],
  );

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('user_notifications').update({ read: true }).in('id', ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, supabase]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}
