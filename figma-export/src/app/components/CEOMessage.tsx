import { Card } from './ui/card';
import { Quote } from 'lucide-react';

export function CEOMessage() {
  return (
    <section className="bg-[#0A0A0A] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            From the founder
          </div>
          <h1 className="text-[2rem] font-bold text-white sm:text-[2.5rem]">Message from Our CEO</h1>
          <p className="mt-3 text-sm leading-6 text-[#B3B3B3]">
            A letter from our founder on the mission and vision of AMT DISTRO
          </p>
        </div>

        {/* CEO Profile */}
        <Card className="mb-8 border-[#FF6B00]/10 bg-[#161616] p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FFD600] text-4xl font-bold text-white shadow-[0_0_40px_rgba(255,107,0,0.15)]">
              AA
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Adebanjo Ayomide</h2>
              <p className="mt-1 text-sm font-medium text-[#FF6B00]">Founder & CEO</p>
              <p className="mt-4 text-sm leading-6 text-[#B3B3B3]">
                Former music producer and artist manager with over 15 years of experience in the
                African music industry. Passionate about empowering independent artists and
                democratizing music distribution across the continent.
              </p>
            </div>
          </div>
        </Card>

        {/* Message */}
        <Card className="relative border-[#FF6B00]/10 bg-[#161616] p-8 sm:p-10 lg:p-12">
          <Quote className="absolute left-8 top-8 h-12 w-12 text-[#FF6B00]/10" />
          <div className="relative z-10 space-y-5 text-sm leading-7 text-[#B3B3B3]">
            <p className="text-lg font-medium text-white">
              Dear Artist,
            </p>

            <p>
              When I started my journey in the music industry 15 years ago, I quickly realized that
              the system was broken. Talented artists were losing significant portions of their
              earnings to distributors who offered little value beyond basic distribution. Record
              labels held all the power, and independent artists had to navigate a maze of
              complexity just to get their music heard.
            </p>

            <p>
              I watched friends and colleagues pour their hearts into creating beautiful music, only
              to receive pennies on the dollar. I saw incredible talent go undiscovered because they
              couldn't afford the upfront costs or didn't have the right connections. This wasn't
              just unfair — it was unsustainable for the future of African music.
            </p>

            <p>
              That's why we built <span className="font-semibold text-white">AMT DISTRO</span>. We
              envisioned a platform where artists retain 100% of their royalties, where pricing is
              transparent, and where technology empowers rather than complicates. We wanted to
              create a level playing field where talent, not connections or wealth, determines
              success.
            </p>

            <p>
              Today, I'm proud to say that over 10,000 artists trust us with their music. We've paid
              out over ₦500 million in royalties — money that stays in artists' pockets where it
              belongs. But we're just getting started. Our vision is to make AMT DISTRO the go-to
              platform for every independent artist and label across Africa and beyond.
            </p>

            <p>
              To every artist reading this: your music matters. Your dreams are valid. Whether
              you're releasing your first single or your tenth album, we're here to support you every
              step of the way. You focus on creating; we'll handle the rest.
            </p>

            <p>
              The future of African music is independent, and it's incredibly bright. Thank you for
              trusting us to be part of your journey.
            </p>

            <div className="pt-6">
              <p className="text-base text-white">Keep creating,</p>
              <p className="mt-2 text-base font-semibold text-white">Adebanjo Ayomide</p>
              <p className="text-sm text-[#FF6B00]">Founder & CEO, AMT DISTRO</p>
            </div>
          </div>
        </Card>

        {/* Values Highlight */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
            <div className="text-3xl font-bold text-[#FFD600]">100%</div>
            <div className="mt-1 text-sm text-[#B3B3B3]">Royalty Retention</div>
          </Card>
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
            <div className="text-3xl font-bold text-[#FFD600]">10K+</div>
            <div className="mt-1 text-sm text-[#B3B3B3]">Happy Artists</div>
          </Card>
          <Card className="border-[#FF6B00]/10 bg-[#161616] p-6 text-center">
            <div className="text-3xl font-bold text-[#FFD600]">₦500M+</div>
            <div className="mt-1 text-sm text-[#B3B3B3]">Paid to Artists</div>
          </Card>
        </div>
      </div>
    </section>
  );
}
