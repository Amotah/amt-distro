import React, { useCallback, useEffect, useState } from 'react';
import {
  Settings, Globe, Mail, Zap, Wrench, ChevronDown, ChevronRight,
  Check, X, AlertTriangle, AlertOctagon, RefreshCw, Save, Plus, Trash2,
  Power, Database, Clock, Shield, DollarSign, Music, Bell, Cpu,
  ToggleLeft, ToggleRight, Lock, Unlock, Activity, Wifi, WifiOff,
  ServerOff, Server, SquareX,
} from 'lucide-react';
import {
  getPlatformSettings, updatePlatformSettings,
  getDspConfigs, updateDspConfig,
  getEmailConfig, updateEmailConfig,
  getFeatureFlags, updateFeatureFlag, emergencyDisableAllFlags,
  getMaintenanceConfig, updateMaintenanceConfig, triggerManualBackup,
  type PlatformSettings, type DspConfig, type EmailConfig,
  type FeatureFlag, type MaintenanceConfig,
} from '../../utils/admin-api';

// ── Design constants ──────────────────────────────────────────────────────────
const FLAG_CAT_CLS: Record<string, string> = {
  artist:       'bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30',
  release:      'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30',
  analytics:    'bg-[#22D3A1]/15 text-[#22D3A1] border border-[#22D3A1]/30',
  finance:      'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  distribution: 'bg-[#A0A7B8]/15 text-[#A0A7B8] border border-[#A0A7B8]/30',
  moderation:   'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30',
};

const DSP_ICON_CLS: Record<string, string> = {
  spotify:      'bg-[#22D3A1]/15 text-[#22D3A1]',
  apple_music:  'bg-[#F43F5E]/15 text-[#F43F5E]',
  youtube_music:'bg-[#F43F5E]/15 text-[#F43F5E]',
  deezer:       'bg-[#7B61FF]/15 text-[#7B61FF]',
  tidal:        'bg-[#00E5FF]/15 text-[#00E5FF]',
  amazon_music: 'bg-[#F59E0B]/15 text-[#F59E0B]',
};

// ── Shared primitives ─────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#7B61FF]/20 bg-[#121826] ${className}`}>{children}</div>;
}

function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="rounded-xl p-2.5 bg-[#7B61FF]/20 flex-shrink-0">
        <Icon size={16} className="text-[#7B61FF]" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {sub && <p className="text-xs text-[#A0A7B8] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-xs font-medium text-[#E2E8F0]">{children}</label>
      {hint && <p className="text-[10px] text-[#A0A7B8] mt-0.5">{hint}</p>}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, title }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; title: string;
}) {
  return (
    <input type="number" value={value} min={min} max={max} step={step} title={title}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60" />
  );
}

function TextInput({ value, onChange, placeholder, title, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; title: string; type?: string;
}) {
  return (
    <input type={type} value={value} placeholder={placeholder} title={title}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60" />
  );
}

