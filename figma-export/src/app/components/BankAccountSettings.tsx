import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Lock,
  AlertCircle,
  Check,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  getUserBankAccount,
  submitBankAccountRequest,
  type UserBankAccount,
} from '../utils/payment-api';
import { getStoredAccessToken } from '../utils/auth-session';
import { BACKEND_API_BASE_URL } from '../utils/backend-api-base';

interface BankAccountSettingsProps {
  onBack: () => void;
}

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Alpha Morgan Bank', code: '103' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Globus Bank', code: '103' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'TAJ Bank', code: '302' },
  { name: 'Lotus Bank', code: '303' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    desc: 'Your request is awaiting admin approval.',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.3)',
    color: '#FCD34D',
    icon: Clock,
  },
  approved: {
    label: 'Approved & Active',
    desc: 'This is your current active bank account.',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.25)',
    color: '#4ADE80',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    desc: 'This request was declined by admin.',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.25)',
    color: '#F87171',
    icon: XCircle,
  },
};

function mask(num: string) {
  if (num.length < 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
}

export function BankAccountSettings({ onBack }: BankAccountSettingsProps) {
  const [bankData, setBankData] = useState<UserBankAccount | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    bankName: '',
    bankCode: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountName: '',
  });
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadBankData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getUserBankAccount();
      setBankData(data);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load bank account');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBankData(); }, [loadBankData]);

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bank = NIGERIAN_BANKS.find(b => b.name === e.target.value);
    setFormData(f => ({ ...f, bankName: e.target.value, bankCode: bank?.code ?? '', accountName: '' }));
    setVerified(false);
  };

  const handleVerify = async () => {
    if (formData.accountNumber.length !== 10 || !formData.bankCode) return;
    setVerifying(true);
    setVerifyError(null);
    setFormData(f => ({ ...f, accountName: '' }));
    setVerified(false);
    try {
      const token = getStoredAccessToken();
      const res = await fetch(
        `${BACKEND_API_BASE_URL}/payments/verify-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ accountNumber: formData.accountNumber, bankCode: formData.bankCode }),
        }
      );
      const json = await res.json();
      if (json.valid && json.accountName) {
        setFormData(f => ({ ...f, accountName: json.accountName }));
        setVerified(true);
      } else {
        setVerifyError(json.error ?? 'Account not found. Please check the number and bank.');
        setVerified(false);
      }
    } catch {
      setVerifyError('Verification failed. Please try again.');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified || formData.accountNumber !== formData.confirmAccountNumber) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitBankAccountRequest({
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        bankCode: formData.bankCode,
      });
      setSubmitSuccess(true);
      setFormData({ bankName: '', bankCode: '', accountNumber: '', confirmAccountNumber: '', accountName: '' });
      setVerified(false);
      await loadBankData();
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const canVerify = formData.accountNumber.length === 10 && !!formData.bankName && !verifying;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Royalties
          </Button>
          <h1 className="text-4xl mb-2" style={{ color: 'var(--foreground)' }}>Update Bank Account</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Update your bank account details for receiving royalty payments</p>
        </div>

        {/* Security Notice */}
        <Card className="p-4 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-3">
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            <div>
              <h3 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Your information is secure</h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Bank account changes require admin approval before taking effect. You'll see the status here once reviewed.
              </p>
            </div>
          </div>
        </Card>

        {/* Current / Pending Account Status */}
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading account details…</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 p-4 mb-6 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {loadError}
            <button onClick={loadBankData} className="ml-auto underline">Retry</button>
          </div>
        ) : (
          <>
            {/* Pending request banner */}
            {bankData?.pending && (() => {
              const cfg = STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <Card className="p-4 mb-4" style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Submitted {new Date(bankData.pending.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{cfg.desc}</p>
                      <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--foreground)' }}>
                        <p><span style={{ color: 'var(--muted-foreground)' }}>Bank: </span>{bankData.pending.bankName}</p>
                        <p><span style={{ color: 'var(--muted-foreground)' }}>Account: </span>{mask(bankData.pending.accountNumber)} — {bankData.pending.accountName}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Approved account */}
            {bankData?.approved && (() => {
              const cfg = STATUS_CONFIG.approved;
              const Icon = cfg.icon;
              return (
                <Card className="p-4 mb-6" style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold" style={{ color: cfg.color }}>Active Bank Account</span>
                      <div className="mt-2 text-sm space-y-0.5" style={{ color: 'var(--foreground)' }}>
                        <p><span style={{ color: 'var(--muted-foreground)' }}>Bank: </span>{bankData.approved.bankName}</p>
                        <p><span style={{ color: 'var(--muted-foreground)' }}>Account: </span>{mask(bankData.approved.accountNumber)} — {bankData.approved.accountName}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                          Approved {bankData.approved.reviewedAt ? new Date(bankData.approved.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={loadBankData} className="p-1 rounded" title="Refresh">
                      <RefreshCw className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
                    </button>
                  </div>
                </Card>
              );
            })()}

            {!bankData?.approved && !bankData?.pending && (
              <div className="p-4 mb-6 rounded-xl text-sm text-center" style={{ backgroundColor: 'var(--secondary)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                No bank account on file. Submit your details below to get started.
              </div>
            )}
          </>
        )}

        {/* Success banner */}
        {submitSuccess && (
          <div className="flex items-center gap-2 p-4 mb-6 rounded-xl text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ADE80' }}>
            <Check className="w-4 h-4 flex-shrink-0" />
            Request submitted! An admin will review your bank account details shortly.
            <button onClick={() => setSubmitSuccess(false)} className="ml-auto font-bold">×</button>
          </div>
        )}

        {/* Block new submission if pending exists */}
        {!loading && bankData?.pending ? (
          <Card className="p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <Clock className="w-8 h-8" style={{ color: '#FCD34D' }} />
              <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>Request Pending Approval</h3>
              <p className="text-sm max-w-sm" style={{ color: 'var(--muted-foreground)' }}>
                You already have a bank account change request awaiting admin review. You can submit a new request once the current one is reviewed, or contact support to expedite.
              </p>
            </div>
          </Card>
        ) : !loading && (
          /* New request form */
          <Card className="p-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
              {bankData?.approved ? 'Request Account Change' : 'Add Bank Account'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bank Selection */}
              <div>
                <Label htmlFor="bankName">Select Your Bank *</Label>
                <div className="relative mt-2">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  <select
                    id="bankName"
                    value={formData.bankName}
                    onChange={handleBankChange}
                    className="w-full pl-10 px-3 py-2 rounded-lg focus:outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--input-background)', color: 'var(--foreground)' }}
                    required
                  >
                    <option value="">Choose your bank</option>
                    {NIGERIAN_BANKS.map(b => (
                      <option key={b.code + b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Number */}
              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <div className="relative mt-2">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="0123456789"
                    maxLength={10}
                    value={formData.accountNumber}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      setFormData(f => ({ ...f, accountNumber: v, accountName: '' }));
                      setVerified(false);
                      setVerifyError(null);
                    }}
                    className="pl-10"
                    required
                  />
                </div>
                {canVerify && !verified && (
                  <Button type="button" variant="outline" size="sm" onClick={handleVerify} className="mt-2" disabled={verifying}>
                    {verifying ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verifying…</> : 'Verify Account'}
                  </Button>
                )}
                {verifyError && (
                  <p className="text-sm mt-2 flex items-center gap-1" style={{ color: 'var(--destructive)' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {verifyError}
                  </p>
                )}
              </div>

              {/* Verified account name */}
              {verified && formData.accountName && (
                <div
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(0,229,255,0.05) 100%)',
                    border: '1px solid rgba(74,222,128,0.35)',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)' }}
                  >
                    <CheckCircle className="w-5 h-5" style={{ color: '#4ADE80' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: '#4ADE80' }}>
                      Account Verified
                    </p>
                    <p className="font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                      {formData.accountName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {formData.bankName} · {formData.accountNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Confirm Account Number */}
              <div>
                <Label htmlFor="confirmAccountNumber">Confirm Account Number *</Label>
                <div className="relative mt-2">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    id="confirmAccountNumber"
                    type="text"
                    placeholder="Re-enter account number"
                    maxLength={10}
                    value={formData.confirmAccountNumber}
                    onChange={e => setFormData(f => ({ ...f, confirmAccountNumber: e.target.value.replace(/\D/g, '') }))}
                    className="pl-10"
                    required
                  />
                </div>
                {formData.confirmAccountNumber && formData.accountNumber !== formData.confirmAccountNumber && (
                  <p className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--destructive)' }}>
                    <AlertCircle className="w-4 h-4" />
                    Account numbers do not match
                  </p>
                )}
              </div>

              {/* Notice */}
              <Card className="p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                  <ul className="text-sm space-y-1" style={{ color: 'var(--sidebar-foreground)' }}>
                    <li>• Your request will be reviewed by admin before activation</li>
                    <li>• You'll see the updated account here once approved</li>
                    <li>• Pending payouts will continue to use the currently approved account</li>
                  </ul>
                </div>
              </Card>

              {submitError && (
                <p className="text-sm flex items-center gap-1" style={{ color: 'var(--destructive)' }}>
                  <AlertCircle className="w-4 h-4" />
                  {submitError}
                </p>
              )}

              <div className="flex gap-4 pt-2">
                <Button type="button" variant="outline" onClick={onBack} className="flex-1">Cancel</Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !verified || formData.accountNumber !== formData.confirmAccountNumber || !formData.bankName}
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                    : <><Send className="w-4 h-4 mr-2" />Submit for Approval</>}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </section>
  );
}
