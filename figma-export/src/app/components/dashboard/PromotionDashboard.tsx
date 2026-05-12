import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Rocket,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  Megaphone,
  Video,
  ImageIcon,
  LayoutGrid,
  ArrowRight,
  X,
  Star,
  BadgeCheck,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Music,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import {
  createPromotionCampaign,
  getPromotionCampaigns,
  getUserReleasesForPromotion,
  type PromoPlanId,
  type PromoSubscription,
  type PromoSubscriptionAsset as PromoAsset,
  type UserRelease,
} from '../../utils/promotion-api';

export const PROMOTION_PLANS = [
  {
    id: '1-week' as const,
    name: '1-Week Campaign',
    price: 30000,
    displayPrice: '₦30,000',
    durationDays: 7,
    durationLabel: '7 days',
    badge: null as string | null,
    description: 'A sharp, focused launch push — ideal for new singles ready to move.',
    features: [
      'Playlist pitching submissions',
      'Social posting framework & schedule',
      'Press release copy',
      'Promotional graphics pack (3 designs)',
      'Campaign summary report',
    ],
    assetLabels: ['3 Promotional Graphics', '1 Social Banner Set'],
  },
  {
    id: '2-weeks' as const,
    name: '2-Weeks Campaign',
    price: 40000,
    displayPrice: '₦40,000',
    durationDays: 14,
    durationLabel: '14 days',
    badge: 'Popular',
    description: 'Extended reach across playlists, blogs, and social channels for stronger traction.',
    features: [
      'Everything in 1-Week Campaign',
      'Online blog outreach (3+ outlets)',
      'Extended social media strategy',
      'Promotional video (30-second promo reel)',
      'Graphic pack (5 designs)',
      'Mid-campaign analytics check-in',
    ],
    assetLabels: ['1 Promotional Video (30s)', '5 Promotional Graphics', '2 Social Banner Sets'],
  },
  {
    id: '4-weeks' as const,
    name: '4-Week Campaign',
    price: 100000,
    displayPrice: '₦100,000',
    durationDays: 28,
    durationLabel: '28 days',
    badge: 'Best Value',
    description: 'Full-scale campaign with paid ads, video content, deep press coverage and optimization.',
    features: [
      'Everything in 2-Week Campaign',
      'Paid social ad campaign (Meta & TikTok)',
      'Full promotional video (60s)',
      'Short-form reel (15s)',
      'Full graphics suite (10 designs)',
      'Weekly campaign progress reports',
      'Priority support & strategy call',
      'Retargeting optimization round',
    ],
    assetLabels: [
      '2 Promotional Videos (60s + 15s reel)',
      '10 Promotional Graphics',
      '4 Social Banner Sets',
    ],
  },
];

function AssetIcon({ type }: { type: PromoAsset['type'] }) {
  if (type === 'video') return <Video className="h-4 w-4" />;
  if (type === 'banner') return <LayoutGrid className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
}

function StatusBadge({ status }: { status: PromoSubscription['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-400">
        <CheckCircle className="h-3 w-3" /> Active
      </span>
    );
  }

  if (status === 'pending_payment') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-semibold text-yellow-400">
        <Clock className="h-3 w-3" /> Awaiting Payment
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B3B3B3]/15 px-2.5 py-1 text-xs font-semibold text-[#B3B3B3]">
      <BadgeCheck className="h-3 w-3" /> Completed
    </span>
  );
}

