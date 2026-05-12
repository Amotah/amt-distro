import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, Info, Phone, FileText, CreditCard, RefreshCcw, HelpCircle } from 'lucide-react';
import { submitDispute, type SubmitDisputeInput, type DisputeType, type BillingHistoryRecord } from '../utils/payment-api';
import { getBillingPaymentDate } from '../utils/billing-downloads';

interface DisputeFormProps {
  payment: BillingHistoryRecord;
  onClose: () => void;
  onSuccess?: () => void;
}

const DISPUTE_TYPES: { value: DisputeType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'failed_debit',
    label: 'Failed Transaction — Debited',
    description: 'My account was charged but the transaction shows as failed or I received no value.',
    icon: AlertTriangle,
  },
  {
    value: 'duplicate',
    label: 'Duplicate Charge',
    description: 'I was charged more than once for the same transaction or service.',
    icon: RefreshCcw,
  },
  {
    value: 'wrong_amount',
    label: 'Incorrect Amount',
    description: 'The amount charged is different from what was shown or agreed upon.',
    icon: CreditCard,
  },
  {
    value: 'unauthorized',
    label: 'Unauthorized Transaction',
    description: 'I did not authorize this charge and suspect fraud or an error.',
    icon: AlertTriangle,
  },
  {
    value: 'other',
    label: 'Other Issue',
    description: 'My issue doesn\'t fit the categories above. I will describe it in detail below.',
    icon: HelpCircle,
  },
];

type Step = 'type' | 'details' | 'review' | 'submitted';

