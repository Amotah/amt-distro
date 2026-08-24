import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface SmartLinkRedirectPageProps {
  slug: string;
}

interface SmartLinkService {
  platform: string;
  url: string;
}

interface SmartLink {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  services: SmartLinkService[];
}

export function SmartLinkRedirectPage({ slug }: SmartLinkRedirectPageProps) {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'not-found' | 'invalid'>('loading');
  const [link, setLink] = useState<SmartLink | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  // Fetch smart link from database on mount
  useEffect(() => {
    const fetchSmartLink = async () => {
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vatpvfrbgeatdeypqcrv.supabase.co';
        const API_URL = `${SUPABASE_URL}/functions/v1/make-server-79198001`;
        
        const response = await fetch(`${API_URL}/smart-links/${slug}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          setStatus('not-found');
          return;
        }

        const data = await response.json();
        setLink(data);

        // Find first available platform URL
        if (data.services && data.services.length > 0) {
          const url = data.services[0].url;
          if (url) {
            setTargetUrl(url);
          } else {
            setStatus('invalid');
          }
        } else {
          setStatus('invalid');
        }

        // Record view event
        try {
          await fetch(`${API_URL}/smart-links/${slug}/events/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: new Date().toISOString() }),
          });
        } catch (err) {
          console.error('Failed to record view:', err);
        }
      } catch (error) {
        console.error('Error fetching smart link:', error);
        setStatus('not-found');
      }
    };

    fetchSmartLink();
  }, [slug]);

  // Auto-redirect when target URL is found
  useEffect(() => {
    if (!targetUrl) return;
    if (status !== 'loading') return;

    setStatus('redirecting');

    // Record click event
    const recordClick = async () => {
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vatpvfrbgeatdeypqcrv.supabase.co';
        const API_URL = `${SUPABASE_URL}/functions/v1/make-server-79198001`;
        
        const platformKey = link?.services[0]?.platform || 'unknown';
        await fetch(`${API_URL}/smart-links/${slug}/events/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformKey,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error('Failed to record click:', err);
      }
    };

    recordClick();
    window.location.replace(targetUrl);
  }, [targetUrl, slug, link, status]);

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
