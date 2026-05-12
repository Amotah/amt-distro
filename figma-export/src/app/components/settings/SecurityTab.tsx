import { useState, useEffect } from 'react';
import {
  Lock, Eye, EyeOff, ShieldCheck, ShieldOff, Loader2, AlertCircle,
  Check, Smartphone, Mail, Monitor, Trash2, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../../../utils/supabase/client';
import { TwoFactorSetup } from '../TwoFactorSetup';

// --- password strength ---
function calcStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_COLOR = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'];
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];

interface LoginSession {
  id: string;
  created_at: string;
  user_agent?: string;
  ip?: string;
}

interface MfaFactor {
  id: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  friendly_name?: string;
}

export function SecurityTab() {
  // Password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  const strength = calcStrength(pwForm.newPw);

  // Load MFA factors
  const loadMfa = async () => {
    setMfaLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaFactors((data?.all ?? []) as MfaFactor[]);
    } catch { /* ignore */ }
    finally { setMfaLoading(false); }
  };

  useEffect(() => { void loadMfa(); }, []);

  // Load sessions (current session only via getSession — Supabase doesn't expose all sessions on client)
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessions([{
          id: data.session.access_token.slice(-8),
          created_at: new Date(data.session.expires_at! * 1000 - 3600_000).toISOString(),
          user_agent: navigator.userAgent,
          ip: 'Current device',
        }]);
      }
    } finally { setSessionsLoading(false); }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    if (strength < 2) { setPwError('Password is too weak.'); return; }
    setPwSaving(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No email found.');
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
      if (signInErr) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) throw error;
      setPwDone(true);
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwDone(false), 4000);
    } catch (e: any) {
      setPwError(e.message ?? 'Failed to change password.');
    } finally { setPwSaving(false); }
  };

  const handleUnenroll = async (factorId: string) => {
    setUnenrolling(factorId);
    try {
      await supabase.auth.mfa.unenroll({ factorId });
      await loadMfa();
    } catch (e: any) {
      alert(e.message ?? 'Failed to remove 2FA method.');
    } finally { setUnenrolling(null); }
  };

  const verifiedFactors = mfaFactors.filter((f) => f.status === 'verified');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Account Security</h2>
        <p className="text-sm text-[#555] mt-0.5">Manage your password, two-factor authentication, and active sessions</p>
      </div>

      {/* ── Password ── */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Change Password</p>
            <p className="text-xs text-[#555]">Use a strong, unique password</p>
          </div>
        </div>

        {pwError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <p>{pwError}</p>
          </div>
        )}
        {pwDone && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Password changed successfully.
          </div>
        )}

        {[
          { field: 'current', label: 'Current Password', key: 'current' as const },
          { field: 'newPw', label: 'New Password', key: 'newPw' as const },
          { field: 'confirm', label: 'Confirm New Password', key: 'confirm' as const },
        ].map(({ field, label, key }) => (
          <div key={field} className="space-y-1.5">
            <Label className="text-[#B3B3B3] text-sm">{label}</Label>
            <div className="relative">
              <Input
                type={showPw[key] ? 'text' : 'password'}
                value={pwForm[key]}
                onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                className="h-10 pr-10 bg-[#0d0d0d] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60"
              />
              <button type="button" onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#B3B3B3]">
                {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {field === 'newPw' && pwForm.newPw && (
              <>
                <div className="flex gap-1 mt-1.5">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < strength ? STRENGTH_COLOR[strength] : 'bg-[#222]'}`} />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#555] font-medium">{STRENGTH_LABEL[strength]}</span>
                  <div className="flex gap-3 text-[10px] text-[#444]">
                    {[
                      { ok: pwForm.newPw.length >= 8, t: '8+ chars' },
                      { ok: /[A-Z]/.test(pwForm.newPw), t: 'Uppercase' },
                      { ok: /[0-9]/.test(pwForm.newPw), t: 'Number' },
                      { ok: /[^A-Za-z0-9]/.test(pwForm.newPw), t: 'Symbol' },
                    ].map(({ ok, t }) => (
                      <span key={t} className={ok ? 'text-emerald-400' : 'text-[#444]'}>{ok ? '✓' : '○'} {t}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        <Button onClick={handlePasswordChange} disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
          className="h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold px-6 disabled:opacity-40">
          {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
        </Button>
      </section>

      {/* ── 2FA ── */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${verifiedFactors.length ? 'bg-emerald-500/15' : 'bg-[#222]'}`}>
              {verifiedFactors.length ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldOff className="w-4 h-4 text-[#555]" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
              <p className="text-xs text-[#555]">
                {mfaLoading ? 'Loading…' : verifiedFactors.length ? `${verifiedFactors.length} method${verifiedFactors.length > 1 ? 's' : ''} active` : 'Not enabled — your account is less secure'}
              </p>
            </div>
          </div>
          {!mfaLoading && verifiedFactors.length === 0 && !showSetup && (
            <Button size="sm" onClick={() => setShowSetup(true)}
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4">
              Enable 2FA
            </Button>
          )}
        </div>

        {showSetup && (
          <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-5">
            <TwoFactorSetup
              onComplete={() => { setShowSetup(false); void loadMfa(); }}
              onSkip={() => setShowSetup(false)}
            />
          </div>
        )}

        {verifiedFactors.length > 0 && (
          <div className="space-y-2">
            {verifiedFactors.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                <div className="flex items-center gap-3">
                  {f.factor_type === 'totp' ? <Smartphone className="w-4 h-4 text-[#B3B3B3]" /> : <Mail className="w-4 h-4 text-[#B3B3B3]" />}
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{f.factor_type === 'totp' ? 'Authenticator App' : 'Email OTP'}</p>
                    <p className="text-xs text-[#555]">Enabled {new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={unenrolling === f.id}
                  onClick={() => { if (confirm('Remove this 2FA method?')) handleUnenroll(f.id); }}
                  className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                  {unenrolling === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" /> Remove</>}
                </Button>
              </div>
            ))}
            {!showSetup && (
              <Button size="sm" variant="outline" onClick={() => setShowSetup(true)}
                className="h-8 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
                <Plus className="w-3 h-3 mr-1.5" /> Add another method
              </Button>
            )}
          </div>
        )}
      </section>

      {/* ── Sessions ── */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <button type="button" onClick={() => { setShowSessions(!showSessions); if (!showSessions) loadSessions(); }}
          className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Active Sessions</p>
              <p className="text-xs text-[#555]">Devices currently signed in to your account</p>
            </div>
          </div>
          {showSessions ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
        </button>

        {showSessions && (
          <div className="space-y-2 pt-1">
            {sessionsLoading ? (
              <div className="flex items-center gap-2 text-[#555] text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-[#555]">No active sessions found.</p>
            ) : sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">Current Session</p>
                  <p className="text-xs text-[#555] truncate max-w-xs">{s.user_agent?.split(' ').slice(-2).join(' ')}</p>
                  <p className="text-[10px] text-[#444]">Started {new Date(s.created_at).toLocaleString()}</p>
                </div>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2.5 py-1 font-medium">Active</span>
              </div>
            ))}

            <Button size="sm" variant="outline" onClick={async () => {
              if (confirm('Sign out of all other sessions?')) {
                await supabase.auth.signOut({ scope: 'others' });
                await loadSessions();
              }
            }} className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
              <RotateCcw className="w-3 h-3 mr-1.5" /> Sign out other sessions
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

// small helper used inside SecurityTab
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
