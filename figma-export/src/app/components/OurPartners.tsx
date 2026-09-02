import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Handshake, Globe, ArrowRight } from 'lucide-react';

const partners = [
  { name: 'Spotify', description: 'Global streaming leader with playlist reach and artist discovery.', domain: 'spotify.com' },
  { name: 'Apple Music', description: 'Premium audio ecosystem with powerful editorial playlists.', domain: 'apple.com' },
  { name: 'YouTube Music', description: 'Video-powered music discovery for every release.', domain: 'youtube.com' },
  { name: 'Amazon Music', description: 'Streaming and download access across Amazon devices.', domain: 'music.amazon.com' },
  { name: 'SoundCloud', description: 'Creator-first platform for independent music and fan engagement.', domain: 'soundcloud.com' },
  { name: 'TikTok', description: 'Viral social discovery that drives streams and engagements.', domain: 'tiktok.com' },
];

function getLogoSrc(domain: string) {
  return `https://img.logo.dev/${domain}?size=220`;
}

export function OurPartners() {
  const [activePartner, setActivePartner] = useState(partners[0]);

  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            Partners
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Distribution partners that help your music travel further.
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#B3B3B3]">
            We collaborate with leading streaming, social, and technology platforms to make sure independent artists are seen, heard, and rewarded.
          </p>
        </div>

        <div className="mb-12 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 shadow-[0_24px_80px_rgba(255,107,0,0.08)]">
            <h2 className="text-2xl font-bold text-white mb-4">Featured Partner Network</h2>
            <p className="mb-8 text-sm leading-7 text-[#B3B3B3]">
              Our partner ecosystem connects your releases to global listeners across platform types, with optimized delivery and artist-friendly reporting.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <button
                  key={partner.name}
                  type="button"
                  onClick={() => setActivePartner(partner)}
                  className={`group rounded-3xl border p-4 text-left transition duration-200 ${
                    activePartner.name === partner.name
                      ? 'border-[#FF6B00] bg-[#1A1410]'
                      : 'border-white/10 bg-[#111111] hover:border-[#FF6B00]/50 hover:bg-[#161616] hover:shadow-[0_0_28px_rgba(255,107,0,0.18)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] transition duration-200 group-hover:shadow-[0_0_22px_rgba(255,107,0,0.42)] group-hover:ring-1 group-hover:ring-[#FFD600]/40">
                      <img
                        src={getLogoSrc(partner.domain)}
                        alt={`${partner.name} logo`}
                        className="h-8 w-8 object-contain transition duration-200 group-hover:scale-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{partner.name}</p>
                      <p className="text-xs text-[#B3B3B3]">{partner.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border border-[#FF6B00]/10 bg-[#161616] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-[#FFD600]">Selected partner</p>
                  <h3 className="text-2xl font-semibold text-white">{activePartner.name}</h3>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-[#D1D5DB]">{activePartner.description}</p>
              <div className="mt-6 rounded-3xl border border-white/10 bg-[#0B0B0B] p-5">
                <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                  <span>Official website</span>
                  <span>{activePartner.domain}</span>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90 sm:w-auto"
                  onClick={() => window.open(`https://${activePartner.domain}`, '_blank')}
                >
                  Visit Partner Site
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/10 sm:w-auto"
                  onClick={() => setActivePartner(partners[0])}
                >
                  Reset Selection
                </Button>
              </div>
            </Card>

            <Card className="rounded-3xl border border-[#FF6B00]/10 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-8 text-[#0A0A0A]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#0A0A0A]/80">
                <Globe className="h-4 w-4" />
                Global partner coverage
              </div>
              <h3 className="mt-4 text-2xl font-bold">150+ platforms connected</h3>
              <p className="mt-4 text-sm leading-7 text-[#0A0A0A]/80">
                Every release is delivered across the same trusted partner network, giving you fast access to audiences across continents and markets.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#0A0A0A]">
                <ArrowRight className="h-4 w-4" />
                <span>Partnered for better distribution and exposure.</span>
              </div>
            </Card>
          </div>
        </div>

        <Card className="rounded-3xl border border-[#FF6B00]/10 bg-[#161616] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#FFD600]">Partner Ecosystem</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">A better distribution experience for artists and labels.</h2>
            </div>
            <Button className="w-full bg-[#FF6B00] text-white hover:bg-[#FF6B00]/90 lg:w-auto" onClick={() => window.location.href = '/contact'}>
              Start a Partnership
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
