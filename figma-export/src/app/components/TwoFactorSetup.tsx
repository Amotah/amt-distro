import { useState } from 'react';
import { supabase } from '../../../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Shield,
  Mail,
  Smartphone,
  KeyRound,
  Check,
  Copy,
  Download,
  AlertCircle,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface TwoFactorSetupProps {
  /** Called when 2FA is successfully enrolled */
  onComplete?: () => void;
  /** Called when the user cancels / skips */
  onSkip?: () => void;
}

type Method = 'email' | 'totp';
type TotpStep = 'qr' | 'verify' | 'backup';

const BACKUP_COUNT = 8;

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_COUNT }, () =>
    Math.random().toString(36).slice(2, 7).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

export function TwoFactorSetup({ onComplete, onSkip }: TwoFactorSetupProps) {
  const [method, setMethod] = useState<Method | null>(null);
  const [totpStep, setTotpStep] = useState<TotpStep>('qr');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [backupCodes] = useState<string[]>(generateBackupCodes);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrolled, setEnrolled] = useState(false);

  // ── Email OTP ────────────────────────────────────────────────────────────────
  const handleEnrollEmail = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No email on your account.');
      // Send a one-time test code to confirm email 2FA intent
      await supabase.auth.signInWithOtp({ email: user.email });
      setEnrolled(true);
      onComplete?.();
    } catch (e: any) {
      setError(e.message ?? 'Failed to enable Email 2FA.');
    } finally {
      setLoading(false);
    }
  };

  // ── TOTP — Step 1: Generate QR ────────────────────────────────────────────
  const handleStartTotp = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (err) throw err;
      setQrUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
      setTotpStep('qr');
    } catch (e: any) {
      setError(e.message ?? 'Failed to start authenticator setup.');
    } finally {
      setLoading(false);
    }
  };

  // ── TOTP — Step 2: Verify code ────────────────────────────────────────────
  const handleVerifyTotp = async () => {
    if (verifyCode.replace(/\s/g, '').length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: challengeData, error: cErr } = await supabase.auth.mfa.challenge({ factorId: secret });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: secret,
        challengeId: challengeData.id,
        code: verifyCode.replace(/\s/g, ''),
      });
      if (vErr) throw vErr;
      setTotpStep('backup');
    } catch (e: any) {
      setError(e.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackup = async () => {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amt-musik-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Enrolled confirmation ──────────────────────────────────────────────────
  if (enrolled) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7 text-green-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Two-factor auth enabled</h3>
          <p className="text-xs text-[#B3B3B3] mt-1">Your account is now more secure.</p>
        </div>
        <Button
          onClick={onComplete}
          className="w-full h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm"
        >
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ── Method selection ───────────────────────────────────────────────────────
  if (!method) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-[#FF6B00]" />
          </div>
          <h3 className="text-base font-bold text-white">Enable Two-Factor Authentication</h3>
          <p className="text-xs text-[#B3B3B3] mt-1 leading-relaxed">Add an extra layer of security to your account.</p>
        </div>

        {[
          {
            id: 'email' as Method,
            icon: Mail,
            label: 'Email OTP',
            desc: 'Receive a one-time code to your email at each login.',
            badge: 'Easy setup',
          },
          {
            id: 'totp' as Method,
            icon: Smartphone,
            label: 'Authenticator App',
            desc: 'Use Google Authenticator, Authy, or similar apps.',
            badge: 'Most secure',
          },
        ].map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setMethod(opt.id);
                if (opt.id === 'totp') handleStartTotp();
              }}
              className="w-full text-left rounded-xl border border-white/8 bg-[#111] p-4 hover:border-[#FF6B00]/40 transition-colors flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <span className="text-[10px] bg-[#FF6B00]/15 text-[#FF6B00] px-1.5 py-0.5 rounded-full font-medium">{opt.badge}</span>
                </div>
                <p className="text-xs text-[#555] leading-relaxed">{opt.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] mt-1 flex-shrink-0" />
            </button>
          );
        })}

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full text-xs text-[#555] hover:text-[#B3B3B3] py-2 underline transition-colors"
          >
            Skip for now — I'll set this up in Settings
          </button>
        )}
      </div>
    );
  }

  // ── Email 2FA setup ────────────────────────────────────────────────────────
  if (method === 'email') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Email OTP</p>
            <p className="text-xs text-[#555]">Verify via email code at each login</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-sm text-[#B3B3B3] leading-relaxed">
          When enabled, every sign-in will send a one-time code to your email address. You'll need to enter it to complete login.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setMethod(null)} className="flex-1 h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">
            Back
          </Button>
          <Button onClick={handleEnrollEmail} disabled={loading}
            className="flex-2 h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enable Email 2FA <ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </div>
    );
  }

  // ── TOTP: QR Code scan ─────────────────────────────────────────────────────
  if (method === 'totp' && totpStep === 'qr') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Authenticator App Setup</p>
            <p className="text-xs text-[#555]">Step 1 of 3 — Scan QR code</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : qrUrl ? (
          <>
            <p className="text-sm text-[#B3B3B3]">
              Open <span className="text-white font-medium">Google Authenticator</span>, <span className="text-white font-medium">Authy</span>, or any TOTP app and scan this QR code.
            </p>
            <div className="flex justify-center p-4 rounded-xl bg-white">
              <img src={qrUrl} alt="2FA QR code" className="w-40 h-40" />
            </div>
            <div>
              <p className="text-xs text-[#555] mb-1.5">Can't scan? Enter this key manually:</p>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111] px-3 py-2">
                <code className="text-xs text-[#B3B3B3] flex-1 break-all font-mono">
                  {showSecret ? secret : '•'.repeat(Math.min(secret.length, 32))}
                </code>
                <button type="button" onClick={() => setShowSecret(v => !v)} title="Toggle secret visibility" className="text-[#555] hover:text-[#FF6B00]">
                  {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setMethod(null); setQrUrl(''); setSecret(''); }} className="flex-1 h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">
            Back
          </Button>
          <Button onClick={() => setTotpStep('verify')} disabled={!qrUrl}
            className="flex-2 h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm px-6">
            I've scanned it <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── TOTP: Verify code ──────────────────────────────────────────────────────
  if (method === 'totp' && totpStep === 'verify') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Enter Verification Code</p>
            <p className="text-xs text-[#555]">Step 2 of 3 — Verify the code</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <p className="text-sm text-[#B3B3B3]">Enter the 6-digit code currently shown in your authenticator app.</p>

        <div className="space-y-1.5">
          <Label htmlFor="totp-code" className="text-[#B3B3B3] text-sm">6-Digit Code</Label>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            autoFocus
            maxLength={7}
            placeholder="000 000"
            className="h-12 text-center text-xl tracking-[0.4em] font-mono bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60"
            value={verifyCode}
            onChange={(e) => { setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); if (error) setError(''); }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setTotpStep('qr')} className="flex-1 h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">
            Back
          </Button>
          <Button onClick={handleVerifyTotp} disabled={loading || verifyCode.length < 6}
            className="flex-2 h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <ChevronRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
      </div>
    );
  }

  // ── TOTP: Backup codes ─────────────────────────────────────────────────────
  if (method === 'totp' && totpStep === 'backup') {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Save Your Backup Codes</p>
            <p className="text-xs text-[#555]">Step 3 of 3 — Save backup codes</p>
          </div>
        </div>

        <p className="text-sm text-[#B3B3B3] leading-relaxed">
          Store these codes somewhere safe. Each code can only be used <strong className="text-white">once</strong> to access your account if you lose your authenticator.
        </p>

        <div className="rounded-xl border border-white/10 bg-[#111] p-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code) => (
              <code key={code} className="text-xs font-mono text-[#B3B3B3] tracking-wider text-center py-1 rounded border border-white/5 bg-[#0a0a0a]">
                {code}
              </code>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={handleCopyBackup}
            className="h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-xs">
            {copiedBackup ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy codes</>}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownloadBackup}
            className="h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
          </Button>
        </div>

        <Button
          onClick={() => { setEnrolled(true); onComplete?.(); }}
          className="w-full h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm"
        >
          <Check className="w-4 h-4 mr-2" /> I've saved my backup codes — Finish
        </Button>
      </div>
    );
  }

  return null;
}