function SelectInput({ value, onChange, options, title, className = '' }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; title: string; className?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label={title} title={title}
      className={`rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none ${className}`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label, disabled = false }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked="true" aria-label={label} title={label}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`flex-shrink-0 relative w-10 h-5 rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#7B61FF]' : 'bg-[#A0A7B8]/30'} disabled:opacity-40`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-[#E2E8F0]">{label}</p>
        {hint && <p className="text-xs text-[#A0A7B8] mt-0.5">{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function SaveBar({ dirty, saving, saved, onSave, onReset }: {
  dirty: boolean; saving: boolean; saved: boolean; onSave: () => void; onReset: () => void;
}) {
  if (!dirty && !saved) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all ${dirty ? 'bg-[#121826] border-[#7B61FF]/40' : 'bg-[#121826] border-[#22D3A1]/40'}`}>
      {saved && !dirty && <span className="text-xs text-[#22D3A1] flex items-center gap-1.5"><Check size={12} />Changes saved</span>}
      {dirty && (
        <>
          <span className="text-xs text-[#A0A7B8]">Unsaved changes</span>
          <button onClick={onReset} className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-xs transition-colors">Reset</button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-semibold transition-colors disabled:opacity-50">
            {saving ? <><RefreshCw size={11} className="animate-spin" />Saving…</> : <><Save size={11} />Save Changes</>}
          </button>
        </>
      )}
    </div>
  );
}

// Confirm modal
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  requireText?: string;
}
function ConfirmModal({ open, title, message, danger, confirmLabel, onConfirm, onClose, requireText }: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  if (!open) return null;
  const canConfirm = !requireText || typed === requireText;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          {danger && <AlertOctagon size={20} className="text-[#F43F5E] flex-shrink-0 mt-0.5" />}
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-sm text-[#A0A7B8] mt-1">{message}</p>
          </div>
        </div>
        {requireText && (
          <div>
            <p className="text-xs text-[#A0A7B8] mb-1.5">Type <strong className="text-[#F43F5E]">{requireText}</strong> to confirm</p>
            <input value={typed} onChange={e => setTyped(e.target.value)} title="Confirmation text"
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm p-2.5 focus:outline-none" />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[#7B61FF]/25 text-[#A0A7B8] hover:text-white text-sm transition-colors">Cancel</button>
          <button disabled={!canConfirm} onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 ${danger ? 'bg-[#F43F5E] hover:bg-[#E03354]' : 'bg-[#7B61FF] hover:bg-[#6B51EF]'}`}>
            {confirmLabel}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 1: Platform Settings ──────────────────────────────────────────────────
function PlatformSettingsTab() {
  const [cfg, setCfg] = useState<PlatformSettings | null>(null);
  const [orig, setOrig] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const s = await getPlatformSettings(); setCfg(s); setOrig(s); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(cfg) !== JSON.stringify(orig);

  async function save() {
    if (!cfg) return;
    setSaving(true); setErr('');
    try { const s = await updatePlatformSettings(cfg); setCfg(s); setOrig(s); setSaved(true); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  function addCurrency() {
    const c = newCurrency.toUpperCase().trim();
    if (!c || !cfg) return;
    if (cfg.payout.supportedCurrencies.includes(c)) return;
    setCfg(prev => prev ? { ...prev, payout: { ...prev.payout, supportedCurrencies: [...prev.payout.supportedCurrencies, c] } } : prev);
    setNewCurrency('');
  }

  function removeCurrency(c: string) {
    setCfg(prev => prev ? { ...prev, payout: { ...prev.payout, supportedCurrencies: prev.payout.supportedCurrencies.filter(x => x !== c) } } : prev);
  }

  if (loading) return <Spinner />;
  if (!cfg) return null;

  const feeSum = cfg.payout.platformFeePercent + cfg.payout.artistPayoutPercent;

  return (
    <div className="space-y-5">
      {confirmSave && (
        <ConfirmModal open title="Save Platform Settings" message="These changes affect all artist payouts and release processing. Are you sure?"
          confirmLabel="Save Changes" onConfirm={save} onClose={() => setConfirmSave(false)} />
      )}
      {err && <ErrorBanner message={err} />}

      {/* Payout */}
      <Card className="p-5">
        <SectionHeader icon={DollarSign} title="Payout Configuration" sub="Financial thresholds and payment method availability" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <FieldLabel hint="Minimum earnings before a payout is triggered">Minimum Payout Threshold (USD)</FieldLabel>
            <NumberInput value={cfg.payout.minThreshold} min={1} title="Minimum payout threshold"
              onChange={v => setCfg(p => p ? { ...p, payout: { ...p.payout, minThreshold: v } } : p)} />
          </div>
          <div>
            <FieldLabel hint={`Platform keeps ${cfg.payout.platformFeePercent}%, artists receive ${cfg.payout.artistPayoutPercent}%`}>Platform Commission (%)</FieldLabel>
            <NumberInput value={cfg.payout.platformFeePercent} min={0} max={100} title="Platform fee percentage"
              onChange={v => setCfg(p => p ? { ...p, payout: { ...p.payout, platformFeePercent: v, artistPayoutPercent: 100 - v } } : p)} />
            {feeSum !== 100 && <p className="text-[10px] text-[#F43F5E] mt-1">⚠ Commission + Artist payout must total 100% (currently {feeSum}%)</p>}
          </div>
          <div>
            <FieldLabel hint="Automatically set to 100 − commission">Artist Payout Percentage (%)</FieldLabel>
            <div className="rounded-lg border border-[#7B61FF]/20 bg-[#0B0F1A] px-3 py-2 text-sm text-[#22D3A1] font-semibold">{cfg.payout.artistPayoutPercent}%</div>
          </div>
        </div>

        <div className="mt-5">
          <FieldLabel hint="ISO 4217 currency codes — artists can withdraw in these currencies">Supported Currencies</FieldLabel>
          <div className="flex flex-wrap gap-2 mb-3">
            {cfg.payout.supportedCurrencies.map(c => (
              <span key={c} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-xs text-[#E2E8F0] font-mono">
                {c}
                <button onClick={() => removeCurrency(c)} title={`Remove ${c}`} className="text-[#A0A7B8] hover:text-[#F43F5E] transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCurrency} onChange={e => setNewCurrency(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCurrency()} maxLength={4}
              placeholder="USD" title="Currency code" className="w-24 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs p-2 focus:outline-none focus:border-[#7B61FF]/60 uppercase" />
            <button onClick={addCurrency} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#7B61FF] hover:bg-[#7B61FF]/15 text-xs font-medium transition-colors">
              <Plus size={11} />Add
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <FieldLabel>Accepted Payment Methods</FieldLabel>
          <ToggleRow label="Stripe" hint="Card payments via Stripe Connect"
            checked={cfg.payout.paymentMethods.stripe}
            onChange={v => setCfg(p => p ? { ...p, payout: { ...p.payout, paymentMethods: { ...p.payout.paymentMethods, stripe: v } } } : p)} />
          <ToggleRow label="PayPal" hint="PayPal payout integration"
            checked={cfg.payout.paymentMethods.paypal}
            onChange={v => setCfg(p => p ? { ...p, payout: { ...p.payout, paymentMethods: { ...p.payout.paymentMethods, paypal: v } } } : p)} />
          <ToggleRow label="Bank Transfer" hint="Direct bank/wire transfers"
            checked={cfg.payout.paymentMethods.bankTransfer}
            onChange={v => setCfg(p => p ? { ...p, payout: { ...p.payout, paymentMethods: { ...p.payout.paymentMethods, bankTransfer: v } } } : p)} />
        </div>
      </Card>

      {/* Release Approval */}
      <Card className="p-5">
        <SectionHeader icon={Music} title="Release Approval Policy" sub="Automatic approval criteria and review requirements" />
        <div className="space-y-4">
          <ToggleRow label="Enable Auto-Approval" hint="Trusted artists bypass manual review if they meet the criteria below"
            checked={cfg.release.autoApproveEnabled}
            onChange={v => setCfg(p => p ? { ...p, release: { ...p.release, autoApproveEnabled: v } } : p)} />
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${cfg.release.autoApproveEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <FieldLabel hint="Minimum past approved releases for auto-approval">Minimum Approved Releases</FieldLabel>
              <NumberInput value={cfg.release.autoApproveMinReleases} min={0} title="Min releases for auto-approval"
                onChange={v => setCfg(p => p ? { ...p, release: { ...p.release, autoApproveMinReleases: v } } : p)} />
            </div>
            <div>
              <FieldLabel hint="Account must be at least this many days old">Min Account Age (days)</FieldLabel>
              <NumberInput value={cfg.release.autoApproveMinDaysSinceJoin} min={0} title="Min account age in days"
                onChange={v => setCfg(p => p ? { ...p, release: { ...p.release, autoApproveMinDaysSinceJoin: v } } : p)} />
            </div>
          </div>
          <ToggleRow label="Mandatory Human Review" hint="All releases — even from trusted artists — require manual review"
            checked={cfg.release.mandatoryReview}
            onChange={v => setCfg(p => p ? { ...p, release: { ...p.release, mandatoryReview: v } } : p)} />
        </div>
      </Card>

      {/* Content Moderation */}
      <Card className="p-5">
        <SectionHeader icon={Shield} title="Content Moderation" sub="Auto-flagging thresholds and copyright detection" />
        <div className="space-y-4">
          <ToggleRow label="Enable Auto-Flag" hint="Automatically flag content exceeding confidence thresholds"
            checked={cfg.contentModeration.autoFlagEnabled}
            onChange={v => setCfg(p => p ? { ...p, contentModeration: { ...p.contentModeration, autoFlagEnabled: v } } : p)} />
          <div>
            <FieldLabel hint={`Explicit content AI confidence score ≥ ${Math.round(cfg.contentModeration.autoFlagExplicitThreshold * 100)}% triggers a flag`}>
              Explicit Content Threshold ({Math.round(cfg.contentModeration.autoFlagExplicitThreshold * 100)}%)
            </FieldLabel>
            <input type="range" min={0} max={1} step={0.05} value={cfg.contentModeration.autoFlagExplicitThreshold}
              title="Explicit content threshold"
              onChange={e => setCfg(p => p ? { ...p, contentModeration: { ...p.contentModeration, autoFlagExplicitThreshold: parseFloat(e.target.value) } } : p)}
              className="w-full accent-[#7B61FF]" />
            <div className="flex justify-between text-[10px] text-[#A0A7B8] mt-0.5"><span>0% (flag all)</span><span>100% (very strict)</span></div>
          </div>
          <ToggleRow label="Copyright Checks" hint="Run AI copyright detection on all uploaded audio"
            checked={cfg.contentModeration.copyrightChecksEnabled}
            onChange={v => setCfg(p => p ? { ...p, contentModeration: { ...p.contentModeration, copyrightChecksEnabled: v } } : p)} />
        </div>
      </Card>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={() => setConfirmSave(true)} onReset={() => { setCfg(orig); setSaved(false); }} />
    </div>
  );
}

// ── Tab 2: DSP Configuration ──────────────────────────────────────────────────
const SYNC_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];
const FALLBACK_OPTIONS = [
  { value: 'retry', label: 'Retry (auto-retry on failure)' },
  { value: 'skip', label: 'Skip (mark as skipped)' },
  { value: 'queue', label: 'Queue (hold for manual release)' },
];

function DspCard({ dsp, onSave }: { dsp: DspConfig; onSave: (d: Partial<DspConfig> & { apiKey?: string; clientSecret?: string }) => Promise<void> }) {
  const [local, setLocal] = useState(dsp);
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [newRegion, setNewRegion] = useState('');

  const dirty = JSON.stringify(local) !== JSON.stringify(dsp) || !!apiKey || !!clientSecret;

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      const payload: Partial<DspConfig> & { apiKey?: string; clientSecret?: string } = {
        enabled: local.enabled, syncInterval: local.syncInterval,
        fallbackStrategy: local.fallbackStrategy, regions: local.regions,
        ...(apiKey ? { apiKey } : {}),
        ...(clientSecret ? { clientSecret } : {}),
      };
      await onSave(payload);
      setApiKey(''); setClientSecret(''); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally { setSaving(false); }
  }

  function addRegion() {
    const r = newRegion.toUpperCase().trim();
    if (!r || local.regions.includes(r)) return;
    setLocal(p => ({ ...p, regions: [...p.regions, r] }));
    setNewRegion('');
  }

  const iclsCont = DSP_ICON_CLS[dsp.id] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]';

  return (
    <Card className={`overflow-hidden transition-all ${local.enabled ? '' : 'opacity-70'}`}>
      <div className="p-4 flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${iclsCont}`}>
          <Music size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{dsp.name}</span>
            {dsp.apiConfigured
              ? <span className="flex items-center gap-0.5 text-[10px] text-[#22D3A1]"><Wifi size={9} />Configured</span>
              : <span className="flex items-center gap-0.5 text-[10px] text-[#F59E0B]"><WifiOff size={9} />Not Configured</span>
            }
          </div>
          <div className="text-[10px] text-[#A0A7B8] mt-0.5">Sync: {local.syncInterval} · Fallback: {local.fallbackStrategy}</div>
        </div>
        <Toggle checked={local.enabled} onChange={v => setLocal(p => ({ ...p, enabled: v }))} label={`Enable ${dsp.name}`} />
        <button onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}
          className="text-[#A0A7B8] hover:text-white transition-colors">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#7B61FF]/15 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel hint="How often to sync analytics and release status from this DSP">Sync Interval</FieldLabel>
              <SelectInput value={local.syncInterval} onChange={v => setLocal(p => ({ ...p, syncInterval: v as any }))}
                options={SYNC_OPTIONS} title="Sync interval" className="w-full" />
            </div>
            <div>
              <FieldLabel hint="What to do if this DSP's API is unreachable during a distribution job">Fallback Strategy</FieldLabel>
              <SelectInput value={local.fallbackStrategy} onChange={v => setLocal(p => ({ ...p, fallbackStrategy: v as any }))}
                options={FALLBACK_OPTIONS} title="Fallback strategy" className="w-full" />
            </div>
          </div>

          <div>
            <FieldLabel hint="ISO 3166-1 alpha-2 country codes. Leave empty to allow all regions.">
              Region Availability ({local.regions.length === 0 ? 'All regions' : `${local.regions.length} selected`})
            </FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {local.regions.map(r => (
                <span key={r} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#7B61FF]/15 border border-[#7B61FF]/25 text-xs text-[#7B61FF] font-mono">
                  {r}
                  <button onClick={() => setLocal(p => ({ ...p, regions: p.regions.filter(x => x !== r) }))} title={`Remove ${r}`}
                    className="hover:text-[#F43F5E] transition-colors"><X size={10} /></button>
                </span>
              ))}
              {local.regions.length === 0 && <span className="text-xs text-[#A0A7B8] italic">All countries enabled</span>}
            </div>
            <div className="flex gap-2">
              <input value={newRegion} onChange={e => setNewRegion(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRegion()}
                placeholder="US" maxLength={2} title="Country code"
                className="w-20 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs p-2 focus:outline-none uppercase" />
              <button onClick={addRegion} className="text-xs px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#7B61FF] hover:bg-[#7B61FF]/15 transition-colors">Add Region</button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel hint="API credentials are hashed and never stored in plaintext">API Credentials</FieldLabel>
              <button onClick={() => setShowCreds(s => !s)} title={showCreds ? 'Hide' : 'Show'} className="text-[#A0A7B8] hover:text-white transition-colors">
                {showCreds ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            </div>
            {showCreds ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/5 p-3">
                <div>
                  <label className="text-[10px] text-[#A0A7B8] block mb-1">API Key</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    placeholder="Leave blank to keep current" title="API key"
                    className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-[#A0A7B8] block mb-1">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                    placeholder="Leave blank to keep current" title="Client secret"
                    className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
                </div>
                <p className="col-span-2 text-[10px] text-[#F59E0B]">⚠ Credentials are transmitted over HTTPS and stored hashed. Never share this screen.</p>
              </div>
            ) : (
              <p className="text-xs text-[#A0A7B8] italic">Credentials hidden — click the lock icon to edit</p>
            )}
          </div>

          {err && <p className="text-xs text-[#F43F5E]">{err}</p>}
          <div className="flex items-center justify-between">
            {saved && <span className="text-xs text-[#22D3A1] flex items-center gap-1"><Check size={11} />Saved</span>}
            <div className="ml-auto">
              <button onClick={handleSave} disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B61FF] hover:bg-[#6B51EF] text-white text-xs font-medium transition-colors disabled:opacity-40">
                {saving ? <><RefreshCw size={11} className="animate-spin" />Saving…</> : <><Save size={11} />Save DSP</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function DspConfigTab() {
  const [dsps, setDsps] = useState<DspConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDsps(await getDspConfigs()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveDsp(dspId: string, data: Partial<DspConfig> & { apiKey?: string; clientSecret?: string }) {
    const updated = await updateDspConfig(dspId, data);
    setDsps(prev => prev.map(d => d.id === dspId ? updated : d));
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-white">DSP Platforms</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Click a platform to expand and configure credentials, sync schedule, and regional availability</p>
        </div>
        <span className="text-xs text-[#A0A7B8]">{dsps.filter(d => d.enabled).length} of {dsps.length} enabled</span>
      </div>
      {dsps.map(d => (
        <DspCard key={d.id} dsp={d} onSave={(data) => handleSaveDsp(d.id, data)} />
      ))}
    </div>
  );
}

// ── Tab 3: Email & Notifications ──────────────────────────────────────────────
const TEMPLATE_LABELS: Record<string, string> = {
  welcome: 'Welcome Email',
  releaseApproved: 'Release Approved',
  releaseRejected: 'Release Rejected',
  payoutProcessed: 'Payout Processed',
  alertCritical: 'Critical Alert',
};
const NOTIF_RULE_LABELS: Record<string, string> = {
  releaseApproved: 'Release Approved',
  releaseRejected: 'Release Rejected',
  payoutProcessed: 'Payout Processed',
  errorThreshold: 'Error Threshold Crossed',
  revenueAnomaly: 'Revenue Anomaly Detected',
};

function EmailConfigTab() {
  const [cfg, setCfg] = useState<EmailConfig | null>(null);
  const [orig, setOrig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [expandedTpl, setExpandedTpl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const c = await getEmailConfig(); setCfg(c); setOrig(c); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(cfg) !== JSON.stringify(orig);

  async function save() {
    if (!cfg) return;
    setSaving(true); setErr('');
    try { const c = await updateEmailConfig(cfg); setCfg(c); setOrig(c); setSaved(true); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner />;
  if (!cfg) return null;

  return (
    <div className="space-y-5">
      {err && <ErrorBanner message={err} />}

      {/* Email Templates */}
      <Card className="p-5">
        <SectionHeader icon={Mail} title="Email Templates" sub="Customize subjects and enable/disable per-event emails" />
        <div className="space-y-2">
          {Object.entries(cfg.templates).map(([key, tpl]) => (
            <div key={key} className="rounded-lg border border-[#7B61FF]/15 overflow-hidden">
              <button onClick={() => setExpandedTpl(expandedTpl === key ? null : key)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#7B61FF]/5 transition-colors text-left">
                <span className="flex-1 text-sm text-[#E2E8F0]">{TEMPLATE_LABELS[key] || key}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tpl.enabled ? 'bg-[#22D3A1]/15 text-[#22D3A1]' : 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                  {tpl.enabled ? 'Active' : 'Disabled'}
                </span>
                {expandedTpl === key ? <ChevronDown size={14} className="text-[#A0A7B8]" /> : <ChevronRight size={14} className="text-[#A0A7B8]" />}
              </button>
              {expandedTpl === key && (
                <div className="border-t border-[#7B61FF]/15 px-4 py-3 space-y-3 bg-[#0B0F1A]">
                  <div>
                    <label className="text-xs text-[#A0A7B8] block mb-1">Email Subject</label>
                    <TextInput value={tpl.subject} onChange={v => setCfg(p => p ? { ...p, templates: { ...p.templates, [key]: { ...tpl, subject: v } } } : p)}
                      title="Email subject" placeholder="Subject line" />
                  </div>
                  <ToggleRow label="Enable this template" checked={tpl.enabled}
                    onChange={v => setCfg(p => p ? { ...p, templates: { ...p.templates, [key]: { ...tpl, enabled: v } } } : p)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Notification Rules */}
      <Card className="p-5">
        <SectionHeader icon={Bell} title="Notification Rules" sub="Who receives email notifications for platform events" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[360px]">
            <thead>
              <tr className="border-b border-[#7B61FF]/15">
                <th className="text-left py-2 text-[#A0A7B8] font-medium pr-4">Event</th>
                <th className="text-center py-2 text-[#A0A7B8] font-medium px-3">Admin Email</th>
                <th className="text-center py-2 text-[#A0A7B8] font-medium px-3">Artist Email</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cfg.notificationRules).map(([key, rule]) => (
                <tr key={key} className="border-b border-[#7B61FF]/10">
                  <td className="py-3 pr-4 text-[#E2E8F0]">{NOTIF_RULE_LABELS[key] || key}</td>
                  <td className="py-3 px-3 text-center">
                    <Toggle checked={rule.adminEmail} label={`Admin email for ${key}`}
                      onChange={v => setCfg(p => p ? { ...p, notificationRules: { ...p.notificationRules, [key]: { ...rule, adminEmail: v } } } : p)} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Toggle checked={rule.artistEmail} label={`Artist email for ${key}`}
                      onChange={v => setCfg(p => p ? { ...p, notificationRules: { ...p.notificationRules, [key]: { ...rule, artistEmail: v } } } : p)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SMS / Push */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHeader icon={Bell} title="SMS Notifications" />
          <div className="space-y-4">
            <ToggleRow label="Enable SMS" hint="Requires Twilio or similar provider" checked={cfg.sms.enabled}
              onChange={v => setCfg(p => p ? { ...p, sms: { ...p.sms, enabled: v } } : p)} />
            <div className={`space-y-3 transition-opacity ${cfg.sms.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
              <div>
                <label className="text-xs text-[#A0A7B8] block mb-1">Provider</label>
                <SelectInput value={cfg.sms.provider} onChange={v => setCfg(p => p ? { ...p, sms: { ...p.sms, provider: v } } : p)}
                  options={[{ value: 'twilio', label: 'Twilio' }, { value: 'vonage', label: 'Vonage' }, { value: 'aws_sns', label: 'AWS SNS' }]}
                  title="SMS provider" className="w-full" />
              </div>
              <div>
                <label className="text-xs text-[#A0A7B8] block mb-1">From Number</label>
                <TextInput value={cfg.sms.fromNumber} onChange={v => setCfg(p => p ? { ...p, sms: { ...p.sms, fromNumber: v } } : p)}
                  placeholder="+1234567890" title="SMS from number" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader icon={Cpu} title="Push Notifications" />
          <div className="space-y-4">
            <ToggleRow label="Enable Push" hint="Requires Firebase or APNs credentials" checked={cfg.push.enabled}
              onChange={v => setCfg(p => p ? { ...p, push: { ...p.push, enabled: v } } : p)} />
            <div className={`transition-opacity ${cfg.push.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
              <label className="text-xs text-[#A0A7B8] block mb-1">Provider</label>
              <SelectInput value={cfg.push.provider} onChange={v => setCfg(p => p ? { ...p, push: { ...p.push, provider: v } } : p)}
                options={[{ value: 'firebase', label: 'Firebase FCM' }, { value: 'apns', label: 'Apple APNs' }, { value: 'onesignal', label: 'OneSignal' }]}
                title="Push provider" className="w-full" />
            </div>
          </div>
        </Card>
      </div>

      {/* Alert Thresholds */}
      <Card className="p-5">
        <SectionHeader icon={AlertTriangle} title="Alert Thresholds" sub="Conditions that trigger admin notifications" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel hint="Errors per hour before triggering an alert">Error Count / Hour</FieldLabel>
            <NumberInput value={cfg.alertThresholds.errorCountPerHour} min={1} title="Error count threshold"
              onChange={v => setCfg(p => p ? { ...p, alertThresholds: { ...p.alertThresholds, errorCountPerHour: v } } : p)} />
          </div>
          <div>
            <FieldLabel hint="% change from rolling average that triggers a revenue anomaly alert">Revenue Anomaly (%)</FieldLabel>
            <NumberInput value={cfg.alertThresholds.revenueAnomalyPercentage} min={1} max={100} title="Revenue anomaly percentage"
              onChange={v => setCfg(p => p ? { ...p, alertThresholds: { ...p.alertThresholds, revenueAnomalyPercentage: v } } : p)} />
          </div>
          <div>
            <FieldLabel hint="Number of consecutive failed payout attempts before alerting">Failed Payouts (count)</FieldLabel>
            <NumberInput value={cfg.alertThresholds.failedPayoutsCount} min={1} title="Failed payouts threshold"
              onChange={v => setCfg(p => p ? { ...p, alertThresholds: { ...p.alertThresholds, failedPayoutsCount: v } } : p)} />
          </div>
        </div>
      </Card>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onReset={() => { setCfg(orig); setSaved(false); }} />
    </div>
  );
}

// ── Tab 4: Feature Flags ──────────────────────────────────────────────────────
function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmKillAll, setConfirmKillAll] = useState(false);
  const [killingAll, setKillingAll] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setFlags(await getFeatureFlags()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag(flag: FeatureFlag, enabled: boolean) {
    setSaving(flag.id);
    try {
      const updated = await updateFeatureFlag(flag.id, { enabled });
      setFlags(prev => prev.map(f => f.id === flag.id ? updated : f));
    } finally { setSaving(null); }
  }

  async function updateRollout(flag: FeatureFlag, pct: number) {
    setSaving(flag.id);
    try {
      const updated = await updateFeatureFlag(flag.id, { rolloutPercent: pct, enabled: pct > 0 });
      setFlags(prev => prev.map(f => f.id === flag.id ? updated : f));
    } finally { setSaving(null); }
  }

  async function killAll() {
    setKillingAll(true);
    try { const updated = await emergencyDisableAllFlags(); setFlags(updated); }
    finally { setKillingAll(false); }
  }

  const cats = ['all', ...Array.from(new Set(flags.map(f => f.category)))];
  const filtered = filterCat === 'all' ? flags : flags.filter(f => f.category === filterCat);
  const activeCount = flags.filter(f => f.enabled).length;

  return (
    <div className="space-y-5">
      <ConfirmModal open={confirmKillAll} title="Emergency Disable All Flags"
        message="This will immediately disable every feature flag, including features already rolled out to 100% of users. This is irreversible without manual re-enabling."
        danger confirmLabel="Disable All Flags" requireText="DISABLE ALL"
        onConfirm={killAll} onClose={() => setConfirmKillAll(false)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Feature Flags</h3>
          <p className="text-xs text-[#A0A7B8] mt-0.5">{activeCount} of {flags.length} features active</p>
        </div>
        <div className="flex items-center gap-3">
          <SelectInput value={filterCat} onChange={setFilterCat}
            options={cats.map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1) }))}
            title="Filter by category" className="text-xs" />
          <button onClick={() => setConfirmKillAll(true)} disabled={killingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] hover:bg-[#F43F5E]/25 text-xs font-bold transition-colors disabled:opacity-50">
            <SquareX size={14} />Emergency Disable All
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {filtered.map(flag => (
            <Card key={flag.id} className={`p-4 transition-opacity ${flag.enabled ? '' : 'opacity-75'}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-white">{flag.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${FLAG_CAT_CLS[flag.category] ?? 'bg-[#A0A7B8]/15 text-[#A0A7B8]'}`}>
                      {flag.category}
                    </span>
                    {flag.updatedAt && (
                      <span className="text-[10px] text-[#A0A7B8]">Updated {new Date(flag.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#A0A7B8]">{flag.description}</p>
                  <p className="text-[10px] text-[#A0A7B8] font-mono mt-1">{flag.id}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-[#A0A7B8] mb-1">Rollout</p>
                    <span className={`text-sm font-bold ${flag.rolloutPercent === 100 ? 'text-[#22D3A1]' : flag.rolloutPercent > 0 ? 'text-[#F59E0B]' : 'text-[#A0A7B8]'}`}>
                      {flag.rolloutPercent}%
                    </span>
                  </div>
                  <Toggle checked={flag.enabled} onChange={v => toggleFlag(flag, v)} label={flag.name}
                    disabled={saving === flag.id} />
                </div>
              </div>
              {flag.enabled && (
                <div className="mt-3 pt-3 border-t border-[#7B61FF]/15">
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] text-[#A0A7B8] whitespace-nowrap">Gradual Rollout</label>
                    <input type="range" min={0} max={100} step={5} value={flag.rolloutPercent}
                      title={`${flag.name} rollout percentage`}
                      onChange={e => updateRollout(flag, Number(e.target.value))}
                      disabled={saving === flag.id}
                      className="flex-1 accent-[#7B61FF] disabled:opacity-40" />
                    <span className="text-xs text-[#A0A7B8] w-10 text-right">{flag.rolloutPercent}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#A0A7B8] mt-0.5">
                    <span>0% — disabled</span>
                    <span>50% — A/B test</span>
                    <span>100% — all users</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Maintenance Mode ───────────────────────────────────────────────────
function MaintenanceModeTab() {
  const [cfg, setCfg] = useState<MaintenanceConfig | null>(null);
  const [orig, setOrig] = useState<MaintenanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [err, setErr] = useState('');
  const [confirmMaint, setConfirmMaint] = useState<'enable' | 'disable' | null>(null);
  const [newSystem, setNewSystem] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const c = await getMaintenanceConfig(); setCfg(c); setOrig(c); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(cfg) !== JSON.stringify(orig);

  async function save(overrideEnabled?: boolean) {
    if (!cfg) return;
    setSaving(true); setErr('');
    try {
      const payload = overrideEnabled !== undefined ? { ...cfg, enabled: overrideEnabled } : cfg;
      const c = await updateMaintenanceConfig(payload);
      setCfg(c); setOrig(c); setSaved(true);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Save failed');
    } finally { setSaving(false); }
  }

  async function triggerBackup() {
    setBackingUp(true); setErr('');
    try {
      await triggerManualBackup();
      await load();
      setBackupDone(true);
      setTimeout(() => setBackupDone(false), 5000);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Backup failed');
    } finally { setBackingUp(false); }
  }

  function addSystem() {
    const s = newSystem.trim();
    if (!s || !cfg || cfg.affectedSystems.includes(s)) return;
    setCfg(p => p ? { ...p, affectedSystems: [...p.affectedSystems, s] } : p);
    setNewSystem('');
  }

  if (loading) return <Spinner />;
  if (!cfg) return null;

  const scheduledStart = cfg.scheduledStart ? new Date(cfg.scheduledStart) : null;
  const scheduledEnd = cfg.scheduledEnd ? new Date(cfg.scheduledEnd) : null;
  const isScheduled = scheduledStart && scheduledStart > new Date();
  const msUntil = isScheduled ? scheduledStart!.getTime() - Date.now() : 0;
  const hrsUntil = Math.floor(msUntil / 3600000);
  const minsUntil = Math.floor((msUntil % 3600000) / 60000);

  return (
    <div className="space-y-5">
      {confirmMaint && (
        <ConfirmModal
          open
          title={confirmMaint === 'enable' ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode'}
          message={confirmMaint === 'enable'
            ? 'All platform users will be blocked from accessing the app. Admin panel access is preserved. Proceed?'
            : 'Maintenance mode will be lifted and users will regain access immediately. Proceed?'
          }
          danger={confirmMaint === 'enable'}
          confirmLabel={confirmMaint === 'enable' ? 'Enable Maintenance' : 'Restore Access'}
          requireText={confirmMaint === 'enable' ? 'MAINTENANCE' : undefined}
          onConfirm={() => save(confirmMaint === 'enable')}
          onClose={() => setConfirmMaint(null)} />
      )}

      {err && <ErrorBanner message={err} />}

      {/* Live Status */}
      <Card className={`p-5 border-2 ${cfg.enabled ? 'border-[#F43F5E]/50 bg-[#F43F5E]/5' : 'border-[#22D3A1]/30'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${cfg.enabled ? 'bg-[#F43F5E]/20' : 'bg-[#22D3A1]/20'}`}>
              {cfg.enabled ? <ServerOff size={24} className="text-[#F43F5E]" /> : <Server size={24} className="text-[#22D3A1]" />}
            </div>
            <div>
              <h3 className={`text-base font-bold ${cfg.enabled ? 'text-[#F43F5E]' : 'text-[#22D3A1]'}`}>
                {cfg.enabled ? '⚠ Maintenance Mode ACTIVE' : 'Platform Operational'}
              </h3>
              <p className="text-xs text-[#A0A7B8] mt-0.5">
                {cfg.enabled ? 'Users are currently blocked from accessing the platform' : 'All systems are running normally'}
              </p>
              {isScheduled && (
                <p className="text-xs text-[#F59E0B] mt-0.5">
                  Scheduled in {hrsUntil}h {minsUntil}m
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setConfirmMaint(cfg.enabled ? 'disable' : 'enable')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors ${cfg.enabled ? 'bg-[#22D3A1] hover:bg-[#1AB08B] text-[#0B0F1A]' : 'bg-[#F43F5E] hover:bg-[#E03354] text-white'}`}>
            <Power size={16} />
            {cfg.enabled ? 'Restore Platform' : 'Enable Maintenance'}
          </button>
        </div>
      </Card>

      {/* Schedule */}
      <Card className="p-5">
        <SectionHeader icon={Clock} title="Scheduled Maintenance" sub="Pre-announce downtime windows — users see a countdown" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Scheduled Start</FieldLabel>
            <input type="datetime-local" title="Scheduled start" aria-label="Scheduled start time"
              value={cfg.scheduledStart ? cfg.scheduledStart.slice(0, 16) : ''}
              onChange={e => setCfg(p => p ? { ...p, scheduledStart: e.target.value ? new Date(e.target.value).toISOString() : null } : p)}
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <FieldLabel>Scheduled End</FieldLabel>
            <input type="datetime-local" title="Scheduled end" aria-label="Scheduled end time"
              value={cfg.scheduledEnd ? cfg.scheduledEnd.slice(0, 16) : ''}
              onChange={e => setCfg(p => p ? { ...p, scheduledEnd: e.target.value ? new Date(e.target.value).toISOString() : null } : p)}
              className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none" />
          </div>
        </div>
        {scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart && (
          <p className="text-xs text-[#F43F5E] mt-2">End time must be after start time</p>
        )}
        {isScheduled && scheduledEnd && (
          <div className="mt-3 p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/25">
            <p className="text-xs text-[#F59E0B]">
              Maintenance window: {scheduledStart!.toLocaleString()} → {scheduledEnd.toLocaleString()}
              {' '}({Math.round((scheduledEnd.getTime() - scheduledStart!.getTime()) / 60000)} mins)
            </p>
          </div>
        )}
      </Card>

      {/* Message & Systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHeader icon={Bell} title="User-Facing Message" sub="Shown to users during maintenance" />
          <textarea value={cfg.message} title="Maintenance message"
            onChange={e => setCfg(p => p ? { ...p, message: e.target.value } : p)}
            rows={4} placeholder="We are performing scheduled maintenance…"
            className="w-full rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-sm px-3 py-2 focus:outline-none focus:border-[#7B61FF]/60 resize-none" />
        </Card>

        <Card className="p-5">
          <SectionHeader icon={Activity} title="Affected Systems" sub="Label which systems are impacted" />
          <div className="flex flex-wrap gap-2 mb-3">
            {cfg.affectedSystems.map(s => (
              <span key={s} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#F43F5E]/25 bg-[#F43F5E]/10 text-xs text-[#F43F5E]">
                {s}
                <button onClick={() => setCfg(p => p ? { ...p, affectedSystems: p.affectedSystems.filter(x => x !== s) } : p)}
                  title={`Remove ${s}`} className="hover:text-white transition-colors"><X size={10} /></button>
              </span>
            ))}
            {cfg.affectedSystems.length === 0 && <span className="text-xs text-[#A0A7B8] italic">No systems specified</span>}
          </div>
          <div className="flex gap-2">
            <input value={newSystem} onChange={e => setNewSystem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSystem()}
              placeholder="e.g. distribution, payouts" title="Affected system"
              className="flex-1 rounded-lg border border-[#7B61FF]/25 bg-[#0B0F1A] text-[#E2E8F0] text-xs p-2 focus:outline-none" />
            <button onClick={addSystem} className="px-3 py-1.5 rounded-lg border border-[#7B61FF]/25 text-[#7B61FF] hover:bg-[#7B61FF]/15 text-xs font-medium transition-colors">Add</button>
          </div>
        </Card>
      </div>

      {/* Data Backup */}
      <Card className="p-5">
        <SectionHeader icon={Database} title="Data Backup" sub="Manual backup triggers for critical data" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-[#A0A7B8]">
            {cfg.lastBackupAt
              ? <>Last backup: <span className="text-[#E2E8F0] font-medium">{new Date(cfg.lastBackupAt).toLocaleString()}</span> by <span className="text-[#7B61FF]">{cfg.lastBackupBy}</span></>
              : 'No backup record found'
            }
          </div>
          <div className="flex items-center gap-3">
            {backupDone && <span className="text-xs text-[#22D3A1] flex items-center gap-1"><Check size={12} />Backup initiated</span>}
            <button onClick={triggerBackup} disabled={backingUp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#7B61FF]/30 bg-[#7B61FF]/10 text-[#7B61FF] hover:bg-[#7B61FF]/20 text-sm font-semibold transition-colors disabled:opacity-50">
              {backingUp ? <><RefreshCw size={14} className="animate-spin" />Initiating…</> : <><Database size={14} />Trigger Backup</>}
            </button>
          </div>
        </div>
        <p className="text-xs text-[#A0A7B8] mt-3">Manual backups capture the current state of the KV store and user data. Automated daily backups run at 02:00 UTC.</p>
      </Card>

      <SaveBar dirty={dirty} saving={saving} saved={saved} onSave={save} onReset={() => { setCfg(orig); setSaved(false); }} />
    </div>
  );
}

// ── Shared micro-components ───────────────────────────────────────────────────
function Spinner() {
  return <div className="flex justify-center py-14"><div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" /></div>;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/8 px-4 py-3 text-sm text-[#F43F5E]">
      <AlertTriangle size={14} className="flex-shrink-0" />{message}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type TabKey = 'platform' | 'dsps' | 'email' | 'flags' | 'maintenance';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'platform',    label: 'Platform Settings',   icon: Settings },
  { key: 'dsps',        label: 'DSP Configuration',   icon: Globe },
  { key: 'email',       label: 'Email & Notifications', icon: Mail },
  { key: 'flags',       label: 'Feature Flags',        icon: Zap },
  { key: 'maintenance', label: 'Maintenance',          icon: Wrench },
];

export function SystemConfigPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('platform');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">System Configuration</h1>
          <p className="text-xs text-[#A0A7B8] mt-0.5">Platform-wide settings, DSP integrations, notifications, feature flags, and maintenance controls</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#7B61FF]/20 bg-[#121826]">
          <Cpu size={14} className="text-[#7B61FF]" />
          <span className="text-xs text-[#A0A7B8]">System Config</span>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap rounded-xl border border-[#7B61FF]/20 bg-[#121826] p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-[#7B61FF] text-white' : 'text-[#A0A7B8] hover:text-white hover:bg-[#7B61FF]/15'}`}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'platform'    && <PlatformSettingsTab />}
      {activeTab === 'dsps'        && <DspConfigTab />}
      {activeTab === 'email'       && <EmailConfigTab />}
      {activeTab === 'flags'       && <FeatureFlagsTab />}
      {activeTab === 'maintenance' && <MaintenanceModeTab />}
    </div>
  );
}
