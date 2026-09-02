import { Icon } from '@iconify/react';

interface PlatformIconConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  href?: string;
}

const PLATFORM_ICONS: PlatformIconConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: 'simple-icons:spotify',
    color: '#1DB954',
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    icon: 'simple-icons:audiomack',
    color: '#FFA200',
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    icon: 'simple-icons:applemusic',
    color: '#FA243C',
  },
  {
    id: 'youtube',
    name: 'YouTube Music',
    icon: 'simple-icons:youtubemusic',
    color: '#FF0000',
  },
  {
    id: 'boomplay',
    name: 'Boomplay',
    icon: 'simple-icons:boomplay',
    color: '#F97316',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: 'simple-icons:soundcloud',
    color: '#FF5500',
  },
];

export function PlatformIconsRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-10 ${className}`}>
      {PLATFORM_ICONS.map((platform) => (
        <div
          key={platform.id}
          className="group flex flex-col items-center gap-2 transition-all duration-300"
          title={platform.name}
        >
          {/* Icon Container */}
          <div className="flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-xl border-2 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:opacity-90 group-hover:border-opacity-50"
            style={{
              borderColor: `${platform.color}33`,
              backgroundColor: `${platform.color}12`,
            }}
          >
            <Icon
              icon={platform.icon}
              width={32}
              height={32}
              className="transition-all duration-300"
              style={{ color: platform.color }}
            />
          </div>

          {/* Label */}
          <span className="text-xs sm:text-sm font-medium text-center text-gray-200 group-hover:text-white transition-colors duration-300">
            {platform.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// Variant: Icons only (no labels) - for compact display
export function PlatformIconsCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 ${className}`}>
      {PLATFORM_ICONS.map((platform) => (
        <button
          key={platform.id}
          type="button"
          className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg border-2 border-transparent transition-all duration-300 hover:scale-105 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
          style={{
            borderColor: `${platform.color}33`,
            backgroundColor: `${platform.color}12`,
          }}
          aria-label={platform.name}
          title={platform.name}
        >
          <Icon
            icon={platform.icon}
            width={24}
            height={24}
            className="transition-all duration-300"
            style={{ color: platform.color }}
          />
        </button>
      ))}
    </div>
  );
}

// Variant: Large icons with detailed view
export function PlatformIconsLarge({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-8 sm:gap-10 lg:gap-12 ${className}`}>
      {PLATFORM_ICONS.map((platform) => (
        <div
          key={platform.id}
          className="group flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105"
        >
          {/* Icon Container */}
          <div
            className="flex items-center justify-center h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 shadow-lg transition-all duration-300 group-hover:shadow-xl"
            style={{
              borderColor: `${platform.color}44`,
              backgroundColor: `${platform.color}15`,
            }}
          >
            <Icon
              icon={platform.icon}
              width={48}
              height={48}
              className="transition-all duration-300"
              style={{ color: platform.color }}
            />
          </div>

          {/* Label and Description */}
          <div className="text-center">
            <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-opacity-90 transition-colors">
              {platform.name}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}
