import { useState } from 'react';
import {
  HelpCircle, MessageCircle, ChevronDown, ChevronUp, Send, Loader2, Check, Paperclip, X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../../../utils/supabase/client';

const FAQS: { q: string; a: string; cat: string }[] = [
  { cat: 'Releases', q: 'How long does it take for my release to go live?', a: 'Most releases are delivered to platforms within 24–72 hours after approval. High-traffic periods (Fridays) may take slightly longer.' },
  { cat: 'Releases', q: 'Can I set a future release date?', a: 'Yes. When uploading, select a release date at least 7 days in the future to allow for platform indexing and playlist pitching.' },
  { cat: 'Royalties', q: 'When are royalties paid?', a: 'Royalties are paid monthly, typically on the 15th of each month for the previous month\'s earnings. A minimum balance of ₦2,000 is required.' },
  { cat: 'Royalties', q: 'How is streaming revenue calculated?', a: 'Each platform pays per-stream rates that vary based on listener location and premium/free status. We display platform-level breakdowns in Analytics.' },
  { cat: 'Account', q: 'How do I verify my account?', a: 'Submit government-issued ID and a selfie via the "Verify Account" button in your profile settings. Verification typically takes 1–2 business days.' },
  { cat: 'Account', q: 'Can I change my artist name?', a: 'Yes, from the Profile tab in Settings. Note: name changes on already-distributed releases require manual processing which may take up to 7 days.' },
  { cat: 'Billing', q: 'How do I cancel my subscription?', a: 'Contact support with your request. Active subscriptions are non-refundable for the current billing period but will not auto-renew after cancellation.' },
  { cat: 'Billing', q: 'Are there any hidden fees?', a: 'No. We charge only the stated subscription fee. Payouts are at 100% of collected royalties with no deductions.' },
];

const CATEGORIES = ['Bug Report', 'Question', 'Feature Request', 'Billing Inquiry', 'Other'];

export function SupportTab() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeCat, setActiveCat] = useState<string>('All');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const faqCats = ['All', ...Array.from(new Set(FAQS.map((f) => f.cat)))];
  const filteredFaqs = activeCat === 'All' ? FAQS : FAQS.filter((f) => f.cat === activeCat);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAttachment(file);
  };

  const handleSendTicket = async () => {
    if (!subject.trim() || !message.trim() || !category) { setSendError('Subject, category and message are required.'); return; }
    setSending(true); setSendError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to submit a ticket.');

      // Build form data for optional attachment upload
      const body = new FormData();
      body.append('subject', subject.trim());
      body.append('category', category);
      body.append('message', message.trim());
      body.append('user_id', user.id);
      body.append('email', user.email ?? '');
      if (attachment) body.append('attachment', attachment);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? `Request failed (${res.status})`);
      }

      setSent(true);
      setSubject(''); setCategory(''); setMessage(''); setAttachment(null);
    } catch (e: any) {
      setSendError(e.message ?? 'Failed to submit ticket.');
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Support & Help</h2>
        <p className="text-sm text-[#555] mt-0.5">Frequently asked questions and direct support</p>
      </div>

      {/* Quick contact pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Email Support', href: 'mailto:support@amtmusik.com' },
          { label: 'WhatsApp', href: 'https://wa.me/2348000000000' },
          { label: 'Discord Community', href: 'https://discord.gg/amtmusik' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a]">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> {label}
            </Button>
          </a>
        ))}
      </div>

      {/* FAQs */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Frequently Asked Questions</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {faqCats.map((cat) => (
            <button key={cat} type="button" onClick={() => setActiveCat(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCat === cat
                  ? 'bg-[#FF6B00] border-[#FF6B00] text-white font-semibold'
                  : 'bg-transparent border-white/10 text-[#B3B3B3] hover:border-[#FF6B00]/40'
              }`}>{cat}</button>
          ))}
        </div>

        <div className="space-y-2">
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#1a1a1a] transition-colors">
                <span className="text-sm text-white pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-[#555] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#555] flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-[#B3B3B3] leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact form */}
      <section className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Submit a Support Ticket</p>
            <p className="text-xs text-[#555]">Our team typically responds within 24 hours</p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">Ticket submitted</p>
              <p className="text-xs text-emerald-300/70 mt-1">We've received your message and will respond to your email within 24 hours.</p>
              <Button size="sm" variant="outline" onClick={() => setSent(false)}
                className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 mt-3">
                Submit another
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#B3B3B3] text-sm">Subject <span className="text-red-400">*</span></Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue"
                  className="h-10 bg-[#0d0d0d] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#B3B3B3] text-sm">Category <span className="text-red-400">*</span></Label>
                <select title="Support category" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-lg bg-[#0d0d0d] border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#FF6B00]/60">
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#B3B3B3] text-sm">Message <span className="text-red-400">*</span></Label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your issue in detail. Include any error messages you see."
                className="w-full rounded-lg bg-[#0d0d0d] border border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60 focus:outline-none px-3 py-2.5 text-sm resize-none" />
            </div>

            {/* Attachment */}
            <div className="space-y-1.5">
              <Label className="text-[#B3B3B3] text-sm">Attachment (optional)</Label>
              {attachment ? (
                <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-2.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#555]" />
                  <span className="text-sm text-white flex-1 truncate">{attachment.name}</span>
                  <button type="button" title="Remove attachment" onClick={() => setAttachment(null)} className="text-[#555] hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 h-10 cursor-pointer rounded-lg border border-dashed border-white/15 bg-[#0d0d0d] px-4 text-sm text-[#555] hover:border-[#FF6B00]/40 transition-colors">
                  <Paperclip className="w-4 h-4" />
                  Attach screenshot or file
                  <input type="file" accept="image/*,.pdf,.txt" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            {sendError && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" /> {sendError}
              </p>
            )}

            <Button onClick={handleSendTicket} disabled={sending}
              className="w-full h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold text-sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Ticket
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
