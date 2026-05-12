import { useState, useEffect } from 'react';
import {
  Key, Copy, Trash2, Plus, Check, Loader2, AlertCircle, RefreshCw, ExternalLink,
  Globe, Webhook,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../../../utils/supabase/client';

interface ApiKey {
  id: string;
  label: string;
  keyPreview: string;
  fullKey?: string;
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

const API_KEY_STORE = 'amt-api-keys';

function loadKeys(): ApiKey[] {
  try { return JSON.parse(localStorage.getItem(API_KEY_STORE) ?? '[]'); } catch { return []; }
}
function saveKeys(keys: ApiKey[]) {
  localStorage.setItem(API_KEY_STORE, JSON.stringify(keys));
}

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return 'amt_' + Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function IntegrationsTab() {
  const [keys, setKeys] = useState<ApiKey[]>(loadKeys);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleCreateKey = async () => {
    if (!newKeyLabel.trim()) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 600));
    const full = generateKey();
    const key: ApiKey = {
      id: crypto.randomUUID(),
      label: newKeyLabel.trim(),
      keyPreview: `${full.slice(0, 12)}…`,
      fullKey: full,
      createdAt: new Date().toISOString(),
      permissions: ['read:releases', 'read:analytics'],
    };
    const next = [...keys, { ...key, fullKey: undefined }];
    saveKeys(next);
    setKeys(next);
    setNewKey(key);
    setNewKeyLabel('');
    setCreating(false);
  };

  const handleRevokeKey = (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const next = keys.filter((k) => k.id !== id);
    saveKeys(next);
    setKeys(next);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.startsWith('http')) { setWebhookResult({ ok: false, msg: 'Enter a valid URL.' }); return; }
    setWebhookTesting(true); setWebhookResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test.ping', source: 'amt-musik', timestamp: new Date().toISOString() }),
      });
      setWebhookResult({ ok: res.ok, msg: res.ok ? `Success (${res.status})` : `Error (${res.status})` });
    } catch (e: any) {
      setWebhookResult({ ok: false, msg: e.message ?? 'Request failed' });
    } finally { setWebhookTesting(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Integrations</h2>
        <p className="text-sm text-[#555] mt-0.5">API access, webhooks, and external connections</p>
      </div>

      {/* DSP Connections (info only) */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">DSP Connections</p>
            <p className="text-xs text-[#555]">External platform links</p>
          </div>
        </div>
        {[
          { name: 'Spotify for Artists', url: 'https://artists.spotify.com', note: 'Claim your profile to access streams and listener data' },
          { name: 'Apple Music for Artists', url: 'https://artists.apple.com', note: 'View in-depth listener trends on Apple Music' },
          { name: 'YouTube Studio', url: 'https://studio.youtube.com', note: 'Manage your YouTube Artist Channel' },
        ].map(({ name, url, note }) => (
          <div key={name} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
            <div>
              <p className="text-sm text-white font-medium">{name}</p>
              <p className="text-xs text-[#555]">{note}</p>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
                Open <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </a>
          </div>
        ))}
      </section>

      {/* API Keys */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
              <Key className="w-4 h-4 text-[#FF6B00]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">API Keys</p>
              <p className="text-xs text-[#555]">Programmatic access to your account data</p>
            </div>
          </div>
          <a href="https://docs.amtmusik.com/api" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-7 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              API Docs <ExternalLink className="w-3 h-3 ml-1.5" />
            </Button>
          </a>
        </div>

        {/* New key shown once after creation */}
        {newKey && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <p className="text-xs text-amber-300 font-medium">Copy your new API key now — it won't be shown again.</p>
            <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg border border-amber-500/20 px-3 py-2">
              <code className="text-xs text-amber-200 flex-1 font-mono break-all">{newKey.fullKey}</code>
              <button type="button" onClick={() => handleCopy(newKey.fullKey!, newKey.id)}
                className="text-amber-400 hover:text-amber-300 flex-shrink-0">
                {copiedId === newKey.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setNewKey(null)}
              className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
              Done — I've saved my key
            </Button>
          </div>
        )}

        {/* Create new key */}
        <div className="flex gap-2">
          <Input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)}
            placeholder="Key label (e.g. My App)"
            className="h-10 bg-[#0d0d0d] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60 text-sm" />
          <Button onClick={handleCreateKey} disabled={creating || !newKeyLabel.trim()}
            className="h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold px-4 text-sm whitespace-nowrap">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1.5" /> Create Key</>}
          </Button>
        </div>

        {keys.length === 0 ? (
          <p className="text-sm text-[#555] py-2">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{k.label}</p>
                  <p className="text-xs text-[#555] font-mono">{k.keyPreview}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">Created {new Date(k.createdAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRevokeKey(k.id)}
                  className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3 mr-1" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Webhook className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Webhooks</p>
            <p className="text-xs text-[#555]">Receive real-time event notifications to your server</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">Webhook Endpoint URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/amt"
              className="h-10 bg-[#0d0d0d] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60 text-sm" />
            <Button onClick={handleTestWebhook} disabled={webhookTesting || !webhookUrl} variant="outline"
              className="h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm whitespace-nowrap">
              {webhookTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1.5" /> Test</>}
            </Button>
          </div>
          {webhookResult && (
            <p className={`text-xs mt-1 ${webhookResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {webhookResult.ok ? <Check className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
              {webhookResult.msg}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[#0d0d0d] border border-white/5 px-4 py-3">
          <p className="text-xs text-[#555] font-medium mb-2">Events delivered:</p>
          <div className="flex flex-wrap gap-1.5">
            {['release.approved', 'release.rejected', 'payout.completed', 'dispute.updated', 'profile.updated'].map((e) => (
              <span key={e} className="text-[10px] font-mono bg-[#1a1a1a] border border-white/8 text-[#B3B3B3] px-2 py-0.5 rounded">{e}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
