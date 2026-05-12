import React, { useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Search,
  CheckCircle,
  Clock,
  Package,
  Video,
  ImageIcon,
  LayoutGrid,
  RefreshCw,
  BadgeCheck,
  Calendar,
  FileText,
  AlertCircle,
  ExternalLink,
  Save,
  Upload,
  LoaderCircle,
  Music,
} from 'lucide-react';
import {
  approvePromotionCampaign,
  createPromotionAssetUploadTarget,
  finalizePromotionAssetUpload,
  getAdminPromotionCampaigns,
  updatePromotionCampaign,
  uploadPromotionAssetFile,
  type PromoSubscription,
  type PromoSubscriptionAsset,
} from '../../utils/promotion-api';

function getAssetIcon(type: PromoSubscriptionAsset['type']) {
  if (type === 'video') return Video;
  if (type === 'banner') return LayoutGrid;
  return ImageIcon;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function approvalLabel(subscription: PromoSubscription) {
  return subscription.adminApprovalStatus === 'approved' ? 'Approved' : 'Pending Approval';
}

export function AdminPromotions() {
  const [campaigns, setCampaigns] = useState<PromoSubscription[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');

  async function loadCampaigns() {
    try {
      setIsLoading(true);
      setPageError('');
      const data = await getAdminPromotionCampaigns();
      setCampaigns(data);
      if (!selectedId && data[0]) {
        setSelectedId(data[0].id);
      } else if (selectedId && !data.some((item) => item.id === selectedId)) {
        setSelectedId(data[0]?.id ?? null);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load promotions.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((campaign) => (
      campaign.releaseTitle.toLowerCase().includes(q)
      || campaign.artistName.toLowerCase().includes(q)
      || campaign.planName.toLowerCase().includes(q)
      || (campaign.paymentReference || '').toLowerCase().includes(q)
    ));
  }, [campaigns, search]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  useEffect(() => {
    setDraftNotes(selectedCampaign?.adminNotes || '');
  }, [selectedCampaign]);

  function flashSaved(message: string) {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(''), 2200);
  }

  async function refreshAfterMutation() {
    const data = await getAdminPromotionCampaigns();
    setCampaigns(data);
  }

  async function handleApprove() {
    if (!selectedCampaign || selectedCampaign.status === 'pending_payment') return;
    try {
      setIsApproving(true);
      await approvePromotionCampaign(selectedCampaign.id, draftNotes.trim());
      await refreshAfterMutation();
      flashSaved('Campaign approved');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to approve campaign.');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleSaveNotes() {
    if (!selectedCampaign) return;
    try {
      await updatePromotionCampaign(selectedCampaign.id, { adminNotes: draftNotes.trim() });
      await refreshAfterMutation();
      flashSaved('Admin note saved');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to save notes.');
    }
  }

  async function handleComplete() {
    if (!selectedCampaign) return;
    try {
      await updatePromotionCampaign(selectedCampaign.id, { status: 'completed' });
      await refreshAfterMutation();
      flashSaved('Campaign marked completed');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to complete campaign.');
    }
  }

  async function handleUploadAsset(asset: PromoSubscriptionAsset, file: File | null) {
    if (!selectedCampaign || !file) return;
    try {
      setUploadingAssetId(asset.id);
      const target = await createPromotionAssetUploadTarget(selectedCampaign.id, asset.id, file);
      await uploadPromotionAssetFile(target.signedUrl, file);
      await finalizePromotionAssetUpload(selectedCampaign.id, asset.id, target.path);
      await refreshAfterMutation();
      flashSaved(`${asset.name} uploaded`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to upload asset.');
    } finally {
      setUploadingAssetId(null);
    }
  }

  const totals = useMemo(() => ({
    total: campaigns.length,
    paid: campaigns.filter((campaign) => campaign.status !== 'pending_payment').length,
    awaitingApproval: campaigns.filter((campaign) => campaign.status !== 'pending_payment' && campaign.adminApprovalStatus !== 'approved').length,
    approved: campaigns.filter((campaign) => campaign.adminApprovalStatus === 'approved').length,
  }), [campaigns]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#7B61FF]/15 bg-[#121826] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00E5FF]/20 bg-[#00E5FF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#00E5FF]">
              <Megaphone className="h-3.5 w-3.5" />
              Promotions Admin
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white">Promotion Operations</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#A0A7B8]">
              Review paid promotion campaigns, approve them, upload live downloadable creative assets, and complete delivery from one screen.
            </p>
          </div>
          <button
            onClick={loadCampaigns}
            className="inline-flex items-center gap-2 rounded-xl border border-[#7B61FF]/20 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'All Campaigns', value: totals.total, icon: Package, color: 'text-white' },
          { label: 'Paid', value: totals.paid, icon: CheckCircle, color: 'text-[#00E5FF]' },
          { label: 'Awaiting Approval', value: totals.awaitingApproval, icon: Clock, color: 'text-[#FFD600]' },
          { label: 'Approved', value: totals.approved, icon: BadgeCheck, color: 'text-[#00FFA3]' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-[#7B61FF]/12 bg-[#121826] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
                </div>
                <Icon className={`h-7 w-7 ${item.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {pageError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-[#7B61FF]/15 bg-[#121826] p-5">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search release, artist, plan, reference"
              className="w-full rounded-xl border border-[#7B61FF]/15 bg-[#0B0F1A] py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#6B7280] focus:border-[#00E5FF]/40 focus:outline-none"
            />
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-xl border border-dashed border-[#7B61FF]/20 bg-[#0B0F1A] p-6 text-center text-sm text-[#A0A7B8]">
                Loading promotion campaigns...
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#7B61FF]/20 bg-[#0B0F1A] p-6 text-center text-sm text-[#A0A7B8]">
                No promotion campaigns found.
              </div>
            ) : filteredCampaigns.map((campaign) => {
              const isSelected = campaign.id === selectedId;
              const readyCount = campaign.assets.filter((asset) => asset.ready && asset.url).length;
              return (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedId(campaign.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-[#00E5FF]/40 bg-[#00E5FF]/8'
                      : 'border-[#7B61FF]/10 bg-[#0B0F1A] hover:border-[#7B61FF]/25 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Release cover art thumbnail */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-[#0B0F1A]">
                      {campaign.releaseImageUrl ? (
                        <img
                          src={campaign.releaseImageUrl}
                          alt={campaign.releaseTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-5 w-5 text-[#555]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{campaign.releaseTitle}</p>
                      <p className="mt-0.5 text-xs text-[#A0A7B8]">{campaign.artistName} · {campaign.planName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                      campaign.status === 'pending_payment'
                        ? 'bg-yellow-500/10 text-yellow-300'
                        : campaign.adminApprovalStatus === 'approved'
                          ? 'bg-[#00FFA3]/10 text-[#00FFA3]'
                          : 'bg-[#7B61FF]/14 text-[#CBBEFF]'
                    }`}>
                      {campaign.status === 'pending_payment' ? 'Awaiting Payment' : approvalLabel(campaign)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#8C93A5]">
                    <span>{campaign.displayPrice}</span>
                    <span>{formatDate(campaign.purchasedAt)}</span>
                    <span>{readyCount}/{campaign.assets.length} assets ready</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#7B61FF]/15 bg-[#121826] p-6">
          {!selectedCampaign ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-[#7B61FF]/20 bg-[#0B0F1A] text-sm text-[#A0A7B8]">
              Select a promotion campaign to manage it.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  {/* Release cover art */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-[#0B0F1A]">
                    {selectedCampaign.releaseImageUrl ? (
                      <img
                        src={selectedCampaign.releaseImageUrl}
                        alt={selectedCampaign.releaseTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-8 w-8 text-[#555]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-white">{selectedCampaign.releaseTitle}</h2>
                      {selectedCampaign.releaseType ? (
                        <span className="rounded-full bg-[#FF6B00]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#FFD600]">
                          {selectedCampaign.releaseType}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#A0A7B8]">
                        {selectedCampaign.planName}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        selectedCampaign.adminApprovalStatus === 'approved'
                          ? 'bg-[#00FFA3]/10 text-[#00FFA3]'
                          : 'bg-[#7B61FF]/14 text-[#CBBEFF]'
                      }`}>
                        {approvalLabel(selectedCampaign)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#A0A7B8]">{selectedCampaign.artistName}</p>
                    {selectedCampaign.releaseGenre ? (
                      <p className="mt-0.5 text-xs text-[#555]">{selectedCampaign.releaseGenre}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={selectedCampaign.status === 'pending_payment' || selectedCampaign.adminApprovalStatus === 'approved' || isApproving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00E5FF] px-4 py-3 text-sm font-semibold text-[#0B0F1A] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isApproving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Approve Campaign
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={selectedCampaign.status === 'completed'}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#7B61FF]/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Mark Completed
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-[#0B0F1A] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">Payment Status</p>
                  <p className="mt-2 text-sm font-semibold text-white">{selectedCampaign.status === 'pending_payment' ? 'Awaiting Payment' : 'Paid'}</p>
                </div>
                <div className="rounded-xl bg-[#0B0F1A] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">Reference</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{selectedCampaign.paymentReference || 'Not available yet'}</p>
                </div>
                <div className="rounded-xl bg-[#0B0F1A] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">Purchased</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white"><Calendar className="h-4 w-4 text-[#00E5FF]" /> {formatDate(selectedCampaign.purchasedAt)}</p>
                </div>
                <div className="rounded-xl bg-[#0B0F1A] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">Approved</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatDate(selectedCampaign.approvedAt)}</p>
                </div>
              </div>

              {saveMessage ? (
                <div className="rounded-xl border border-[#00FFA3]/20 bg-[#00FFA3]/8 px-4 py-3 text-sm text-[#9BF5D0]">
                  {saveMessage}
                </div>
              ) : null}

              {selectedCampaign.status === 'pending_payment' ? (
                <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/8 p-4 text-sm text-yellow-100">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
                  This campaign cannot be approved until payment is verified by Paystack.
                </div>
              ) : null}

              <div className="rounded-2xl border border-[#7B61FF]/12 bg-[#0B0F1A] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#00E5FF]" />
                  <h3 className="text-lg font-semibold text-white">Admin Notes</h3>
                </div>
                <textarea
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  placeholder="Add campaign notes, delivery notes, or approval context"
                  rows={4}
                  className="w-full rounded-xl border border-[#7B61FF]/15 bg-[#121826] px-4 py-3 text-sm text-white placeholder:text-[#6B7280] focus:border-[#00E5FF]/40 focus:outline-none"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#7B61FF]/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <Save className="h-4 w-4" />
                    Save Notes
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#7B61FF]/12 bg-[#0B0F1A] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#00E5FF]" />
                  <h3 className="text-lg font-semibold text-white">Deliver Assets</h3>
                </div>
                <div className="space-y-4">
                  {selectedCampaign.assets.map((asset) => {
                    const Icon = getAssetIcon(asset.type);
                    const isUploading = uploadingAssetId === asset.id;
                    return (
                      <div key={asset.id} className="rounded-xl border border-[#7B61FF]/10 bg-[#121826] p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="xl:w-64 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-[#00E5FF]" />
                              <p className="truncate text-sm font-semibold text-white">{asset.name}</p>
                            </div>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#A0A7B8]">{asset.type}</p>
                            {asset.url ? (
                              <a
                                href={asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#00E5FF] hover:text-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> View current file
                              </a>
                            ) : null}
                          </div>

                          <div className="flex-1 space-y-3">
                            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#A0A7B8]">
                              Upload asset file
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <input
                                type="file"
                                title={`Upload ${asset.name}`}
                                accept={asset.type === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/png,image/jpeg,image/webp'}
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  void handleUploadAsset(asset, file);
                                  event.currentTarget.value = '';
                                }}
                                disabled={isUploading}
                                className="block w-full text-sm text-[#A0A7B8] file:mr-4 file:rounded-lg file:border-0 file:bg-[#7B61FF] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90 disabled:opacity-50"
                              />
                              <div className="flex items-center gap-2 text-xs text-[#A0A7B8]">
                                {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-[#00E5FF]" />}
                                {asset.ready ? 'Ready for user download' : 'Awaiting upload'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
