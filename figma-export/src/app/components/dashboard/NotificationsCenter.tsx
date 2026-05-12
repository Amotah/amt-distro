import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Bell, CheckCircle2, ChevronLeft, ExternalLink, MailCheck, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useNotifications } from '../../hooks/useNotifications';

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsCenter() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('notification') || '';
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const dashboardBasePath = isLabelDashboard ? '/label-dashboard' : '/dashboard';
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();

  const selectedNotification = useMemo(
    () => notifications.find((item) => item.id === selectedId) ?? null,
    [notifications, selectedId],
  );

  const goToList = () => {
    navigate(`${dashboardBasePath}/notifications`, { replace: true });
  };

  const openNotification = (id: string) => {
    void markRead(id);
    navigate(`${dashboardBasePath}/notifications?notification=${encodeURIComponent(id)}`);
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Notifications</h1>
          <p className="text-sm text-[#B3B3B3]">Read updates, announcements, approvals, and payment events.</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <Button variant="outline" className="border-[#FF6B00]/30 bg-transparent text-[#FF6B00] hover:bg-[#FF6B00]/10" onClick={() => { void markAllRead(); }}>
              <MailCheck className="mr-2 h-4 w-4" />
              Mark all read
            </Button>
          ) : null}
          <Button variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#B3B3B3] hover:bg-[#0A0A0A] hover:text-white" onClick={() => navigate(-1)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-[#FF6B00]/20 bg-[#161616] text-white">
          <div className="border-b border-[#FF6B00]/10 px-4 py-3">
            <p className="text-sm font-medium text-white">All Notifications</p>
            <p className="text-xs text-[#B3B3B3]">{unreadCount} unread</p>
          </div>
          <div className="max-h-[32rem] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-sm text-[#B3B3B3]">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[#B3B3B3]">
                <Bell className="h-6 w-6 text-[#666]" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => openNotification(item.id)}
                    className={`w-full border-b border-[#FF6B00]/10 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-[#FF6B00]/12' : item.read ? 'hover:bg-[#0A0A0A]' : 'bg-[#FF6B00]/5 hover:bg-[#FF6B00]/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-sm ${item.read ? 'text-[#D6D6D6]' : 'font-medium text-white'}`}>{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#B3B3B3]">{item.body}</p>
                      </div>
                      {!item.read ? <span className="mt-1 h-2 w-2 rounded-full bg-[#FF6B00]" /> : null}
                    </div>
                    <p className="mt-2 text-[11px] text-[#666]">{formatRelativeTime(item.created_at)}</p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3 border-[#FF6B00]/20 bg-[#161616] text-white">
          {selectedNotification ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[#FF6B00]/10 px-5 py-4">
                <div>
                  <p className="text-lg font-semibold text-white">{selectedNotification.title}</p>
                  <p className="mt-1 text-xs text-[#B3B3B3]">{formatRelativeTime(selectedNotification.created_at)}</p>
                </div>
                <Button size="icon" variant="ghost" className="text-[#B3B3B3] hover:bg-[#0A0A0A] hover:text-white" onClick={goToList}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-5 px-5 py-5">
                <p className="leading-relaxed text-[#D6D6D6]">{selectedNotification.body}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!selectedNotification.read ? (
                    <Button
                      variant="outline"
                      className="border-[#FF6B00]/30 bg-transparent text-[#FF6B00] hover:bg-[#FF6B00]/10"
                      onClick={() => { void markRead(selectedNotification.id); }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as read
                    </Button>
                  ) : null}
                  {selectedNotification.link ? (
                    <Link to={selectedNotification.link} className="inline-flex">
                      <Button className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
                        Open linked page
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                  <Button variant="ghost" className="text-[#B3B3B3] hover:bg-[#0A0A0A] hover:text-white" onClick={goToList}>
                    Close detail
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 px-4 text-center text-[#B3B3B3]">
              <Bell className="h-7 w-7 text-[#666]" />
              <p className="text-sm">Select a notification to read details.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
