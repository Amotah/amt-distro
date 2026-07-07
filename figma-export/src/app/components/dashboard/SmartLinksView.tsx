import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Link2,
  Plus,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Download,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Eye,
  Trash2,
  Edit3,
  Search,
  ArrowLeft,
  Music,
  MousePointerClick,
  Share2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  generateSlug,
  generateShortId,
  validatePlatformUrl,
  createClickEvent,
} from '../../utils/smartLinkAlgorithms';
import {
  loadSmartLinkClickEvents,
  loadSmartLinks,
  saveSmartLinkClickEvents,
  saveSmartLinks,
  type SmartLinkClickStorageRecord,
  type SmartLinkStorageRecord,
} from '../../utils/smart-links-storage';
import { BACKEND_API_BASE_URL } from '../../utils/backend-api-base';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SmartLink = SmartLinkStorageRecord;

/* ------------------------------------------------------------------ */
/*  URL validation helper                                              */
/* ------------------------------------------------------------------ */

function isValidUrl(url: string) {
  if (!url) return true; // empty = not filled in (optional platforms)
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

const streamingPlatforms = [
  { id: 'spotify', name: 'Spotify', required: true },
  { id: 'apple-music', name: 'Apple Music', required: true },
  { id: 'youtube-music', name: 'YouTube Music', required: false },
  { id: 'amazon-music', name: 'Amazon Music', required: false },
  { id: 'deezer', name: 'Deezer', required: false },
  { id: 'tidal', name: 'Tidal', required: false },
  { id: 'soundcloud', name: 'SoundCloud', required: false },
  { id: 'pandora', name: 'Pandora', required: false },
  { id: 'boomplay', name: 'Boomplay', required: false },
  { id: 'audiomack', name: 'Audiomack', required: false },
];

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(n);
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function SmartLinksView() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLabel = location.pathname.startsWith('/label-dashboard');
  const basePath = isLabel ? '/label-dashboard' : '/dashboard';

  /* state ---------------------------------------------------------- */
  const [links, setLinks] = useState<SmartLink[]>(loadSmartLinks);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [search, setSearch] = useState('');
  const [selectedLink, setSelectedLink] = useState<SmartLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState({
    linkTitle: '',
    artistName: '',
    releaseTitle: '',
    customSlug: '',
    enableGeoRouting: true,
    enableDeviceRouting: true,
    platforms: Object.fromEntries(streamingPlatforms.map((p) => [p.id, ''])) as Record<string, string>,
  });

  /* helpers -------------------------------------------------------- */
  const generatedLink = `amtdistro.link/${form.customSlug || 'your-music'}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoSlug = () => {
    const slug = generateSlug(form.releaseTitle || form.linkTitle);
    setForm((f) => ({ ...f, customSlug: slug || generateShortId() }));
  };

  const resetForm = () => {
    setForm({
      linkTitle: '',
      artistName: '',
      releaseTitle: '',
      customSlug: '',
      enableGeoRouting: true,
      enableDeviceRouting: true,
      platforms: Object.fromEntries(streamingPlatforms.map((p) => [p.id, ''])),
    });
    setUrlErrors({});
    setStep(1);
  };

  const handleCreate = () => {
    // Validate required fields
    if (!form.linkTitle.trim() || !form.artistName.trim() || !form.releaseTitle.trim()) return;

    // Validate all entered URLs
    const errors: Record<string, string> = {};
    Object.entries(form.platforms).forEach(([id, url]) => {
      if (url && !isValidUrl(url)) {
        errors[id] = 'Enter a valid URL (https://...)';
      }
    });
    if (Object.keys(errors).length > 0) {
      setUrlErrors(errors);
      return;
    }
    setUrlErrors({});

    const newLink: SmartLink = {
      id: Date.now().toString(),
      title: form.linkTitle.trim(),
      artistName: form.artistName.trim(),
      releaseTitle: form.releaseTitle.trim(),
      slug: form.customSlug.trim() || generateShortId(),
      platforms: Object.fromEntries(Object.entries(form.platforms).filter(([, v]) => v)),
      enableGeoRouting: form.enableGeoRouting,
      enableDeviceRouting: form.enableDeviceRouting,
      clicks: 0,
      countries: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'active',
    };
    const updated = [newLink, ...links];
    setLinks(updated);
    saveSmartLinks(updated);
    setSelectedLink(newLink);
    setStep(3);
  };

  const handleDelete = (id: string) => {
    const updated = links.filter((l) => l.id !== id);
    setLinks(updated);
    saveSmartLinks(updated);
    if (selectedLink?.id === id) {
      setSelectedLink(null);
      setView('list');
    }
  };

  const handleOpenPlatform = async (link: SmartLink, platform: string, url: string) => {
    const clickEvent = createClickEvent(link.id, platform);
    const nextEvent: SmartLinkClickStorageRecord = {
      ...clickEvent,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date(clickEvent.timestamp).toISOString().slice(0, 10),
      linkSlug: link.slug,
    };

    // Update UI and localStorage immediately for optimistic UX
    const existingEvents = loadSmartLinkClickEvents();
    const updatedEvents = [nextEvent, ...existingEvents];
    saveSmartLinkClickEvents(updatedEvents);

    const linkEvents = updatedEvents.filter((event) => event.linkId === link.id);
    const uniqueCountries = new Set(
      linkEvents
        .map((event) => event.country)
        .filter((country): country is string => Boolean(country)),
    ).size;

    const updatedLinks = links.map((entry) => (
      entry.id === link.id
        ? {
            ...entry,
            clicks: entry.clicks + 1,
            countries: uniqueCountries,
          }
        : entry
    ));

    setLinks(updatedLinks);
    saveSmartLinks(updatedLinks);

    if (selectedLink?.id === link.id) {
      const refreshed = updatedLinks.find((entry) => entry.id === link.id) ?? null;
      setSelectedLink(refreshed);
    }

    // Record click event to backend API for global cross-device analytics
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        await fetch(`${BACKEND_API_BASE_URL}/smart-links/click`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            linkId: link.id,
            platform: nextEvent.platform,
            deviceType: nextEvent.device,
            os: nextEvent.os,
            country: nextEvent.country,
            referrer: nextEvent.referrer,
          }),
        });
      }
    } catch (error) {
      // Silently fail - local storage backup already recorded the event
      console.debug('Analytics API call failed (using local storage backup):', error);
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /* QR generation -------------------------------------------------- */
  useEffect(() => {
    const slug = view === 'create' ? form.customSlug : selectedLink?.slug;
    if ((view === 'create' && step === 3) || (view === 'detail' && showQr)) {
      const url = `https://amtdistro.link/${slug}`;
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, {
          width: 220,
          margin: 2,
          color: { dark: '#FF6B00', light: '#161616' },
        });
      }
      QRCode.toDataURL(url, { width: 512, margin: 2 }).then(setQrDataUrl);
    }
  }, [view, step, showQr, form.customSlug, selectedLink]);

  const downloadQr = () => {
    const a = document.createElement('a');
    a.download = `${selectedLink?.slug || form.customSlug || 'smart-link'}-qr.png`;
    a.href = qrDataUrl;
    a.click();
  };

  /* filtered list -------------------------------------------------- */
  const filteredLinks = links.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.releaseTitle.toLowerCase().includes(search.toLowerCase()) ||
      l.slug.toLowerCase().includes(search.toLowerCase()),
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  /* ---------- LIST VIEW ------------------------------------------- */
  if (view === 'list') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Smart Links</h1>
            <p className="text-sm text-[#B3B3B3] mt-1">Create universal links that route fans to your music on every platform</p>
          </div>
          <Button
            className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white gap-2 shrink-0"
            onClick={() => { resetForm(); setView('create'); }}
          >
            <Plus className="w-4 h-4" />
            Create Smart Link
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Links', value: links.length, icon: Link2, color: '#FF6B00' },
            { label: 'Total Clicks', value: links.reduce((s, l) => s + l.clicks, 0), icon: MousePointerClick, color: '#FFD600' },
            { label: 'Active Links', value: links.filter((l) => l.status === 'active').length, icon: Share2, color: '#22C55E' },
            { label: 'Countries Reached', value: new Set(links.flatMap(() => ['NG'])).size + links.reduce((s, l) => s + l.countries, 0), icon: Globe, color: '#3B82F6' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 bg-[#161616] border-[#FF6B00]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-[#B3B3B3]">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{formatNumber(stat.value)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
          <Input
            placeholder="Search smart links…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#161616] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
          />
        </div>

        {/* Links table / cards */}
        <div className="space-y-3">
          {filteredLinks.length === 0 && (
            <Card className="p-12 bg-[#161616] border-[#FF6B00]/10 text-center">
              <Link2 className="w-12 h-12 text-[#B3B3B3] mx-auto mb-4" />
              <p className="text-[#B3B3B3]">No smart links yet. Create your first one!</p>
            </Card>
          )}
          {filteredLinks.map((link) => (
            <Card
              key={link.id}
              className="p-4 bg-[#161616] border-[#FF6B00]/10 hover:border-[#FF6B00]/30 transition-colors cursor-pointer"
              onClick={() => { setSelectedLink(link); setView('detail'); }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon + info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FFD600]/20 border border-[#FF6B00]/20 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{link.title}</p>
                    <p className="text-xs text-[#B3B3B3] truncate">amtdistro.link/{link.slug}</p>
                  </div>
                </div>

                {/* Badges + stats */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <Badge
                    variant="outline"
                    className={link.status === 'active'
                      ? 'border-green-500/30 text-green-400 bg-green-500/10'
                      : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}
                  >
                    {link.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-[#B3B3B3]">
                    <MousePointerClick className="w-4 h-4" />
                    {formatNumber(link.clicks)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#B3B3B3]">
                    <Globe className="w-4 h-4" />
                    {link.countries}
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-[#666]">
                    <Calendar className="w-3.5 h-3.5" />
                    {link.createdAt}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={(e) => { e.stopPropagation(); handleDelete(link.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- CREATE VIEW ----------------------------------------- */
  if (view === 'create') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        {/* Back */}
        <Button variant="ghost" onClick={() => { setView('list'); resetForm(); }} className="text-[#B3B3B3] hover:text-white -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Smart Links
        </Button>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s === step ? 'bg-[#FF6B00] text-white' : s < step ? 'bg-green-500 text-white' : 'bg-[#161616] text-[#B3B3B3] border border-[#333]'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 sm:w-16 ${s < step ? 'bg-green-500' : 'bg-[#333]'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
            <div className="space-y-5">
              <div>
                <Label className="text-[#B3B3B3]">Link Title *</Label>
                <Input
                  placeholder="e.g. Midnight Vibes — All Platforms"
                  value={form.linkTitle}
                  onChange={(e) => setForm((f) => ({ ...f, linkTitle: e.target.value }))}
                  className="mt-2 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-[#B3B3B3]">Artist Name *</Label>
                  <Input
                    placeholder="Your artist name"
                    value={form.artistName}
                    onChange={(e) => setForm((f) => ({ ...f, artistName: e.target.value }))}
                    className="mt-2 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
                  />
                </div>
                <div>
                  <Label className="text-[#B3B3B3]">Release Title *</Label>
                  <Input
                    placeholder="Song or album name"
                    value={form.releaseTitle}
                    onChange={(e) => setForm((f) => ({ ...f, releaseTitle: e.target.value }))}
                    className="mt-2 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#B3B3B3]">Custom Slug *</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-sm">amtdistro.link/</span>
                    <Input
                      placeholder="your-music"
                      value={form.customSlug}
                      onChange={(e) => setForm((f) => ({ ...f, customSlug: e.target.value }))}
                      className="pl-32 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#666]"
                    />
                  </div>
                  <Button variant="outline" onClick={handleAutoSlug} className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 shrink-0">Generate</Button>
                </div>
              </div>

              {/* Routing options */}
              <div className="border-t border-[#FF6B00]/10 pt-5 space-y-3">
                <p className="text-sm font-medium text-white">Smart Routing</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.enableDeviceRouting}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, enableDeviceRouting: v as boolean }))}
                  />
                  <span className="text-sm text-[#B3B3B3]">Device routing (iOS → Apple Music, Android → YouTube Music)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.enableGeoRouting}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, enableGeoRouting: v as boolean }))}
                  />
                  <span className="text-sm text-[#B3B3B3]">Geographic routing based on user location</span>
                </label>
              </div>

              {/* Preview */}
              <div className="bg-[#0A0A0A] border border-[#FF6B00]/20 rounded-lg p-4">
                <p className="text-xs text-[#B3B3B3] mb-1 flex items-center gap-2"><Link2 className="w-4 h-4 text-[#FF6B00]" /> Preview</p>
                <code className="text-sm text-[#FFD600] break-all">https://{generatedLink}</code>
              </div>

              <Button className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white" onClick={() => setStep(2)}>
                Continue to Platforms
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2 — Platform links */}
        {step === 2 && (
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
            <h2 className="text-xl font-bold text-white mb-2">Platform Links</h2>
            <p className="text-sm text-[#B3B3B3] mb-6">Add your release links for each streaming platform.</p>
            <div className="space-y-3">
              {streamingPlatforms.map((platform) => (
                <div key={platform.id} className="bg-[#0A0A0A] border border-[#FF6B00]/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-white text-sm">
                      {platform.name}
                      {platform.required && <span className="text-[#FF6B00] ml-1">*</span>}
                    </Label>
                    {platform.required && (
                      <Badge variant="outline" className="text-[#FF6B00] border-[#FF6B00]/30 bg-[#FF6B00]/10 text-xs">Required</Badge>
                    )}
                  </div>
                  <Input
                    placeholder={`https://${platform.id}.com/your-music`}
                    value={form.platforms[platform.id]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({ ...f, platforms: { ...f.platforms, [platform.id]: val } }));
                      if (urlErrors[platform.id]) {
                        setUrlErrors((prev) => { const n = { ...prev }; delete n[platform.id]; return n; });
                      }
                    }}
                    className={`bg-[#161616] border-[#FF6B00]/15 text-white placeholder:text-[#555] text-sm ${urlErrors[platform.id] ? 'border-red-500/50' : ''}`}
                  />
                  {urlErrors[platform.id] && (
                    <p className="text-xs text-red-400 mt-1">{urlErrors[platform.id]}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-[#FF6B00]/30 text-[#B3B3B3] hover:text-white hover:bg-[#161616]">Back</Button>
              <Button className="flex-1 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white" onClick={handleCreate}>Create Smart Link</Button>
            </div>
          </Card>
        )}

        {/* Step 3 — Success */}
        {step === 3 && selectedLink && (
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Smart Link Created!</h2>
              <p className="text-sm text-[#B3B3B3]">Your universal music link is ready to share</p>
            </div>

            {/* Link + copy */}
            <div className="bg-[#0A0A0A] border border-[#FF6B00]/20 rounded-lg p-4 mb-6">
              <Label className="text-[#B3B3B3] text-xs mb-2 block">Your Smart Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`https://amtdistro.link/${selectedLink.slug}`}
                  className="flex-1 bg-[#161616] border-[#FF6B00]/15 text-[#FFD600] text-sm"
                />
                <Button variant="outline" onClick={() => handleCopy(`https://amtdistro.link/${selectedLink.slug}`)} className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="outline" onClick={() => setShowQr(!showQr)} className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR */}
            {showQr && (
              <div className="bg-[#0A0A0A] border border-[#FF6B00]/20 rounded-lg p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
                <canvas ref={canvasRef} className="rounded-lg border border-[#FF6B00]/20" />
                <div className="text-center sm:text-left">
                  <h3 className="text-white font-medium mb-1">QR Code</h3>
                  <p className="text-xs text-[#B3B3B3] mb-4">Scan to access your smart link instantly</p>
                  <Button variant="outline" onClick={downloadQr} className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Eye, label: 'Clicks', value: '0', color: '#FF6B00' },
                { icon: Link2, label: 'Platforms', value: String(Object.values(selectedLink.platforms).filter(Boolean).length), color: '#3B82F6' },
                { icon: Globe, label: 'Countries', value: '0', color: '#22C55E' },
              ].map((s) => (
                <Card key={s.label} className="p-3 bg-[#0A0A0A] border-[#FF6B00]/10 text-center">
                  <s.icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-[#B3B3B3]">{s.label}</p>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setSelectedLink(null); setView('list'); resetForm(); }}
                className="flex-1 border-[#FF6B00]/30 text-[#B3B3B3] hover:text-white"
              >
                Back to All Links
              </Button>
              <Button
                className="flex-1 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white gap-2"
                onClick={() => { navigate(`${basePath}/smart-links/analytics?link=${encodeURIComponent(selectedLink.id)}`); }}
              >
                <BarChart3 className="w-4 h-4" /> View Analytics
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  /* ---------- DETAIL VIEW ----------------------------------------- */
  if (view === 'detail' && selectedLink) {
    const linkUrl = `https://amtdistro.link/${selectedLink.slug}`;
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back */}
        <Button variant="ghost" onClick={() => { setSelectedLink(null); setView('list'); }} className="text-[#B3B3B3] hover:text-white -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Smart Links
        </Button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedLink.title}</h1>
            <p className="text-sm text-[#B3B3B3] mt-1 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#FF6B00]" />
              <code className="text-[#FFD600]">{linkUrl}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleCopy(linkUrl)} className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
            </Button>
            <Button variant="outline" onClick={() => setShowQr(!showQr)} className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
              <QrCode className="w-4 h-4" /> QR
            </Button>
          </div>
        </div>

        {/* QR popup */}
        {showQr && (
          <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 flex flex-col sm:flex-row items-center gap-6">
            <canvas ref={canvasRef} className="rounded-lg border border-[#FF6B00]/20" />
            <div className="text-center sm:text-left">
              <h3 className="text-white font-medium mb-1">QR Code</h3>
              <p className="text-xs text-[#B3B3B3] mb-3">Scan to open your smart link</p>
              <Button variant="outline" onClick={downloadQr} className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10">
                <Download className="w-4 h-4" /> Download PNG
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Clicks', value: selectedLink.clicks, icon: MousePointerClick, color: '#FF6B00' },
            { label: 'Countries', value: selectedLink.countries, icon: Globe, color: '#3B82F6' },
            { label: 'Platforms', value: Object.keys(selectedLink.platforms).length, icon: Share2, color: '#22C55E' },
            { label: 'Status', value: selectedLink.status, icon: TrendingUp, color: selectedLink.status === 'active' ? '#22C55E' : '#EAB308' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 bg-[#161616] border-[#FF6B00]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-[#B3B3B3]">{stat.label}</p>
                  <p className="text-lg font-bold text-white capitalize">{typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Platform links */}
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <h3 className="text-lg font-bold text-white mb-4">Platform Links</h3>
          <div className="space-y-3">
            {Object.entries(selectedLink.platforms).map(([platform, url]) => (
              <div key={platform} className="flex items-center justify-between bg-[#0A0A0A] rounded-lg p-3 border border-[#FF6B00]/10">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white capitalize">{platform.replace('-', ' ')}</p>
                  <p className="text-xs text-[#666] truncate">{url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPlatform(selectedLink, platform, url)}
                  className="text-[#FF6B00] hover:text-[#FFD600] shrink-0 ml-2"
                  title={`Open ${platform.replace('-', ' ')}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <h3 className="text-lg font-bold text-white mb-4">Routing Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-[#B3B3B3]" />
              <span className="text-sm text-[#B3B3B3]">Device Routing</span>
              <Badge variant="outline" className={selectedLink.enableDeviceRouting ? 'border-green-500/30 text-green-400 bg-green-500/10 ml-auto' : 'border-red-500/30 text-red-400 bg-red-500/10 ml-auto'}>
                {selectedLink.enableDeviceRouting ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#B3B3B3]" />
              <span className="text-sm text-[#B3B3B3]">Geographic Routing</span>
              <Badge variant="outline" className={selectedLink.enableGeoRouting ? 'border-green-500/30 text-green-400 bg-green-500/10 ml-auto' : 'border-red-500/30 text-red-400 bg-red-500/10 ml-auto'}>
                {selectedLink.enableGeoRouting ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="p-6 bg-[#161616] border-red-500/20">
          <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-[#B3B3B3] mb-4">Deleting this link will permanently remove it and break any shared URLs.</p>
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => handleDelete(selectedLink.id)}>
            <Trash2 className="w-4 h-4" /> Delete Smart Link
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}
