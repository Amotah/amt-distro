import { useState } from 'react';

declare global {
  interface ImportMeta {
    glob: (
      pattern: string,
      options?: { eager?: boolean; import?: string; query?: string },
    ) => Record<string, string>;
  }
}

type BrandConfig = {
  label: string;
  surfaceClassName: string;
  logoUrl?: string;
  localLogoUrl?: string;
  imagePaddingClassName?: string;
  monogram?: string;
  monogramClassName?: string;
};

const LOCAL_LOGOS = import.meta.glob('/Logos/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const LOCAL_LOGO_FILES: Record<string, string> = {
  spotify: 'logos--spotify.svg',
  apple: 'selfhst--apple-music.svg',
  apple_music: 'selfhst--apple-music.svg',
  audiomack: 'thesvg-color--audiomack.svg',
  boomplay: 'arcticons--boomplay.svg',
  youtube: 'logos--youtube.svg',
  youtube_music: 'thesvg-color--youtube-music.svg',
  youtubemusic: 'thesvg-color--youtube-music.svg',
  deezer: 'selfhst--deezer.svg',
  tidal: 'logos--tidal.svg',
  amazon: 'thesvg-color--amazon-music.svg',
  amazon_music: 'thesvg-color--amazon-music.svg',
  amazonmusic: 'thesvg-color--amazon-music.svg',
  soundcloud: 'logos--soundcloud.svg',
  pandora: 'thesvg-color--pandora.svg',
  napster: 'fa-brands--napster.svg',
  anghami: 'arcticons--anghami.svg',
  instagram: 'skill-icons--instagram.svg',
  facebook: 'devicon--facebook.svg',
  tiktok: 'logos--tiktok.svg',
  jiosaavn: 'arcticons--jiosaavn.svg',
  tencent_music_qq_music: 'thesvg-color--tencent.svg',
  netease_cloud_music: 'thesvg-color--netease-cloud-music.svg',
  itunes_store: 'thesvg-color--itunes.svg',
  awa_music: 'arcticons--awa.svg',
};

function getLocalLogoUrl(platformKey: string) {
  const fileName = LOCAL_LOGO_FILES[platformKey];
  return fileName ? LOCAL_LOGOS[`/Logos/${fileName}`] : undefined;
}

function buildIconifyLogoUrl(iconName: string, size = 96) {
  return `https://api.iconify.design/simple-icons/${iconName}.svg?height=${size}`;
}

