import { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, TrendingUp, Download, Loader2, Zap, Check, AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { getCurrentUserProfile, type UserProfile } from '../../utils/user-api';
import { getBillingHistory, type BillingHistoryRecord } from '../../utils/payment-api';
import { useNavigate } from 'react-router';

const PLAN_LABELS: Record<string, string> = {
  artist: 'Go-Artist',
  super_artist: 'Super Artist',
  partner: 'Label / Partner',
};

const PLAN_PRICE: Record<string, string> = {
  artist: '₦15,000 / release',
  super_artist: '₦25,000 / release',
  partner: '₦40,000 / month',
};

const PLAN_FEATURES: Record<string, string[]> = {
  artist: ['150+ platforms', 'Basic analytics', 'Keep 100% royalties', 'ISRC & UPC codes included', 'Dedicated support'],
  super_artist: ['All Go-Artist features', 'Advanced analytics', 'YouTube Content ID & OAC setup', 'Set exact release times', 'Social media promotion', 'Priority support', 'Free Pre-Save Smartlinks for every release'],
  partner: ['All Super Artist features', 'Label dashboard', 'Multi-artist management', 'Revenue split tools', 'Dedicated account manager'],
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${cfg[status] ?? 'bg-white/5 text-[#B3B3B3] border-white/10'}`}>{status}</span>
  );
}

export function BillingTab() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<BillingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    getCurrentUserProfile().then(setProfile).catch(() => {}).finally(() => setLoading(false));
    getBillingHistory().then(setHistory).catch(() => {}).finally(() => setHistLoading(false));
  }, []);

  const tier = profile?.subscriptionTier ?? 'artist';
  const subscriptionBillingHistory = history.filter((h) => h.type === 'subscription');

  const handleUpgrade = () => navigate('../upgrade');

  const exportInvoices = () => {
    const rows = [
      ['Date', 'Description', 'Amount (NGN)', 'Status', 'Reference'],
      ...subscriptionBillingHistory.map((r) => [
        new Date(r.createdAt).toLocaleDateString(), r.description,
        r.amount.toLocaleString(), r.status, r.reference,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Billing & Subscription</h2>
        <p className="text-sm text-[#555] mt-0.5">Manage your plan, invoices, and payment details</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#555] text-sm py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {/* Current plan */}
          <section className="rounded-2xl border border-[#FF6B00]/25 bg-[#FF6B00]/5 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">{PLAN_LABELS[tier] ?? tier}</p>
                  <p className="text-xs text-[#B3B3B3]">{PLAN_PRICE[tier] ?? 'Custom pricing'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 font-medium">Active</span>
                {tier !== 'partner' && (
                  <Button size="sm" onClick={handleUpgrade}
                    className="h-8 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-xs px-4">
                    {tier === 'artist' ? 'Upgrade to Super Artist' : 'Upgrade Plan'}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Features */}
              <div className="rounded-xl bg-black/20 border border-white/8 p-4">
                <p className="text-xs font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Included</p>
                <ul className="space-y-1.5">
                  {(PLAN_FEATURES[tier] ?? []).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white">
                      <Check className="w-3 h-3 text-[#FF6B00] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Renewal */}
              <div className="rounded-xl bg-black/20 border border-white/8 p-4 space-y-3">
                <p className="text-xs font-semibold text-[#B3B3B3] uppercase tracking-wider">Account Info</p>
                <div className="flex items-center gap-2 text-xs text-[#B3B3B3]">
                  <Calendar className="w-3.5 h-3.5 text-[#555]" />
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#B3B3B3]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#555]" />
                  {profile?.isVerified ? 'Account verified' : 'Verification pending'}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#B3B3B3]">
                  <CreditCard className="w-3.5 h-3.5 text-[#555]" />
                  {subscriptionBillingHistory.length > 0
                    ? `Last payment: ${new Date(subscriptionBillingHistory[0].createdAt).toLocaleDateString()}`
                    : tier === 'artist' ? 'Free plan — no payment required' : 'No billing history'}
                </div>
              </div>
            </div>
          </section>

          {/* Upgrade callout if not top tier */}
          {tier === 'artist' && (
            <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white mb-1">Unlock Super Artist</p>
                <p className="text-xs text-[#B3B3B3] leading-relaxed">Advanced analytics, YouTube Content ID, social media promotion and Pre-Save Smartlinks for every release — ₦25,000/release.</p>
              </div>
              <Button size="sm" onClick={handleUpgrade}
                className="h-8 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 flex-shrink-0">
                Upgrade
              </Button>
            </section>
          )}
        </>
      )}

      {/* Invoice history */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Billing History</p>
              <p className="text-xs text-[#555]">{subscriptionBillingHistory.length} invoices</p>
            </div>
          </div>
          {subscriptionBillingHistory.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportInvoices}
              className="h-8 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
          )}
        </div>

        {histLoading ? (
          <div className="flex items-center gap-2 text-[#555] text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : subscriptionBillingHistory.length === 0 ? (
          <p className="text-sm text-[#555] py-2">No billing history yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-[#0d0d0d]">
                  {['Date', 'Description', 'Amount', 'Status', 'Reference'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#555] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptionBillingHistory.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-3 text-xs text-[#B3B3B3] whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-white max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-3 text-xs text-white font-mono whitespace-nowrap">₦{r.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#555] font-mono whitespace-nowrap">{r.reference.slice(0, 16)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
