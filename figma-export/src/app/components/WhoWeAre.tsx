import { Card } from './ui/card';
import { Globe, Target, Award, Heart } from 'lucide-react';

export function WhoWeAre() {
  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            About Us
          </div>
          <h1 className="text-[2rem] font-bold text-white sm:text-[2.5rem]">Who We Are</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-[#B3B3B3]">
            We're on a mission to democratize music distribution and empower artists across Africa
            and beyond
          </p>
        </div>

        {/* Story Section */}
        <Card className="mb-10 border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10">
          <h2 className="mb-5 text-2xl font-bold text-white">Our Story</h2>
          <div className="space-y-4 text-sm leading-7 text-[#B3B3B3]">
            <p>
              Founded in 2020, <span className="font-semibold text-white">AMT DISTRO</span> emerged from a simple observation: talented artists in
              Nigeria and across Africa were being held back by complex, expensive, and unfair music
              distribution systems. We believed there had to be a better way.
            </p>
            <p>
              Starting with just a handful of artists in Lagos, we built a platform that puts
              creators first. No hidden fees, no percentage cuts, just straightforward distribution
              that lets you keep 100% of your royalties. Today, we're proud to serve thousands of
              artists across the continent and around the world.
            </p>
            <p>
              Our team combines decades of experience in music, technology, and artist development.
              We're musicians, engineers, and music lovers who understand the challenges artists
              face because many of us have faced them ourselves.
            </p>
          </div>
        </Card>

        {/* Values */}
        <div className="mb-12">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">Our Core Values</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10">
                <Heart className="h-6 w-6 text-[#FF6B00]" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Artist-First</h3>
              <p className="text-sm leading-6 text-[#B3B3B3]">
                Every decision we make is guided by what's best for artists. You keep 100% of your
                royalties because your music, your earnings.
              </p>
            </Card>

            <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10">
                <Globe className="h-6 w-6 text-[#FF6B00]" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Global Reach</h3>
              <p className="text-sm leading-6 text-[#B3B3B3]">
                We connect African artists to the world while making sure the world discovers
                African talent. Distribution to 150+ platforms worldwide.
              </p>
            </Card>

            <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10">
                <Target className="h-6 w-6 text-[#FF6B00]" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">Transparency</h3>
              <p className="text-sm leading-6 text-[#B3B3B3]">
                No hidden fees, no surprises. Clear pricing, detailed analytics, and honest
                communication at every step.
              </p>
            </Card>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="mb-12 grid gap-5 md:grid-cols-2">
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Our Mission</h3>
            <p className="text-sm leading-7 text-[#B3B3B3]">
              To provide every artist with the tools, technology, and support they need to share
              their music with the world and build sustainable careers in the music industry.
            </p>
          </Card>

          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#FFD600]">
              <Award className="h-5 w-5 text-white" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-white">Our Vision</h3>
            <p className="text-sm leading-7 text-[#B3B3B3]">
              To become Africa's leading music distribution platform, recognized globally for
              empowering independent artists and labels to compete on equal footing with major
              labels.
            </p>
          </Card>
        </div>

        {/* Stats */}
        <Card className="border-[#FF6B00]/20 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-8 sm:p-10">
          <div className="grid gap-6 text-center md:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="mt-1 text-sm text-white/80">Active Artists</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">150+</div>
              <div className="mt-1 text-sm text-white/80">Distribution Platforms</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">₦500M+</div>
              <div className="mt-1 text-sm text-white/80">Paid to Artists</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">45+</div>
              <div className="mt-1 text-sm text-white/80">Countries Served</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