const PLATFORM_LOGOS: Record<string, BrandConfig> = {
  spotify: {
    label: 'Spotify',
    surfaceClassName: 'border-[#1DB954]/30 bg-[#1DB954]/12',
    logoUrl: buildIconifyLogoUrl('spotify'),
    imagePaddingClassName: 'p-1.5',
  },
  apple: {
    label: 'Apple Music',
    surfaceClassName: 'border-[#FA243C]/30 bg-[#FA243C]/12',
    logoUrl: buildIconifyLogoUrl('applemusic'),
    imagePaddingClassName: 'p-1',
  },
  apple_music: {
    label: 'Apple Music',
    surfaceClassName: 'border-[#FA243C]/30 bg-[#FA243C]/12',
    logoUrl: buildIconifyLogoUrl('applemusic'),
    imagePaddingClassName: 'p-1',
  },
  audiomack: {
    label: 'Audiomack',
    surfaceClassName: 'border-[#FFA200]/30 bg-[#FFA200]/12',
    logoUrl: buildIconifyLogoUrl('audiomack'),
    imagePaddingClassName: 'p-1',
  },
  boomplay: {
    label: 'Boomplay',
    surfaceClassName: 'border-[#F97316]/30 bg-[#F97316]/14',
    logoUrl: buildIconifyLogoUrl('boomplay'),
    imagePaddingClassName: 'p-1',
  },
  youtube: {
    label: 'YouTube',
    surfaceClassName: 'border-[#FF0000]/30 bg-[#FF0000]/12',
    logoUrl: buildIconifyLogoUrl('youtube'),
    imagePaddingClassName: 'p-1',
  },
  youtube_music: {
    label: 'YouTube Music',
    surfaceClassName: 'border-[#FF0000]/30 bg-[#FF0000]/12',
    logoUrl: buildIconifyLogoUrl('youtubemusic'),
    imagePaddingClassName: 'p-1',
  },
  youtubemusic: {
    label: 'YouTube Music',
    surfaceClassName: 'border-[#FF0000]/30 bg-[#FF0000]/12',
    logoUrl: buildIconifyLogoUrl('youtubemusic'),
    imagePaddingClassName: 'p-1',
  },
  deezer: {
    label: 'Deezer',
    surfaceClassName: 'border-[#A238FF]/30 bg-[#A238FF]/12',
    logoUrl: buildIconifyLogoUrl('deezer'),
    imagePaddingClassName: 'p-1',
  },
  tidal: {
    label: 'TIDAL',
    surfaceClassName: 'border-white/15 bg-[#161616]',
    logoUrl: buildIconifyLogoUrl('tidal'),
    imagePaddingClassName: 'p-1.5',
  },
  amazon: {
    label: 'Amazon Music',
    surfaceClassName: 'border-[#00A8E1]/30 bg-[#00A8E1]/12',
    logoUrl: buildIconifyLogoUrl('amazonmusic'),
    imagePaddingClassName: 'p-1',
  },
  amazon_music: {
    label: 'Amazon Music',
    surfaceClassName: 'border-[#00A8E1]/30 bg-[#00A8E1]/12',
    logoUrl: buildIconifyLogoUrl('amazonmusic'),
    imagePaddingClassName: 'p-1',
  },
  amazonmusic: {
    label: 'Amazon Music',
    surfaceClassName: 'border-[#00A8E1]/30 bg-[#00A8E1]/12',
    logoUrl: buildIconifyLogoUrl('amazonmusic'),
    imagePaddingClassName: 'p-1',
  },
  soundcloud: {
    label: 'SoundCloud',
    surfaceClassName: 'border-[#FF5500]/30 bg-[#FF5500]/12',
    logoUrl: buildIconifyLogoUrl('soundcloud'),
    imagePaddingClassName: 'p-1',
  },
  pandora: {
    label: 'Pandora',
    surfaceClassName: 'border-[#3668FF]/30 bg-[#3668FF]/12',
    logoUrl: buildIconifyLogoUrl('pandora'),
    imagePaddingClassName: 'p-1',
  },
  napster: {
    label: 'Napster',
    surfaceClassName: 'border-[#7C3AED]/30 bg-[#7C3AED]/12',
    logoUrl: buildIconifyLogoUrl('napster'),
    imagePaddingClassName: 'p-1',
  },
  anghami: {
    label: 'Anghami',
    surfaceClassName: 'border-[#7C3AED]/30 bg-[#7C3AED]/12',
    logoUrl: buildIconifyLogoUrl('anghami'),
    imagePaddingClassName: 'p-1',
  },
  instagram: {
    label: 'Instagram',
    surfaceClassName: 'border-[#E4405F]/30 bg-[#E4405F]/12',
    logoUrl: buildIconifyLogoUrl('instagram'),
    imagePaddingClassName: 'p-1',
  },
  instagram_facebook: {
    label: 'Instagram/Facebook',
    surfaceClassName: 'border-[#E4405F]/30 bg-[#E4405F]/12',
    logoUrl: buildIconifyLogoUrl('meta'),
    imagePaddingClassName: 'p-1',
  },
  facebook: {
    label: 'Facebook',
    surfaceClassName: 'border-[#1877F2]/30 bg-[#1877F2]/12',
    logoUrl: buildIconifyLogoUrl('facebook'),
    imagePaddingClassName: 'p-1',
  },
  tiktok: {
    label: 'TikTok Music',
    surfaceClassName: 'border-white/15 bg-[#161616]/5',
    logoUrl: buildIconifyLogoUrl('tiktok'),
    imagePaddingClassName: 'p-1',
  },
  kkbox: {
    label: 'KKBOX',
    surfaceClassName: 'border-[#0EA5E9]/30 bg-[#0EA5E9]/12',
    logoUrl: buildIconifyLogoUrl('kkbox'),
    imagePaddingClassName: 'p-1',
  },
  jiosaavn: {
    label: 'JioSaavn',
    surfaceClassName: 'border-[#16A34A]/30 bg-[#16A34A]/12',
    logoUrl: buildIconifyLogoUrl('jiosaavn'),
    imagePaddingClassName: 'p-1',
  },
  joox: {
    label: 'JOOX',
    surfaceClassName: 'border-[#16A34A]/30 bg-[#16A34A]/12',
    logoUrl: buildIconifyLogoUrl('joox'),
    imagePaddingClassName: 'p-1',
  },
  tencent_music_qq_music: {
    label: 'Tencent Music (QQ Music)',
    surfaceClassName: 'border-[#22C55E]/30 bg-[#22C55E]/12',
    logoUrl: buildIconifyLogoUrl('qqmusic'),
    imagePaddingClassName: 'p-1',
  },
  netease_cloud_music: {
    label: 'NetEase Cloud Music',
    surfaceClassName: 'border-[#EF4444]/30 bg-[#EF4444]/12',
    logoUrl: buildIconifyLogoUrl('neteasecloudmusic'),
    imagePaddingClassName: 'p-1',
  },
  itunes_store: {
    label: 'iTunes Store',
    surfaceClassName: 'border-[#FA243C]/30 bg-[#FA243C]/12',
    logoUrl: buildIconifyLogoUrl('appstore'),
    imagePaddingClassName: 'p-1',
  },
  awa_music: {
    label: 'AWA Music',
    surfaceClassName: 'border-[#0EA5E9]/30 bg-[#0EA5E9]/12',
    logoUrl: buildIconifyLogoUrl('awamusic'),
    imagePaddingClassName: 'p-1',
  },
};

