import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  createClickEvent,
  getPreferredPlatform,
} from '../utils/smartLinkAlgorithms';
import {
  loadSmartLinkClickEvents,
  loadSmartLinks,
  saveSmartLinkClickEvents,
  saveSmartLinks,
  type SmartLinkStorageRecord,
} from '../utils/smart-links-storage';

interface SmartLinkRedirectPageProps {
  slug: string;
}

function getFallbackPlatformUrl(link: SmartLinkStorageRecord): string | null {
  const urls = Object.values(link.platforms).filter(Boolean);
  return urls.length > 0 ? urls[0] : null;
}

export function SmartLinkRedirectPage({ slug }: SmartLinkRedirectPageProps) {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'not-found' | 'invalid'>('loading');

  const link = useMemo(() => {
    const normalizedSlug = slug.toLowerCase();
    const links = loadSmartLinks();
    return links.find((entry) => entry.slug.toLowerCase() === normalizedSlug) || null;
  }, [slug]);

  const targetUrl = useMemo(() => {
    if (!link) return null;

    const device = createClickEvent(link.id).device;
    const os = createClickEvent(link.id).os;
    const preferred = getPreferredPlatform(link.platforms, device, os);
    return preferred || getFallbackPlatformUrl(link);
  }, [link]);

  useEffect(() => {
    if (!link) {
      setStatus('not-found');
      return;
    }

    if (!targetUrl) {
      setStatus('invalid');
      return;
    }

    setStatus('redirecting');

    const clickEvent = createClickEvent(link.id);
    const existingEvents = loadSmartLinkClickEvents();
    existingEvents.unshift({
      ...clickEvent,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date(clickEvent.timestamp).toISOString().slice(0, 10),
      linkSlug: link.slug,
    });
    saveSmartLinkClickEvents(existingEvents);

    const updatedLinks = loadSmartLinks().map((entry) => (
      entry.id === link.id
        ? { ...entry, clicks: (entry.clicks || 0) + 1 }
        : entry
    ));
    saveSmartLinks(updatedLinks);

    window.location.replace(targetUrl);
  }, [link, targetUrl]);

  if (status === 'redirecting' || status === 'loading') {
    return (
      <section className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-[#FF6B00]/20 bg-[#111] p-6 text-center space-y-3">
          <h1 className="text-2xl font-bold">Opening your music...</h1>
          <p className="text-sm text-[#B3B3B3]">Please wait while we redirect you to the best platform.</p>
        </Card>
      </section>
    );
  }

  if (status === 'invalid') {
    return (
      <section className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <Card className="w-full max-w-lg border-red-500/30 bg-[#111] p-6 space-y-4">
          <h1 className="text-2xl font-bold text-red-300">Smart link is incomplete</h1>
          <p className="text-sm text-[#B3B3B3]">This smart link does not have any valid platform destination yet.</p>
          <Button className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white" onClick={() => window.location.assign('/')}>
            Back to Home
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-red-500/30 bg-[#111] p-6 space-y-4">
        <h1 className="text-2xl font-bold text-red-300">Smart link not found</h1>
        <p className="text-sm text-[#B3B3B3]">The link <span className="text-[#FFD600]">{slug}</span> does not exist or was removed.</p>
        <Button className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white" onClick={() => window.location.assign('/')}>
          Back to Home
        </Button>
      </Card>
    </section>
  );
}
