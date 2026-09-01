import React, { useEffect, useState } from 'react';
import { Music, ExternalLink, Share2, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';

interface DSPUrl {
  spotify?: string;
  apple_music?: string;
  youtube_music?: string;
  boomplay?: string;
  audiomack?: string;
  amazon_music?: string;
  deezer?: string;
  tidal?: string;
  bandcamp?: string;
  soundcloud?: string;
  pimp?: string;
  anghami?: string;
  jio_saavn?: string;
}

interface SmartLinkLandingPageProps {
  releaseId?: string;
  releaseTitle: string;
  artistName: string;
  coverArtUrl?: string;
  dspUrls: DSPUrl;
  slug?: string;
}

// Africa-first platform ordering with icons and branding
const AFRICA_FIRST_PLATFORMS = [
  {
    key: 'boomplay',
    name: 'Boomplay',
    icon: '🎵',
    color: 'from-yellow-500 to-orange-500',
    textColor: 'text-yellow-600',
    description: '#1 in Africa',
    region: 'Africa',
  },
  {
    key: 'audiomack',
    name: 'Audiomack',
    icon: '🔊',
    color: 'from-red-500 to-pink-500',
    textColor: 'text-red-600',
    description: 'African Hip-Hop Hub',
    region: 'Africa',
  },
  {
    key: 'youtube_music',
    name: 'YouTube Music',
    icon: '▶️',
    color: 'from-red-500 to-red-600',
    textColor: 'text-red-600',
    description: 'Videos & Streaming',
    region: 'Global',
  },
  {
    key: 'spotify',
    name: 'Spotify',
    icon: '🎧',
    color: 'from-green-500 to-emerald-600',
    textColor: 'text-green-600',
    description: 'Global Streaming',
    region: 'Global',
  },
  {
    key: 'apple_music',
    name: 'Apple Music',
    icon: '🍎',
    color: 'from-gray-600 to-gray-800',
    textColor: 'text-gray-700',
    description: 'Premium Audio',
    region: 'Global',
  },
  {
    key: 'amazon_music',
    name: 'Amazon Music',
    icon: '📦',
    color: 'from-orange-400 to-yellow-500',
    textColor: 'text-orange-600',
    description: 'Prime Music',
    region: 'Global',
  },
  {
    key: 'deezer',
    name: 'Deezer',
    icon: '📻',
    color: 'from-orange-500 to-red-500',
    textColor: 'text-orange-600',
    description: 'Radio & Playlists',
    region: 'Europe',
  },
  {
    key: 'tidal',
    name: 'TIDAL',
    icon: '🌊',
    color: 'from-cyan-500 to-blue-600',
    textColor: 'text-cyan-600',
    description: 'Hi-Fi Audio',
    region: 'Global',
  },
  {
    key: 'anghami',
    name: 'Anghami',
    icon: '🎼',
    color: 'from-pink-500 to-rose-600',
    textColor: 'text-pink-600',
    description: 'MENA Streaming',
    region: 'MENA',
  },
  {
    key: 'jio_saavn',
    name: 'JioSaavn',
    icon: '💎',
    color: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600',
    description: 'South Asian Hub',
    region: 'South Asia',
  },
  {
    key: 'pimp',
    name: 'PIMP',
    icon: '👑',
    color: 'from-purple-500 to-indigo-600',
    textColor: 'text-purple-600',
    description: 'African Platform',
    region: 'Africa',
  },
  {
    key: 'bandcamp',
    name: 'Bandcamp',
    icon: '🎹',
    color: 'from-blue-600 to-cyan-500',
    textColor: 'text-blue-700',
    description: 'Artist-Friendly',
    region: 'Global',
  },
  {
    key: 'soundcloud',
    name: 'SoundCloud',
    icon: '☁️',
    color: 'from-orange-400 to-red-500',
    textColor: 'text-orange-600',
    description: 'Independent Music',
    region: 'Global',
  },
];

export function SmartLinkLandingPage({
  releaseTitle,
  artistName,
  coverArtUrl,
  dspUrls,
  slug = 'my-song',
}: SmartLinkLandingPageProps) {
  const [copied, setCopied] = useState(false);
  const [clickedPlatforms, setClickedPlatforms] = useState<Set<string>>(new Set());

  // Track platform clicks
  const handlePlatformClick = async (platformKey: string, url: string) => {
    // Record click event
    try {
      await fetch('/make-server-79198001/smart-links/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformKey,
          url,
          slug,
          device: detectDevice(),
          os: detectOS(),
        }),
      }).catch(() => {}); // Silent fail for analytics
    } catch (err) {
      console.error('Failed to track click:', err);
    }

    setClickedPlatforms((prev) => new Set([...prev, platformKey]));

    // Open link in new tab
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, 100);
  };

  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: `${releaseTitle} - ${artistName}`,
      text: `Listen to "${releaseTitle}" by ${artistName} on all platforms!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  // Get available platforms (filter out undefined URLs)
  const availablePlatforms = AFRICA_FIRST_PLATFORMS.filter(
    (platform) => dspUrls[platform.key as keyof DSPUrl]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-orange-500" />
            <span className="font-semibold text-white hidden sm:inline">AMTDistro</span>
          </div>
          <div className="text-xs text-gray-400">Africa's Music Distribution</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Cover Art & Release Info */}
        <div className="text-center mb-8 sm:mb-12">
          {coverArtUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={coverArtUrl}
                alt={releaseTitle}
                className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl shadow-2xl object-cover"
              />
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{releaseTitle}</h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-2">by {artistName}</p>

          <div className="text-sm text-gray-400">
            Listen on your favorite platform
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8 sm:mb-12">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="gap-2 text-sm"
            size="sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="gap-2 text-sm"
            size="sm"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {/* Platforms Grid */}
        <div className="space-y-4">
          {/* Africa-First Section */}
          {availablePlatforms.filter((p) => p.region === 'Africa').length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-xs">
                  🌍
                </span>
                African Platforms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availablePlatforms
                  .filter((p) => p.region === 'Africa')
                  .map((platform) => (
                    <PlatformCard
                      key={platform.key}
                      platform={platform}
                      url={dspUrls[platform.key as keyof DSPUrl]!}
                      isClicked={clickedPlatforms.has(platform.key)}
                      onClickPlatform={handlePlatformClick}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Global Streaming Section */}
          {availablePlatforms.filter((p) => p.region === 'Global').length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">
                  🌐
                </span>
                Global Streaming
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availablePlatforms
                  .filter((p) => p.region === 'Global')
                  .map((platform) => (
                    <PlatformCard
                      key={platform.key}
                      platform={platform}
                      url={dspUrls[platform.key as keyof DSPUrl]!}
                      isClicked={clickedPlatforms.has(platform.key)}
                      onClickPlatform={handlePlatformClick}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Regional Section */}
          {availablePlatforms.filter((p) => !['Africa', 'Global'].includes(p.region)).length >
            0 && (
            <div>
              <h2 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">
                  📍
                </span>
                Regional Platforms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availablePlatforms
                  .filter((p) => !['Africa', 'Global'].includes(p.region))
                  .map((platform) => (
                    <PlatformCard
                      key={platform.key}
                      platform={platform}
                      url={dspUrls[platform.key as keyof DSPUrl]!}
                      isClicked={clickedPlatforms.has(platform.key)}
                      onClickPlatform={handlePlatformClick}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>Generated with ❤️ by AMTDistro | Empowering African Artists</p>
        </div>
      </div>
    </div>
  );
}

interface PlatformCardProps {
  platform: (typeof AFRICA_FIRST_PLATFORMS)[0];
  url: string;
  isClicked: boolean;
  onClickPlatform: (key: string, url: string) => void;
}

function PlatformCard({ platform, url, isClicked, onClickPlatform }: PlatformCardProps) {
  return (
    <button
      onClick={() => onClickPlatform(platform.key, url)}
      className={`relative group overflow-hidden rounded-lg p-4 text-left transition-all duration-300 transform hover:scale-105 active:scale-95 ${
        isClicked
          ? `bg-gradient-to-r ${platform.color} opacity-60`
          : `bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30`
      }`}
    >
      {/* Gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${platform.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{platform.icon}</span>
            <h3 className="font-bold text-white group-hover:text-white">{platform.name}</h3>
          </div>
          <p className={`text-xs ${platform.textColor}`}>{platform.description}</p>
        </div>

        <ExternalLink
          className={`w-4 h-4 ml-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
            isClicked ? 'text-white' : 'text-gray-400 group-hover:text-white'
          }`}
        />
      </div>

      {/* Checkmark for clicked */}
      {isClicked && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4 text-white animate-pulse" />
        </div>
      )}
    </button>
  );
}

// Helper functions
function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.indexOf('Win') > -1) return 'Windows';
  if (ua.indexOf('Mac') > -1) return 'macOS';
  if (ua.indexOf('Linux') > -1) return 'Linux';
  if (ua.indexOf('Android') > -1) return 'Android';
  if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
  return 'Unknown';
}
