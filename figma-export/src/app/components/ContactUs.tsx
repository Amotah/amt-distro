import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createPublicSupportTicket } from '../utils/support-api';

const contactMethods = [
  {
    icon: Mail,
    label: 'Email Us',
    value: 'support@amtdistro.com',
    href: 'mailto:support@amtdistro.com',
    description: 'For general inquiries and support',
  },
  {
    icon: Phone,
    label: 'Call Us',
    value: '+2348162988301',
    href: 'tel:+2348162988301',
    description: 'Mon – Fri, 9 AM – 6 PM WAT',
  },
  {
    icon: MapPin,
    label: 'Visit Us',
    value: 'Lagos, Nigeria',
    href: undefined,
    description: 'AMT DISTRO HQ',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: '9 AM – 6 PM WAT',
    href: undefined,
    description: 'Monday through Friday',
  },
];

const categoryMap: Record<string, any> = {
  general: 'question',
  support: 'technical_issue',
  billing: 'billing_inquiry',
  partnership: 'feature_request',
  feedback: 'other',
};

export function ContactUs() {
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    subject: '', 
    message: '',
    category: 'general'
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim() || !form.subject.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSending(true);
    try {
      // Create support ticket via public API
      const ticket = await createPublicSupportTicket(
        form.email,
        {
          subject: form.subject || 'Contact Form Submission',
          category: categoryMap[form.category] || 'question',
          message: `From: ${form.name}\n\n${form.message}`,
          priority: 'normal',
        }
      );

      toast.success('Message sent! We\'ll get back to you within 24 hours.');
      toast.info(`Your ticket number is: ${ticket.srNumber}`);
      setForm({ name: '', email: '', subject: '', message: '', category: 'general' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            Get in Touch
          </div>
          <h1 className="text-[2rem] font-bold text-white sm:text-[2.5rem]">Contact Us</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#B3B3B3]">
            Have a question, partnership inquiry, or need support? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactMethods.map((method) => (
            <Card
              key={method.label}
              className="border-[#FF6B00]/10 bg-[#161616] p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(255,107,0,0.08)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10">
                <method.icon className="h-5 w-5 text-[#FF6B00]" />
              </div>
              <h3 className="text-sm font-bold text-white">{method.label}</h3>
              {method.href ? (
                <a
                  href={method.href}
                  className="mt-1 block text-sm font-medium text-[#FFD600] hover:underline"
                >
                  {method.value}
                </a>
              ) : (
                <p className="mt-1 text-sm font-medium text-[#FFD600]">{method.value}</p>
              )}
              <p className="mt-1 text-xs text-[#8D8D8D]">{method.description}</p>
            </Card>
          ))}
        </div>

        {/* Form + Info Grid */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Contact Form */}
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 sm:p-8 lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
                <Send className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Send a Message</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-[#B3B3B3]">
                    Full Name <span className="text-[#FF6B00]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-[#B3B3B3]">
                    Email Address <span className="text-[#FF6B00]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-category" className="mb-1.5 block text-xs font-medium text-[#B3B3B3]">
                  Category <span className="text-[#FF6B00]">*</span>
                </label>
                <select
                  id="contact-category"
                  name="category"
                  title="Select inquiry category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                >
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing &amp; Payments</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium text-[#B3B3B3]">
                  Subject <span className="text-[#FF6B00]">*</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  required
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What is this about?"
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium text-[#B3B3B3]">
                  Message <span className="text-[#FF6B00]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-2.5 text-sm leading-6 text-white placeholder-[#666] outline-none transition focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/30"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-[#FF6B00] py-2.5 text-sm font-medium text-white hover:bg-[#FF6B00]/90 disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {sending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          </Card>

          {/* Sidebar Info */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">Quick Answers</h3>
              </div>
              <ul className="space-y-3 text-sm text-[#B3B3B3]">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FF6B00]" />
                  <span>Distribution typically takes 3–7 business days.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FF6B00]" />
                  <span>You keep 100% of your royalties on every plan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FF6B00]" />
                  <span>Cancel anytime — your music stays live.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FF6B00]" />
                  <span>Payouts arrive within 5–7 business days once threshold is met.</span>
                </li>
              </ul>
              <a
                href="#faq"
                className="mt-4 inline-block text-sm font-medium text-[#FF6B00] hover:text-[#FFD600] transition-colors"
              >
                View all FAQs →
              </a>
            </Card>

            <Card className="border-[#FF6B00]/10 bg-[#161616] p-6">
              <h3 className="mb-3 text-sm font-bold text-white">Follow Us</h3>
              <p className="mb-4 text-xs text-[#B3B3B3]">Stay connected for updates, new features, and artist spotlights.</p>
              <div className="flex gap-3">
                {['Twitter', 'Instagram', 'Facebook', 'YouTube'].map((name) => (
                  <a
                    key={name}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#0A0A0A] text-xs font-bold text-[#B3B3B3] transition-all hover:border-[#FF6B00] hover:bg-[#FF6B00] hover:text-white"
                    title={name}
                  >
                    {name[0]}
                  </a>
                ))}
              </div>
            </Card>

            <Card className="border-[#FF6B00]/20 bg-gradient-to-br from-[#FF6B00]/10 to-[#FFD600]/5 p-6">
              <h3 className="mb-2 text-sm font-bold text-white">Response Time</h3>
              <p className="text-xs leading-5 text-[#B3B3B3]">
                We aim to respond to all inquiries within <span className="font-semibold text-[#FFD600]">24 hours</span> during business days. Priority support is available for paid plan subscribers.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