function normalizePlatformKey(platform: string) {
  return platform.toLowerCase().replace(/[\s/-]+/g, '_');
}

function getPlatformMeta(platform: string) {
  const normalized = normalizePlatformKey(platform);
  const meta = PLATFORM_LOGOS[normalized] || {
    surfaceClassName: 'border-white/10 bg-[#161616]/5',
    label: platform,
    logoUrl: buildIconifyLogoUrl(normalized),
    monogram: platform.slice(0, 1).toUpperCase(),
    monogramClassName: 'text-white/80',
  };

  return { ...meta, localLogoUrl: getLocalLogoUrl(normalized) };
}

function getTileSizeClass(size: number) {
  if (size <= 18) return 'h-4 w-4';
  if (size <= 20) return 'h-5 w-5';
  if (size <= 24) return 'h-6 w-6';
  if (size <= 28) return 'h-7 w-7';
  if (size <= 32) return 'h-8 w-8';
  return 'h-10 w-10';
}

function getImageSizeClass(size: number) {
  if (size <= 18) return 'h-3 w-3';
  if (size <= 20) return 'h-3.5 w-3.5';
  if (size <= 24) return 'h-4.5 w-4.5';
  if (size <= 28) return 'h-5 w-5';
  if (size <= 32) return 'h-6 w-6';
  return 'h-7 w-7';
}

function getMonogramClass(size: number) {
  if (size <= 18) return 'text-[8px]';
  if (size <= 20) return 'text-[9px]';
  if (size <= 24) return 'text-[10px]';
  if (size <= 28) return 'text-xs';
  if (size <= 32) return 'text-sm';
  return 'text-base';
}

export function PlatformLogo({ platform, size = 28 }: { platform: string; size?: number }) {
  const meta = getPlatformMeta(platform);
  const tileSizeClass = getTileSizeClass(size);
  const imageSizeClass = getImageSizeClass(size);
  const monogramClass = getMonogramClass(size);
  const [imageSource, setImageSource] = useState<'local' | 'iconify'>(meta.localLogoUrl ? 'local' : 'iconify');

  const iconifyUrl = meta.logoUrl?.includes('iconify')
    ? `${meta.logoUrl}${meta.logoUrl.includes('?') ? '&' : '?'}width=${size}&height=${size}`
    : meta.logoUrl;
  const imageUrl = imageSource === 'local' ? meta.localLogoUrl : iconifyUrl;

  return (
    <div
      className={`flex items-center justify-center rounded-xl border shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${tileSizeClass} ${meta.surfaceClassName}`}
      aria-label={meta.label}
      title={meta.label}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={meta.label}
          className={`${imageSizeClass} object-contain ${meta.imagePaddingClassName || ''}`}
          loading="lazy"
          onError={() => setImageSource('iconify')}
        />
      ) : (
        <span className={`font-black uppercase tracking-tight ${monogramClass} ${meta.monogramClassName || 'text-white/80'}`}>
          {meta.monogram}
        </span>
      )}
    </div>
  );
}

export default function MusicPlatformLogos({
  platforms,
  size = 28,
  hideLabels = false,
  compact = false,
  className = '',
}: {
  platforms: string[];
  size?: number;
  hideLabels?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const containerClassName = className.includes('grid')
    ? className.trim()
    : `flex flex-wrap gap-3 ${className}`.trim();

  return (
    <div className={containerClassName}>
      {platforms.map((platform) => {
        const meta = getPlatformMeta(platform);

        return (
          <div key={`${platform}-${meta.label}`} className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} rounded-xl`}>
            <PlatformLogo platform={platform} size={size} />
            {!hideLabels && <span className="text-sm font-medium text-inherit">{meta.label}</span>}
          </div>
        );
      })}
    </div>
  );
}