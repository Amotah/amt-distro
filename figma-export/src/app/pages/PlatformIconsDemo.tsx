import { PlatformIconsRow, PlatformIconsCompact, PlatformIconsLarge } from '../components/PlatformIconsRow';

export default function PlatformIconsDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#161616] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-20">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Platform Icons Showcase
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Beautiful, responsive platform icons using Iconify and Tailwind CSS. Choose from standard, compact, or large variants.
          </p>
        </div>

        {/* Variant 1: Standard Row */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Standard Row</h2>
            <p className="text-sm text-gray-400">
              Full featured icons with labels. Best for landing pages and feature showcases.
            </p>
          </div>
          <div className="bg-[#161616]/50 border border-[#FF6B00]/20 rounded-2xl p-8 sm:p-12">
            <PlatformIconsRow className="py-8" />
          </div>
          <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`<PlatformIconsRow className="py-8" />`}
          </pre>
        </section>

        {/* Variant 2: Compact Icons */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Compact Icons</h2>
            <p className="text-sm text-gray-400">
              Icons only (no labels). Perfect for navigation headers, footers, and tight spaces.
            </p>
          </div>
          <div className="bg-[#161616]/50 border border-[#FF6B00]/20 rounded-2xl p-8 sm:p-12">
            <PlatformIconsCompact className="py-8" />
          </div>
          <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`<PlatformIconsCompact className="py-8" />`}
          </pre>
        </section>

        {/* Variant 3: Large Display */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Large Display</h2>
            <p className="text-sm text-gray-400">
              Premium large icons with enhanced styling. Great for hero sections and portfolio displays.
            </p>
          </div>
          <div className="bg-[#161616]/50 border border-[#FF6B00]/20 rounded-2xl p-8 sm:p-12">
            <PlatformIconsLarge className="py-8" />
          </div>
          <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`<PlatformIconsLarge className="py-8" />`}
          </pre>
        </section>

        {/* Features Section */}
        <section className="space-y-6 bg-[#161616]/30 border border-[#FF6B00]/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Iconify Integration</h3>
                <p className="text-sm text-gray-400">Uses Simple Icons collection via @iconify/react</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Brand Colors</h3>
                <p className="text-sm text-gray-400">Each platform uses official brand colors</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Hover Effects</h3>
                <p className="text-sm text-gray-400">Scale 1.05 and opacity 0.9 on hover</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Mobile Responsive</h3>
                <p className="text-sm text-gray-400">Adapts sizing and gaps for all screen sizes</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Accessible</h3>
                <p className="text-sm text-gray-400">ARIA labels and keyboard navigation support</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6B00]/20 text-[#FF6B00] flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-white">Tailwind Styled</h3>
                <p className="text-sm text-gray-400">100% Tailwind CSS, no inline styles</p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Instructions */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Usage Instructions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Import the component</h3>
              <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`import { PlatformIconsRow, PlatformIconsCompact, PlatformIconsLarge } from '@/components/PlatformIconsRow';`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">2. Use in your component</h3>
              <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`export default function MyComponent() {
  return (
    <div>
      <PlatformIconsRow />
      {/* or */}
      <PlatformIconsCompact />
      {/* or */}
      <PlatformIconsLarge />
    </div>
  );
}`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">3. Customize with Tailwind CSS</h3>
              <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`<PlatformIconsRow className="py-16 px-4" />`}
              </pre>
            </div>
          </div>
        </section>

        {/* Platforms Included */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Included Platforms</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg p-3 text-center">
              <p className="text-[#1DB954] font-semibold">Spotify</p>
            </div>
            <div className="bg-[#FFA200]/10 border border-[#FFA200]/30 rounded-lg p-3 text-center">
              <p className="text-[#FFA200] font-semibold">Audiomack</p>
            </div>
            <div className="bg-[#FA243C]/10 border border-[#FA243C]/30 rounded-lg p-3 text-center">
              <p className="text-[#FA243C] font-semibold">Apple Music</p>
            </div>
            <div className="bg-[#FF0000]/10 border border-[#FF0000]/30 rounded-lg p-3 text-center">
              <p className="text-[#FF0000] font-semibold">YouTube Music</p>
            </div>
            <div className="bg-[#F97316]/10 border border-[#F97316]/30 rounded-lg p-3 text-center">
              <p className="text-[#F97316] font-semibold">Boomplay</p>
            </div>
            <div className="bg-[#FF5500]/10 border border-[#FF5500]/30 rounded-lg p-3 text-center">
              <p className="text-[#FF5500] font-semibold">SoundCloud</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
