import { useState } from 'react';
import {
  Download, Trash2, FileText, AlertTriangle, Loader2, Check, AlertCircle, ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../../../utils/supabase/client';

const DELETION_REASONS = [
  'No longer distributing music',
  'Switching to another service',
  'Account security concerns',
  'Dissatisfied with the service',
  'Other',
];

export function PrivacyTab() {
  const [dataRequested, setDataRequested] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleDataRequest = async () => {
    setDataLoading(true);
    try {
      // Request data export — in a real impl this would call your backend
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Simulate a data export request acknowledgment
      await new Promise((r) => setTimeout(r, 1000));
      setDataRequested(true);
    } finally { setDataLoading(false); }
  };

  const handleDeleteRequest = async () => {
    if (confirmText !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return; }
    setDeleteLoading(true); setDeleteError('');
    try {
      // In production: call your backend to schedule deletion
      await new Promise((r) => setTimeout(r, 1200));
      setDeleteStep('done');
    } catch (e: any) {
      setDeleteError(e.message ?? 'Failed to submit deletion request.');
    } finally { setDeleteLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Privacy & Data</h2>
        <p className="text-sm text-[#555] mt-0.5">Control your data, privacy settings, and account deletion</p>
      </div>

      {/* Data Download */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <Download className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Download Your Data</p>
            <p className="text-xs text-[#555]">Get a copy of everything we hold about you</p>
          </div>
        </div>

        <p className="text-sm text-[#B3B3B3] leading-relaxed">
          Your export will include: profile information, releases, analytics data, transaction history, and account activity logs. The archive is delivered as a ZIP file containing JSON and CSV files.
        </p>

        <div className="flex items-center gap-2 text-[11px] text-[#555] rounded-xl bg-[#0d0d0d] border border-white/5 px-4 py-3">
          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
          Processing time: up to 24 hours. You'll receive an email with a secure download link.
        </div>

        {dataRequested ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Data export requested — check your email within 24 hours.
          </div>
        ) : (
          <Button onClick={handleDataRequest} disabled={dataLoading} variant="outline"
            className="h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">
            {dataLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Request Data Export
          </Button>
        )}
      </section>

      {/* Privacy Policy */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Policies & Terms</p>
            <p className="text-xs text-[#555]">Review your current agreements</p>
          </div>
        </div>
        {[
          { label: 'Privacy Policy', href: '/privacy-policy', updated: 'Jan 2025' },
          { label: 'Terms & Conditions', href: '/terms-conditions', updated: 'Jan 2025' },
          { label: 'Cookie Policy', href: '/cookies-policy', updated: 'Jan 2025' },
        ].map(({ label, href, updated }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3 hover:border-[#FF6B00]/30 transition-colors">
            <div>
              <p className="text-sm text-white">{label}</p>
              <p className="text-xs text-[#555]">Last updated: {updated}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#555]" />
          </a>
        ))}
      </section>

      {/* Account Deletion */}
      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">Delete Account</p>
            <p className="text-xs text-red-400/60">This action cannot be undone</p>
          </div>
        </div>

        {deleteStep === 'done' ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4" /> Deletion request submitted
            </div>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Your account is scheduled for deletion in <strong>30 days</strong>. During this period you can cancel by signing in and clicking "Cancel deletion". After 30 days, all data will be permanently removed.
            </p>
          </div>
        ) : deleteStep === 'confirm' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-2 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Deleting your account will permanently remove all your releases, analytics, earnings data, and profile. This cannot be reversed.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#B3B3B3]">Reason (optional)</label>
              <select title="Deletion reason" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full h-10 rounded-lg bg-[#111] border border-white/10 text-white text-sm px-3 focus:outline-none">
                <option value="">Select a reason…</option>
                {DELETION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#B3B3B3]">Type <strong className="text-red-400">DELETE</strong> to confirm</label>
              <input
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); setDeleteError(''); }}
                placeholder="DELETE"
                className="w-full h-10 rounded-lg bg-[#111] border border-red-500/30 text-white placeholder:text-[#333] px-3 text-sm focus:outline-none focus:border-red-500/60"
              />
            </div>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setDeleteStep('idle'); setConfirmText(''); setDeleteError(''); }}
                className="flex-1 h-10 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-sm">Cancel</Button>
              <Button onClick={handleDeleteRequest} disabled={deleteLoading}
                className="flex-1 h-10 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm">
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Deletion Request'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-red-300/70 leading-relaxed">
              Requesting account deletion starts a 30-day grace period. After that, all data is permanently erased and cannot be recovered.
            </p>
            <Button variant="outline" onClick={() => setDeleteStep('confirm')}
              className="h-10 border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm">
              <Trash2 className="w-4 h-4 mr-2" /> Request Account Deletion
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