function CampaignCard({ sub }: { sub: PromoSubscription }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border-[#FF6B00]/20 bg-[#161616] p-0">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FF6B00]">
              {sub.planName}
            </span>
            <StatusBadge status={sub.status} />
            {sub.adminApprovalStatus === 'approved' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00E5FF]/10 px-2.5 py-1 text-xs font-semibold text-[#00E5FF]">
                <BadgeCheck className="h-3 w-3" /> Approved
              </span>
            ) : sub.status !== 'pending_payment' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B61FF]/12 px-2.5 py-1 text-xs font-semibold text-[#CBBEFF]">
                <Clock className="h-3 w-3" /> Awaiting Admin Approval
              </span>
            ) : null}
          </div>
          <h3 className="truncate text-lg font-bold text-white">{sub.releaseTitle}</h3>
          <p className="mt-0.5 text-sm text-[#B3B3B3]">{sub.artistName}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#B3B3B3]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Started {new Date(sub.purchasedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Ends {new Date(sub.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="font-semibold text-[#FFD600]">{sub.displayPrice}</span>
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center gap-1 rounded-lg border border-[#FF6B00]/20 bg-[#FF6B00]/5 px-3 py-1.5 text-xs font-medium text-[#FF6B00] transition hover:bg-[#FF6B00]/10"
          >
            Assets {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#FF6B00]/10 bg-[#111111] px-5 py-4">
          {sub.status === 'pending_payment' ? (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm font-semibold text-yellow-300">Payment not confirmed</p>
                <p className="mt-0.5 text-xs text-[#B3B3B3]">
                  Complete payment to activate this campaign and unlock your asset downloads.
                </p>
              </div>
            </div>
          ) : sub.adminApprovalStatus !== 'approved' ? (
            <div className="flex items-start gap-3 rounded-xl border border-[#7B61FF]/20 bg-[#7B61FF]/8 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#CBBEFF]" />
              <div>
                <p className="text-sm font-semibold text-white">Campaign is under admin review</p>
                <p className="mt-0.5 text-xs text-[#B3B3B3]">
                  Payment is confirmed. Downloads will appear here after the promotion team approves the campaign and uploads your creative assets.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#B3B3B3]">
                Campaign Assets
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sub.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#FF6B00]/10 bg-[#161616] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="shrink-0 text-[#FF6B00]">
                        <AssetIcon type={asset.type} />
                      </span>
                      <span className="truncate text-sm text-white">{asset.name}</span>
                    </div>
                    {asset.ready && asset.url ? (
                      <a
                        href={asset.url}
                        download
                        className="flex shrink-0 items-center gap-1 rounded-md bg-[#FF6B00]/15 px-2 py-1 text-xs font-semibold text-[#FF6B00] transition hover:bg-[#FF6B00]/25"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-[#555]">Pending delivery</span>
                    )}
                  </div>
                ))}
              </div>
              {sub.adminNotes ? (
                <p className="mt-3 text-xs text-[#A0A7B8]">Admin note: {sub.adminNotes}</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function CheckoutModal({
  plan,
  onClose,
  onConfirm,
  submitError,
  isSubmitting,
}: {
  plan: (typeof PROMOTION_PLANS)[number];
  onClose: () => void;
  onConfirm: (release: UserRelease) => Promise<void>;
  submitError?: string;
  isSubmitting?: boolean;
}) {
  const [releases, setReleases] = useState<UserRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<UserRelease | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getUserReleasesForPromotion()
      .then((data) => setReleases(data))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your releases.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = query.trim()
    ? releases.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.primaryArtist.toLowerCase().includes(query.toLowerCase()),
      )
    : releases;

  async function handleConfirm() {
    if (!selected) {
      setError('Select a release to promote.');
      return;
    }

    setError('');
    await onConfirm(selected);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl border border-[#FF6B00]/20 bg-[#161616] max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{plan.name}</h2>
            <p className="mt-0.5 text-sm text-[#B3B3B3]">
              Pick the release you want to promote — your details fill in automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#B3B3B3] transition hover:bg-[#161616]/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mx-6 mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setError(''); }}
            placeholder="Search releases..."
            className="w-full rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#555] focus:border-[#FF6B00]/40 focus:outline-none"
          />
        </div>

        {/* Release list */}
        <div className="mx-6 mb-3 flex-1 overflow-y-auto rounded-xl border border-[#FF6B00]/10 bg-[#0D0D0D] max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#B3B3B3]">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Loading releases...
            </div>
          ) : loadError ? (
            <div className="p-6 text-center text-sm text-red-400">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Music className="h-10 w-10 text-[#FF6B00]/30" />
              <p className="text-sm text-[#B3B3B3]">
                {releases.length === 0
                  ? 'Upload a release first before starting a promotion campaign.'
                  : 'No releases match your search.'}
              </p>
            </div>
          ) : (
            filtered.map((release) => {
              const isSelected = selected?.id === release.id;
              return (
                <button
                  key={release.id}
                  onClick={() => { setSelected(release); setError(''); }}
                  className={`flex w-full items-center gap-4 border-b border-[#FF6B00]/5 p-4 text-left transition last:border-0 ${
                    isSelected
                      ? 'bg-[#FF6B00]/12'
                      : 'hover:bg-[#161616]/[0.03]'
                  }`}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {release.artworkUrl ? (
                      <img
                        src={release.artworkUrl}
                        alt={release.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#222]">
                        <Music className="h-6 w-6 text-[#555]" />
                      </div>
                    )}
                    {isSelected ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#FF6B00]/80 text-white">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{release.title}</p>
                    <p className="mt-0.5 text-xs text-[#B3B3B3]">{release.primaryArtist}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#FF6B00]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#FFD600]">
                        {release.type}
                      </span>
                      <span className="text-[11px] text-[#555]">{release.genre}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        release.status === 'live'
                          ? 'bg-green-500/10 text-green-400'
                          : release.status === 'submitted'
                            ? 'bg-[#00E5FF]/10 text-[#00E5FF]'
                            : 'bg-[#161616]/5 text-[#B3B3B3]'
                      }`}>
                        {release.status}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected preview + errors */}
        {error ? (
          <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
        {submitError ? (
          <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {submitError}
          </div>
        ) : null}

        {/* Summary */}
        <div className="mx-6 mb-5 rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
          {selected ? (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                {selected.artworkUrl ? (
                  <img src={selected.artworkUrl} alt={selected.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#222]">
                    <Music className="h-5 w-5 text-[#555]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{selected.title}</p>
                <p className="text-xs text-[#B3B3B3]">{selected.primaryArtist} · {selected.type.toUpperCase()}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#B3B3B3]">{plan.name}</p>
                <p className="text-lg font-extrabold text-[#FFD600]">{plan.displayPrice}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#555]">No release selected yet.</p>
          )}
        </div>

        <div className="px-6 pb-6">
          <Button
            onClick={handleConfirm}
            disabled={!selected || isLoading || isSubmitting}
            className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Proceed to Payment <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PromotionDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLabel = location.pathname.startsWith('/label-dashboard');
  const basePath = isLabel ? '/label-dashboard' : '/dashboard';

  const [tab, setTab] = useState<'plans' | 'campaigns'>('plans');
  const [subscriptions, setSubscriptions] = useState<PromoSubscription[]>([]);
  const [checkoutPlan, setCheckoutPlan] = useState<(typeof PROMOTION_PLANS)[number] | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [pageError, setPageError] = useState('');

  async function loadCampaigns() {
    try {
      setIsLoadingCampaigns(true);
      setPageError('');
      const campaigns = await getPromotionCampaigns();
      setSubscriptions(campaigns);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load promotion campaigns.');
    } finally {
      setIsLoadingCampaigns(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleConfirmCheckout(release: UserRelease) {
    if (!checkoutPlan) return;

    try {
      setIsCreatingCampaign(true);
      setCheckoutError('');
      const campaign = await createPromotionCampaign({
        planId: checkoutPlan.id as PromoPlanId,
        releaseTitle: release.title,
        artistName: release.primaryArtist?.trim() || 'Unknown Artist',
        releaseId: release.id,
        releaseImageUrl: release.artworkUrl || null,
        releaseType: release.type,
        releaseGenre: release.genre,
      });

      setCheckoutPlan(null);
      await loadCampaigns();
      navigate(`${basePath}/payment`, {
        state: {
          plan: 'promotion',
          amount: campaign.amount,
          billingPeriod: 'monthly',
          promotionId: campaign.id,
          promotionPlanName: campaign.planName,
          releaseTitle: campaign.releaseTitle,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create promotion campaign.';
      setCheckoutError(message);
      setPageError(message);
    } finally {
      setIsCreatingCampaign(false);
    }
  }

  const activeSubs = subscriptions.filter((item) => item.status === 'active');
  const pendingSubs = subscriptions.filter((item) => item.status === 'pending_payment');
  const completedSubs = subscriptions.filter((item) => item.status === 'completed');

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 sm:px-6 lg:px-8">
      {checkoutPlan ? (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={() => !isCreatingCampaign && setCheckoutPlan(null)}
          onConfirm={handleConfirmCheckout}
          submitError={checkoutError}
          isSubmitting={isCreatingCampaign}
        />
      ) : null}

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
          <Rocket className="h-3.5 w-3.5" />
          Promotion
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">Music Promotion</h1>
        <p className="mt-2 max-w-2xl text-[#B3B3B3]">
          Launch focused campaigns with playlist pitching, press coverage, social strategy, and creative assets built to move listeners.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-xl border border-[#FF6B00]/15 bg-[#111] p-1">
          <button
            onClick={() => setTab('plans')}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'plans' ? 'bg-[#FF6B00] text-white shadow' : 'text-[#B3B3B3] hover:text-white'}`}
          >
            Get Promoted
          </button>
          <button
            onClick={() => setTab('campaigns')}
            className={`relative rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'campaigns' ? 'bg-[#FF6B00] text-white shadow' : 'text-[#B3B3B3] hover:text-white'}`}
          >
            My Campaigns
            {(activeSubs.length + pendingSubs.length) > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD600] text-[10px] font-bold text-black">
                {activeSubs.length + pendingSubs.length}
              </span>
            ) : null}
          </button>
        </div>

        <button
          onClick={loadCampaigns}
          className="inline-flex items-center gap-2 rounded-xl border border-[#FF6B00]/15 bg-[#161616]/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#161616]/10"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingCampaigns ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {pageError ? (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {pageError}
        </div>
      ) : null}

      {tab === 'plans' ? (
        <div className="space-y-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {PROMOTION_PLANS.map((plan) => (
              <Card key={plan.id} className={`relative flex flex-col border-[#FF6B00]/20 bg-[#161616] p-6 ${plan.badge === 'Best Value' ? 'border-2 border-[#FFD600] shadow-lg shadow-[#FFD600]/10' : ''}`}>
                {plan.badge ? (
                  <div className="absolute -right-4 -top-3 rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white">
                    {plan.badge}
                  </div>
                ) : null}
                <div>
                  <div className="mb-2 inline-flex rounded-full border border-[#FF6B00]/30 bg-[#FF6B00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFD600]">
                    {plan.durationLabel}
                  </div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-1.5 text-sm text-[#B3B3B3]">{plan.description}</p>
                  <div className="mt-4 text-4xl font-extrabold text-[#FFD600]">{plan.displayPrice}</div>
                  <p className="mt-0.5 text-xs text-[#555]">One-time payment · Naira</p>
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm text-[#D0D0D0]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-xl border border-[#FF6B00]/10 bg-[#111] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#555]">Includes</p>
                  {plan.assetLabels.map((label) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-[#B3B3B3]">
                      <Download className="h-3 w-3 text-[#FF6B00]" /> {label}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    setCheckoutError('');
                    setCheckoutPlan(plan);
                  }}
                  className="mt-5 w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90"
                >
                  Start Campaign <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>

          <div className="rounded-2xl border border-[#FF6B00]/15 bg-[#111111] p-6 sm:p-8">
            <h2 className="mb-6 text-2xl font-bold text-white">How Your Campaign Runs</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: FileText, step: '01', title: 'Discovery & Brief', desc: 'We review your release and shape a campaign angle that positions it correctly.' },
                { icon: ImageIcon, step: '02', title: 'Creative Production', desc: 'Your promo videos, graphics, and posting assets are produced and sent to you.' },
                { icon: Megaphone, step: '03', title: 'Launch & Amplify', desc: 'Playlist, blog, and social activity runs in a coordinated window around release week.' },
                { icon: Star, step: '04', title: 'Report & Next Steps', desc: 'You receive campaign insights, what worked, and practical next actions.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="rounded-xl border border-[#FF6B00]/10 bg-[#171717] p-5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFD600]">Step {item.step}</div>
                    <Icon className="mb-3 h-6 w-6 text-[#FF6B00]" />
                    <h3 className="mb-1.5 text-base font-semibold text-white">{item.title}</h3>
                    <p className="text-sm leading-6 text-[#B3B3B3]">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {isLoadingCampaigns ? (
            <div className="rounded-2xl border border-[#FF6B00]/10 bg-[#111] py-16 text-center text-sm text-[#B3B3B3]">
              Loading campaigns...
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#FF6B00]/10 bg-[#111] py-16 text-center">
              <Rocket className="mb-4 h-12 w-12 text-[#FF6B00]/40" />
              <h3 className="text-xl font-bold text-white">No campaigns yet</h3>
              <p className="mt-2 max-w-sm text-sm text-[#B3B3B3]">
                Purchase a promotion campaign to start getting your music in front of more listeners.
              </p>
              <Button onClick={() => setTab('plans')} className="mt-6 bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90">
                View Campaign Plans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {activeSubs.length > 0 ? (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                    <CheckCircle className="h-5 w-5 text-green-400" /> Active Campaigns
                  </h2>
                  <div className="space-y-4">
                    {activeSubs.map((campaign) => <CampaignCard key={campaign.id} sub={campaign} />)}
                  </div>
                </section>
              ) : null}

              {pendingSubs.length > 0 ? (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                    <Clock className="h-5 w-5 text-yellow-400" /> Pending Payment
                  </h2>
                  <div className="space-y-4">
                    {pendingSubs.map((campaign) => <CampaignCard key={campaign.id} sub={campaign} />)}
                  </div>
                </section>
              ) : null}

              {completedSubs.length > 0 ? (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                    <BadgeCheck className="h-5 w-5 text-[#B3B3B3]" /> Completed Campaigns
                  </h2>
                  <div className="space-y-4">
                    {completedSubs.map((campaign) => <CampaignCard key={campaign.id} sub={campaign} />)}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
