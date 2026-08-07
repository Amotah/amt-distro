import { Card } from './ui/card';
import { Globe, Target, Heart, Award, Sparkles } from 'lucide-react';

export function WhoWeAre() {
  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <span className="inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            About Us
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Empowering African artists with modern music distribution.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#B3B3B3]">
            AMT DISTRO is the platform built to remove complexity, protect your earnings, and help
            creators grow across Africa and the world. We make distribution simple, transparent,
            and artist-first.
          </p>
        </div>

        <div className="mb-14 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-[#FFD600]/90">Our story</p>
                <h2 className="mt-4 text-3xl font-bold text-white">From Lagos beginnings to global distribution.</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-4 py-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-white" />
                Founded 2020
              </div>
            </div>

            <div className="space-y-5 text-sm leading-7 text-[#D1D5DB]">
              <p>
                We launched AMT DISTRO because talented creators were being held back by opaque fees,
                confusing distribution rules, and platforms that didn’t prioritize artists. Our goal
                is empowering independent musicians with the tools they need to thrive.
              </p>
              <p>
                Today, we serve thousands of artists, labels, and managers across Africa and beyond.
                Our platform combines fast uploads, reliable payments, and analytics that help you
                make smarter decisions for every release.
              </p>
              <p>
                Built by musicians, product builders, and rights experts, AMT DISTRO removes friction
                and lets creators focus on what matters most: making music and growing their audience.
              </p>
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="border-[#FF6B00]/10 bg-[#161616] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white">Our Mission</h3>
              <p className="mt-3 text-sm leading-7 text-[#B3B3B3]">
                Give every artist access to fair distribution, native rights ownership, and tools that
                let music reach the world without compromise.
              </p>
            </Card>

            <Card className="border-[#FF6B00]/10 bg-[#161616] p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00]">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white">Our Vision</h3>
              <p className="mt-3 text-sm leading-7 text-[#B3B3B3]">
                Build the most trusted music distribution ecosystem for African creators, with
                global reach and a commitment to transparency.
              </p>
            </Card>
          </div>
        </div>

        <div className="mb-14 grid gap-6 md:grid-cols-3">
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FF6B00]">
              <Heart className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Artist-First</h3>
            <p className="mt-3 text-sm leading-7 text-[#B3B3B3]">
              Every experience is designed so artists keep 100% of royalties and stay in control.
            </p>
          </Card>
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FF6B00]">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Global Reach</h3>
            <p className="mt-3 text-sm leading-7 text-[#B3B3B3]">
              We connect African artists to listeners on 150+ streaming, download, and social platforms.
            </p>
          </Card>
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FF6B00]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-white">Transparent</h3>
            <p className="mt-3 text-sm leading-7 text-[#B3B3B3]">
              Clear pricing, simple release workflows, and no hidden charges at any stage.
            </p>
          </Card>
        </div>

        <Card className="rounded-3xl border border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-10 text-white">
          <div className="grid gap-8 text-center md:grid-cols-4">
            <div>
              <div className="text-4xl font-bold">10K+</div>
              <div className="mt-2 text-sm text-white/80">Active Artists</div>
            </div>
            <div>
              <div className="text-4xl font-bold">150+</div>
              <div className="mt-2 text-sm text-white/80">Distribution Platforms</div>
            </div>
            <div>
              <div className="text-4xl font-bold">₦500M+</div>
              <div className="mt-2 text-sm text-white/80">Paid to Artists</div>
            </div>
            <div>
              <div className="text-4xl font-bold">45+</div>
              <div className="mt-2 text-sm text-white/80">Countries Served</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