export function DisputeForm({ payment, onClose, onSuccess }: DisputeFormProps) {
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState('');
  const [bankStatementNote, setBankStatementNote] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedDisputeId, setSubmittedDisputeId] = useState<string | null>(null);

  const formattedDate = new Date(getBillingPaymentDate(payment)).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  async function handleSubmit() {
    if (!selectedType || description.trim().length < 20) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: SubmitDisputeInput = {
        transactionReference: payment.reference,
        transactionAmount: payment.amount,
        transactionDate: getBillingPaymentDate(payment),
        disputeType: selectedType,
        description: description.trim(),
        bankStatementNote: bankStatementNote.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      };
      const dispute = await submitDispute(input);
      setSubmittedDisputeId(dispute.id);
      setStep('submitted');
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTypeInfo = DISPUTE_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,107,0,0.2)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,107,0,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,107,0,0.1)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#FF6B00' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#FFFFFF' }}>Dispute Transaction</h2>
              <p className="text-xs" style={{ color: '#888' }}>Ref: {payment.reference}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/5" aria-label="Close">
            <X className="w-5 h-5" style={{ color: '#888' }} />
          </button>
        </div>

        {/* Transaction summary banner */}
        <div className="mx-6 mt-5 p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.15)' }}>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p style={{ color: '#888' }}>Amount</p>
              <p className="font-bold text-lg mt-0.5" style={{ color: '#FFFFFF' }}>₦{payment.amount.toLocaleString()}</p>
            </div>
            <div>
              <p style={{ color: '#888' }}>Date</p>
              <p className="font-medium mt-0.5" style={{ color: '#D1D5DB' }}>{formattedDate}</p>
            </div>
            <div>
              <p style={{ color: '#888' }}>Status</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5"
                style={payment.status === 'failed'
                  ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }
                  : { backgroundColor: 'rgba(251,191,36,0.15)', color: '#FCD34D' }
                }>
                {payment.status.toUpperCase()}
              </span>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: '#6B7280' }}>{payment.description}</p>
        </div>

        {/* Step indicator */}
        {step !== 'submitted' && (
          <div className="px-6 mt-5 flex items-center gap-2">
            {(['type', 'details', 'review'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  style={step === s
                    ? { backgroundColor: '#FF6B00', color: '#FFF' }
                    : ['submitted', 'review', 'details'].indexOf(step) > ['submitted', 'review', 'details'].indexOf(s)
                      ? { backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ADE80' }
                      : { backgroundColor: 'rgba(255,255,255,0.08)', color: '#888' }
                  }>{i + 1}</div>
                <span className="text-xs hidden sm:inline" style={{ color: step === s ? '#FF6B00' : '#6B7280' }}>
                  {s === 'type' ? 'Issue Type' : s === 'details' ? 'Details' : 'Review'}
                </span>
                {i < 2 && <div className="w-8 h-px mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 pb-6 mt-5">

          {/* ── Step 1: Issue Type ── */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm font-medium mb-4" style={{ color: '#A0A7B8' }}>What is the nature of your dispute?</p>
              {DISPUTE_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className="w-full text-left p-4 rounded-xl transition"
                    style={{
                      backgroundColor: selected ? 'rgba(255,107,0,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selected ? 'rgba(255,107,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ backgroundColor: selected ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.05)' }}>
                        <Icon className="w-4 h-4" style={{ color: selected ? '#FF6B00' : '#9CA3AF' }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: selected ? '#FF6B00' : '#FFFFFF' }}>{type.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{type.description}</p>
                      </div>
                      {selected && <CheckCircle className="ml-auto flex-shrink-0 w-5 h-5 mt-0.5" style={{ color: '#FF6B00' }} />}
                    </div>
                  </button>
                );
              })}

              <button
                disabled={!selectedType}
                onClick={() => setStep('details')}
                className="w-full mt-4 py-3 px-6 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: selectedType ? '#FF6B00' : 'rgba(255,107,0,0.3)', color: '#FFF' }}
              >
                Continue
              </button>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* Dispute type badge */}
              {selectedTypeInfo && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,107,0,0.07)', border: '1px solid rgba(255,107,0,0.2)' }}>
                  <selectedTypeInfo.icon className="w-4 h-4 flex-shrink-0" style={{ color: '#FF6B00' }} />
                  <p className="text-sm font-medium" style={{ color: '#FF6B00' }}>{selectedTypeInfo.label}</p>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#D1D5DB' }}>
                  Describe the issue <span style={{ color: '#FF6B00' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Please provide a detailed explanation of the issue. Include what happened, when it happened, and any other relevant information that can help us investigate..."
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#0B0F1A',
                    border: `1px solid ${description.trim().length >= 20 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    color: '#FFFFFF',
                    focusRingColor: '#FF6B00',
                  } as any}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs" style={{ color: description.trim().length < 20 ? '#EF4444' : '#6B7280' }}>
                    {description.trim().length < 20
                      ? `Minimum 20 characters required (${description.trim().length}/20)`
                      : `${description.trim().length} characters`}
                  </p>
                </div>
              </div>

              {/* Bank statement note */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#D1D5DB' }}>
                  Bank / Wallet Statement Note <span className="text-xs font-normal ml-1" style={{ color: '#6B7280' }}>(optional)</span>
                </label>
                <textarea
                  value={bankStatementNote}
                  onChange={(e) => setBankStatementNote(e.target.value)}
                  rows={2}
                  placeholder="E.g. 'Bank app shows debit of ₦5,000 on 3rd May at 10:22am with transaction ID TXN123456...'"
                  className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2"
                  style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                />
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#D1D5DB' }}>
                  Contact Phone <span className="text-xs font-normal ml-1" style={{ color: '#6B7280' }}>(optional — for faster resolution)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B7280' }} />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                  />
                </div>
              </div>

              {/* Info notice */}
              <div className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#60A5FA' }} />
                <p className="text-xs" style={{ color: '#93C5FD' }}>
                  Our team typically reviews disputes within 2–5 business days. You will receive an email update when your dispute status changes. Frivolous or repeated disputes may result in account restrictions.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('type')} className="flex-1 py-3 px-6 rounded-xl font-semibold transition" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Back
                </button>
                <button
                  disabled={description.trim().length < 20}
                  onClick={() => setStep('review')}
                  className="flex-2 flex-grow py-3 px-6 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#FF6B00', color: '#FFF' }}
                >
                  Review & Submit
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#A0A7B8' }}>Please review your dispute before submitting. You will not be able to edit it after submission.</p>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { label: 'Transaction Reference', value: payment.reference, mono: true },
                  { label: 'Amount Disputed', value: `₦${payment.amount.toLocaleString()}` },
                  { label: 'Transaction Date', value: formattedDate },
                  { label: 'Dispute Type', value: selectedTypeInfo?.label ?? '' },
                ].map((row, i) => (
                  <div key={row.label} className="flex justify-between items-start px-5 py-3.5" style={{ backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <span className="text-sm" style={{ color: '#6B7280' }}>{row.label}</span>
                    <span className={`text-sm font-medium text-right max-w-xs ${row.mono ? 'font-mono text-xs' : ''}`} style={{ color: '#FFFFFF' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>DESCRIPTION</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#D1D5DB' }}>{description}</p>
              </div>

              {bankStatementNote && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                    <p className="text-xs font-medium" style={{ color: '#6B7280' }}>BANK STATEMENT NOTE</p>
                  </div>
                  <p className="text-sm" style={{ color: '#D1D5DB' }}>{bankStatementNote}</p>
                </div>
              )}

              {contactPhone && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Phone className="w-4 h-4" style={{ color: '#6B7280' }} />
                  <span className="text-sm" style={{ color: '#D1D5DB' }}>{contactPhone}</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F87171' }} />
                  <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setStep('details'); setError(null); }} className="flex-1 py-3 px-6 rounded-xl font-semibold transition" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Back
                </button>
                <button
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex-grow flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition disabled:opacity-60"
                  style={{ backgroundColor: '#FF6B00', color: '#FFF' }}
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Dispute'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Submitted ── */}
          {step === 'submitted' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#4ADE80' }} />
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Dispute Submitted</h3>
              <p className="text-sm mb-6" style={{ color: '#A0A7B8' }}>
                Your dispute has been received and assigned to our payments team. We will review it within 2–5 business days and notify you by email.
              </p>
              {submittedDisputeId && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-xs" style={{ color: '#6B7280' }}>Dispute ID:</span>
                  <code className="text-xs font-mono" style={{ color: '#FF6B00' }}>{submittedDisputeId.slice(0, 8).toUpperCase()}…</code>
                </div>
              )}
              <div className="text-xs p-4 rounded-xl mb-6" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}>
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="text-left space-y-1 list-disc list-inside">
                  <li>Our team verifies the transaction on your account and with our payment gateway.</li>
                  <li>If confirmed, a refund or correction will be processed within 7 business days.</li>
                  <li>You'll receive email updates at every stage — open → under review → resolved/rejected.</li>
                </ul>
              </div>
              <button onClick={onClose} className="px-8 py-3 rounded-xl font-semibold" style={{ backgroundColor: '#FF6B00', color: '#FFF' }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
