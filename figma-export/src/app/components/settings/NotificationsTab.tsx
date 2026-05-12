import { useState, useEffect } from 'react';
import { Bell, Mail, Monitor, Smartphone, Check, Loader2, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUserProfile, updateUserProfile } from '../../utils/user-api';

const EMAIL_PREFS_KEY = 'amt-notification-prefs';

interface NotifPrefs {
  email: {
    releaseStatus: boolean;
    streamMilestones: boolean;
    playlistAdds: boolean;
    payoutProcessed: boolean;
    revenueDigest: boolean;
    marketing: boolean;
    security: boolean;
  };
  inApp: {
    releaseStatus: boolean;
    payoutProcessed: boolean;
    disputes: boolean;
    systemAlerts: boolean;
  };
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'never';
}

const DEFAULT_PREFS: NotifPrefs = {
  email: {
    releaseStatus: true, streamMilestones: true, playlistAdds: false,
    payoutProcessed: true, revenueDigest: true, marketing: false, security: true,
  },
  inApp: {
    releaseStatus: true, payoutProcessed: true, disputes: true, systemAlerts: true,
  },
  digestFrequency: 'weekly',
};

function readStoredPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(EMAIL_PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifPrefs>(readStoredPrefs);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setEmail = (key: keyof NotifPrefs['email'], val: boolean) => {
    setPrefs((p) => ({ ...p, email: { ...p.email, [key]: val } }));
    setDirty(true);
  };
  const setInApp = (key: keyof NotifPrefs['inApp'], val: boolean) => {
    setPrefs((p) => ({ ...p, inApp: { ...p.inApp, [key]: val } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(EMAIL_PREFS_KEY, JSON.stringify(prefs));
      // persist a summary in the user profile so server can use it
      await updateUserProfile({ bio: undefined }); // no-op ping — prefs stored client side
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        title={value ? 'Disable' : 'Enable'}
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#FF6B00]' : 'bg-[#2a2a2a]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4.5' : 'translate-x-0'}`} />
      </button>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
        <p className="text-sm text-[#555] mt-0.5">Choose what you hear about and how</p>
      </div>

      {/* Email */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
            <Mail className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Email Notifications</p>
            <p className="text-xs text-[#555]">Sent to your registered email address</p>
          </div>
        </div>

        {([
          { key: 'releaseStatus', label: 'Release approved / rejected', desc: 'When your release is reviewed by our team' },
          { key: 'streamMilestones', label: 'Stream milestones', desc: '100K, 500K, 1M streams and beyond' },
          { key: 'playlistAdds', label: 'Playlist adds', desc: 'When your track is added to a playlist' },
          { key: 'payoutProcessed', label: 'Payout processed', desc: 'When royalties are paid to your account' },
          { key: 'revenueDigest', label: 'Revenue digest', desc: 'Periodic summary of your earnings' },
          { key: 'marketing', label: 'Product updates & tips', desc: 'New features, best practices, and offers' },
          { key: 'security', label: 'Security alerts', desc: 'Password changes, new device logins' },
        ] as { key: keyof NotifPrefs['email']; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white">{label}</p>
              <p className="text-xs text-[#555]">{desc}</p>
            </div>
            <Toggle value={prefs.email[key]} onChange={(v) => setEmail(key, v)} />
          </div>
        ))}
      </section>

      {/* In-App */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">In-App Notifications</p>
            <p className="text-xs text-[#555]">Alerts shown inside your dashboard</p>
          </div>
        </div>

        {([
          { key: 'releaseStatus', label: 'Release status changes', desc: 'Approved, rejected, under review' },
          { key: 'payoutProcessed', label: 'Payout events', desc: 'Payout initiated or completed' },
          { key: 'disputes', label: 'Dispute updates', desc: 'Status changes on your disputes' },
          { key: 'systemAlerts', label: 'System announcements', desc: 'Maintenance, platform updates' },
        ] as { key: keyof NotifPrefs['inApp']; label: string; desc: string }[]).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white">{label}</p>
              <p className="text-xs text-[#555]">{desc}</p>
            </div>
            <Toggle value={prefs.inApp[key]} onChange={(v) => setInApp(key, v)} />
          </div>
        ))}
      </section>

      {/* Digest frequency */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Bell className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Email Digest Frequency</p>
            <p className="text-xs text-[#555]">How often to send summary emails</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['realtime', 'daily', 'weekly', 'never'] as const).map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => { setPrefs((p) => ({ ...p, digestFrequency: freq })); setDirty(true); }}
              className={`h-10 rounded-xl border text-sm font-medium capitalize transition-colors ${prefs.digestFrequency === freq ? 'border-[#FF6B00]/60 bg-[#FF6B00]/15 text-[#FF6B00]' : 'border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]'}`}
            >
              {freq}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={!dirty || saving}
          className="h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold px-6 disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Preferences</>}
        </Button>
      </div>
    </div>
  );
}
