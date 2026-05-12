import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ExternalLink, Handshake } from 'lucide-react';

const platformPartners = [
  { name: '7Digital', category: 'Streaming', domain: '7digital.com' },
  { name: 'Spotify', category: 'Streaming', domain: 'spotify.com' },
  { name: 'Apple Music', category: 'Streaming', domain: 'apple.com' },
  { name: 'YouTube Music', category: 'Streaming', domain: 'youtube.com' },
  { name: 'Amazon Music', category: 'Streaming', domain: 'music.amazon.com' },
  { name: 'Deezer', category: 'Streaming', domain: 'deezer.com' },
  { name: 'TIDAL', category: 'Streaming', domain: 'tidal.com' },
  { name: 'Pandora', category: 'Streaming', domain: 'pandora.com' },
  { name: 'SoundCloud', category: 'Streaming', domain: 'soundcloud.com' },
  { name: 'Audiomack', category: 'Streaming', domain: 'audiomack.com' },
  { name: 'Boomplay', category: 'Streaming', domain: 'boomplay.com' },
  { name: 'Anghami', category: 'Streaming', domain: 'anghami.com' },
  { name: 'Napster', category: 'Streaming', domain: 'napster.com' },
  { name: 'Qobuz', category: 'Streaming', domain: 'qobuz.com' },
  { name: 'JioSaavn', category: 'Streaming', domain: 'jiosaavn.com' },
  { name: 'Gaana', category: 'Streaming', domain: 'gaana.com' },
  { name: 'Tencent Music (QQ Music)', category: 'Streaming', domain: 'y.qq.com' },
  { name: 'KuGou Music', category: 'Streaming', domain: 'kugou.com' },
  { name: 'Kuwo Music', category: 'Streaming', domain: 'kuwo.cn' },
  { name: 'NetEase Cloud Music', category: 'Streaming', domain: 'music.163.com' },
  { name: 'Melon', category: 'Streaming', domain: 'melon.com' },
  { name: 'Genie Music', category: 'Streaming', domain: 'genie.co.kr' },
  { name: 'FLO', category: 'Streaming', domain: 'music-flo.com' },
  { name: 'LINE MUSIC', category: 'Streaming', domain: 'music.line.me' },
  { name: 'AWA Music', category: 'Streaming', domain: 'awa.fm' },
  { name: 'KKBOX', category: 'Streaming', domain: 'kkbox.com' },
  { name: 'JOOX', category: 'Streaming', domain: 'joox.com' },
  { name: 'Mixcloud', category: 'Streaming', domain: 'mixcloud.com' },
  { name: 'Beatport', category: 'Download Store', domain: 'beatport.com' },
  { name: 'Yandex Music', category: 'Streaming', domain: 'music.yandex.ru' },
  { name: 'Claro Música', category: 'Streaming', domain: 'claromusica.com' },
  { name: 'Hungama Music', category: 'Streaming', domain: 'hungama.com' },
  { name: 'Trebel Music', category: 'Streaming', domain: 'trebel.io' },
  { name: 'iTunes Store', category: 'Download Store', domain: 'apple.com' },
  { name: 'Amazon Music Store', category: 'Download Store', domain: 'music.amazon.com' },
  { name: 'TikTok', category: 'Social Platform', domain: 'tiktok.com' },
  { name: 'Twitch', category: 'Social Platform', domain: 'twitch.tv' },
  { name: 'Instagram', category: 'Social Platform', domain: 'instagram.com' },
  { name: 'Facebook', category: 'Social Platform', domain: 'facebook.com' },
  { name: 'YouTube', category: 'Content ID Platform', domain: 'youtube.com' },
  { name: 'Xiami', category: 'Streaming', domain: 'xiami.com' },
];

const logoDomainMap: Record<string, string> = {
  '7Digital': '7digital.com',
  'Apple Music': 'apple.com',
  'YouTube Music': 'youtube.com',
  'YouTube': 'youtube.com',
  'Tencent Music (QQ Music)': 'qq.com',
  'Kuwo Music': 'kuwo.cn',
  'NetEase Cloud Music': '163.com',
  Melon: 'melon.com',
  'Genie Music': 'genie.co.kr',
  FLO: 'flo.com',
  'LINE MUSIC': 'line.me',
  'AWA Music': 'awa.fm',
  Mixcloud: 'mixcloud.com',
  Beatport: 'beatport.com',
  Twitch: 'twitch.tv',
  Xiami: 'xiami.com',
};

const providedPartnerLogoMap: Record<string, string> = {
  '7Digital': '/platform-logos/logo-2/7Digital.png',
  Spotify: '/platform-logos/logo-2/Spotify.png',
  'Apple Music': '/platform-logos/logo-2/AppleMusic.png',
  'YouTube Music': '/platform-logos/logo-2/YoutubeMusic.png',
  'Amazon Music': '/platform-logos/logo-2/Amazon.png',
  Deezer: '/platform-logos/logo-2/Deezer.png',
  TIDAL: '/platform-logos/logo-2/TIDAL.png',
  Pandora: '/platform-logos/logo-2/PANDORA.jpg',
  SoundCloud: '/platform-logos/logo-2/Soundcloud.png',
  Audiomack: '/platform-logos/logo-2/Audiomack.png',
  Boomplay: '/platform-logos/logo-2/Boomplay.png',
  Napster: '/platform-logos/logo-2/Napster.jpg',
  'Tencent Music (QQ Music)': '/platform-logos/logo-2/Tencent.png',
  'NetEase Cloud Music': '/platform-logos/logo-2/netease.jpg',
  'AWA Music': '/platform-logos/logo-2/AWA.png',
  KKBOX: '/platform-logos/logo-2/kkbox.jpg',
  JOOX: '/platform-logos/logo-2/JOOX.jpg',
  Mixcloud: '/platform-logos/logo-2/mixcloud.jpg',
  Beatport: '/platform-logos/logo-2/beatport.png',
  'iTunes Store': '/platform-logos/logo-2/iTunes.jpg',
  'Amazon Music Store': '/platform-logos/logo-2/Amazon.png',
  TikTok: '/platform-logos/logo-2/tiktok.png',
  Twitch: '/platform-logos/logo-2/twitch.jpg',
  Instagram: '/platform-logos/logo-2/Meta.jpg',
  Facebook: '/platform-logos/logo-2/Meta.jpg',
  YouTube: '/platform-logos/logo-2/Youtube.png',
  Xiami: '/platform-logos/logo-2/xiami.png',
};

const logo2AutoFileMap: Record<string, string> = {
  '7digital': '7Digital.png',
  acrcloud: 'ACRCloud.jpg',
  adaptr: 'Adaptr.jpg',
  amazon: 'Amazon.png',
  applemusic: 'AppleMusic.png',
  'audiblemagicfingerprint': 'Audible Magic fingerprint.jpg',
  audiomack: 'Audiomack.png',
  awa: 'AWA.png',
  beatport: 'beatport.png',
  bmat: 'BMAT.jpg',
  boomplay: 'Boomplay.png',
  deezer: 'Deezer.png',
  gracenote: 'gracenote.png',
  imimobile: 'IMIMOBILE.jpg',
  itunes: 'iTunes.jpg',
  jaxsta: 'Jaxsta.jpg',
  joox: 'JOOX.jpg',
  kdigital: 'Kdigital.jpg',
  kkbox: 'kkbox.jpg',
  lyricfind: 'LyricFind.jpg',
  massivemusic: 'Massive Music.jpg',
  meta: 'Meta.jpg',
  mixcloud: 'mixcloud.jpg',
  napster: 'Napster.jpg',
  netease: 'netease.jpg',
  pandora: 'PANDORA.jpg',
  soundcloud: 'Soundcloud.png',
  spotify: 'Spotify.png',
  tencent: 'Tencent.png',
  tidal: 'TIDAL.png',
  tiktok: 'tiktok.png',
  twitch: 'twitch.jpg',
  xiami: 'xiami.png',
  youtube: 'Youtube.png',
  youtubemusic: 'YoutubeMusic.png',
};

const logo2AliasMap: Record<string, string> = {
  'tencentmusicqqmusic': 'tencent',
  'neteasecloudmusic': 'netease',
  'amazonmusic': 'amazon',
  'amazonmusicstore': 'amazon',
  'itunesstore': 'itunes',
  'linemusic': 'kdigital',
  'jiosaavn': 'kdigital',
  'kugoumusic': 'kdigital',
  'kuwomusic': 'kdigital',
  'hungamamusic': 'kdigital',
  'claromusica': 'kdigital',
};

function normalizePartnerKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getAutoLogo2Src(partnerName: string) {
  const normalized = normalizePartnerKey(partnerName);
  const alias = logo2AliasMap[normalized] || normalized;
  const fileName = logo2AutoFileMap[alias];
  return fileName ? `/platform-logos/logo-2/${fileName}` : null;
}

function getRemoteLogoSrc(partnerName: string, domain: string) {
  const resolvedDomain = logoDomainMap[partnerName] || domain;
  return `https://img.logo.dev/${resolvedDomain}?size=220`;
}

function getPartnerLogoSrc(partnerName: string, domain: string) {
  if (providedPartnerLogoMap[partnerName]) {
    return providedPartnerLogoMap[partnerName];
  }

  const autoLogoSrc = getAutoLogo2Src(partnerName);
  if (autoLogoSrc) {
    return autoLogoSrc;
  }

  return getRemoteLogoSrc(partnerName, domain);
}

function getPartnerMonogram(partnerName: string) {
  return partnerName
    .split(/[\s(]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const technologyPartners = [
  { name: 'AWS', description: 'Cloud Infrastructure', domain: 'aws.amazon.com' },
  { name: 'Stripe', description: 'Payment Processing', domain: 'stripe.com' },
  { name: 'Paystack', description: 'Local Payment Solutions', domain: 'paystack.com' },
  { name: 'Cloudflare', description: 'Security & CDN', domain: 'cloudflare.com' },
];

const industryPartners = [
  { name: 'COSON', description: 'Copyright Society of Nigeria' },
  { name: 'PMAN', description: 'Performing Musicians Association' },
  { name: 'Nigerian Copyright Commission', description: 'Rights Protection' },
  { name: 'AFRIMA', description: 'All Africa Music Awards' },
];

type PartnerPlatform = (typeof platformPartners)[number];

const partnerWikipediaTitles: Record<string, string[]> = {
  '7Digital': ['7digital'],
  Spotify: ['Spotify'],
  'Apple Music': ['Apple_Music'],
  'YouTube Music': ['YouTube_Music'],
  'Amazon Music': ['Amazon_Music'],
  Deezer: ['Deezer'],
  TIDAL: ['Tidal_(service)'],
  Pandora: ['Pandora_Radio'],
  SoundCloud: ['SoundCloud'],
  Audiomack: ['Audiomack'],
  Boomplay: ['Boomplay'],
  Anghami: ['Anghami'],
  Napster: ['Napster'],
  Qobuz: ['Qobuz'],
  JioSaavn: ['JioSaavn'],
  Gaana: ['Gaana_(music_streaming_service)'],
  'Tencent Music (QQ Music)': ['QQ_Music', 'Tencent_Music'],
  'KuGou Music': ['Kugou'],
  'Kuwo Music': ['Kuwo'],
  'NetEase Cloud Music': ['NetEase_Cloud_Music'],
  Melon: ['Melon_(online_music_service)'],
  'Genie Music': ['Genie_Music'],
  FLO: ['FLO_(South_Korean_music_service)'],
  'LINE MUSIC': ['Line_Music'],
  'AWA Music': ['AWA_(music_streaming_service)'],
  KKBOX: ['KKBOX'],
  JOOX: ['JOOX'],
  Mixcloud: ['Mixcloud'],
  Beatport: ['Beatport'],
  'Yandex Music': ['Yandex_Music'],
  'Claro Música': ['Claro_M%C3%BAsica', 'Claro_Musica'],
  'Hungama Music': ['Hungama'],
  'Trebel Music': ['Trebel_Music'],
  'iTunes Store': ['ITunes_Store'],
  'Amazon Music Store': ['Amazon_Music'],
  TikTok: ['TikTok'],
  Twitch: ['Twitch_(service)'],
  Instagram: ['Instagram'],
  Facebook: ['Facebook'],
  YouTube: ['YouTube'],
  Xiami: ['Xiami_Music'],
};

const partnerPlaybook: Record<string, string[]> = {
  '7Digital': [
    'Great for licensing and B2B distribution channels, so metadata precision is critical.',
    'Use complete ISRC and genre tagging to improve downstream catalog matching.',
    'Prioritize clean rights ownership data to reduce partner ingestion rejections.',
  ],
  Spotify: [
    'Pitch unreleased tracks through Spotify for Artists ahead of release day.',
    'Canvas, clips, and artist profile optimization improve conversion from discovery.',
    'Retention metrics matter, so focus on strong first-30-second song intros.',
  ],
  'Apple Music': [
    'Spatial audio and lossless-ready masters can improve placement opportunities.',
    'Keep artist profile and credits polished because Apple editorial checks quality closely.',
    'Plan pre-add campaigns before release to improve first-week momentum.',
  ],
  'YouTube Music': [
    'Official Artist Channel setup improves discoverability across YouTube surfaces.',
    'Consistent title formatting helps merge art tracks and official videos correctly.',
    'Monitor region-specific trends because watch behavior varies by market.',
  ],
  'Amazon Music': [
    'Voice discovery via Alexa rewards clear metadata and pronunciation-friendly naming.',
    'Plan both on-demand and subscription audience segments in campaign strategy.',
    'Use high-quality cover art because storefront presentation affects click-through.',
  ],
  Deezer: [
    'Editorial and algorithmic pathways both matter, so sustain steady release cadence.',
    'Genre and mood tagging influences recommendation surfaces heavily.',
    'Check country traction to focus ad spend where Deezer is strongest.',
  ],
  TIDAL: [
    'High-fidelity audience expects strong masters and clean loudness balance.',
    'Artist storytelling and premium positioning can improve engagement on TIDAL.',
    'Use accurate contributor credits to support discovery through metadata.',
  ],
  Pandora: [
    'Pandora curation relies heavily on music attributes and metadata consistency.',
    'Radio-style listening means track sequencing and mood fit are important.',
    'Track station adds and thumb activity to evaluate long-term traction.',
  ],
  SoundCloud: [
    'Community and repost culture can accelerate grassroots discovery quickly.',
    'Strong release descriptions and tags improve organic search visibility.',
    'Use creator engagement tools to convert listeners into loyal followers.',
  ],
  Audiomack: [
    'Platform culture favors active creator engagement and frequent drops.',
    'Localized campaign pushes can perform well in key emerging markets.',
    'Use artwork and release copy that suits mobile-first consumption.',
  ],
  Boomplay: [
    'Strong footprint across African markets, so regional targeting is valuable.',
    'Release timing around local listening peaks can improve chart movement.',
    'Prioritize mobile-friendly promotions because audience usage is highly mobile.',
  ],
  Anghami: [
    'Strong presence in MENA markets, so Arabic metadata quality is important.',
    'Editorial opportunities improve with localized campaign narratives.',
    'Watch territory-level analytics to prioritize cities with repeat listeners.',
  ],
  Napster: [
    'Catalog hygiene matters for legacy and enterprise listening channels.',
    'Focus on complete rights and release metadata for reliable matching.',
    'Use consistent artist naming to avoid profile fragmentation.',
  ],
  Qobuz: [
    'High-resolution listeners value premium mastering and detailed credits.',
    'Classical and jazz audiences respond well to deep metadata completeness.',
    'Quality-driven positioning can outperform volume-driven release strategies.',
  ],
  JioSaavn: [
    'India-first audience requires strong local language metadata support.',
    'Regional playlist strategy can outperform broad national targeting.',
    'Coordinate release windows with local promotion calendars.',
  ],
  Gaana: [
    'India catalog depth means localized curation strategy is essential.',
    'Prioritize language and mood metadata for better playlist fit.',
    'Track performance by state/region for smarter campaign allocation.',
  ],
  'Tencent Music (QQ Music)': [
    'China market dynamics require compliant metadata and local strategy alignment.',
    'Fan engagement features can materially affect song momentum.',
    'Coordinate rights administration carefully for regional compliance.',
  ],
  'KuGou Music': [
    'Large China user base rewards frequent catalog updates and activity.',
    'Localized metadata and transliteration improve search findability.',
    'Monitor chart signals to spot fast-moving audience shifts.',
  ],
  'Kuwo Music': [
    'Discovery is sensitive to localized tagging and artist naming consistency.',
    'Use region-aware marketing plans for better conversion.',
    'Keep rights records accurate to reduce ingestion conflicts.',
  ],
  'NetEase Cloud Music': [
    'Community-driven listening favors strong fan interaction and storytelling.',
    'Localized metadata and release notes improve discoverability.',
    'Plan release cadence to maintain algorithmic momentum.',
  ],
  Melon: [
    'Korean market competitiveness rewards tight release strategy and timing.',
    'Metadata and naming conventions should match local platform expectations.',
    'Track chart and fan behavior daily during launch week.',
  ],
  'Genie Music': [
    'Strong in South Korea, so localized campaign planning is important.',
    'Use Korean-language metadata where relevant for search accuracy.',
    'Coordinate releases with local promo channels for stronger uptake.',
  ],
  FLO: [
    'Korean platform behavior favors high early engagement after launch.',
    'Ensure clean rights metadata to avoid profile or catalog mismatches.',
    'Local influencer support can improve first-week traction.',
  ],
  'LINE MUSIC': [
    'Japan and nearby markets respond to localized messaging and assets.',
    'Plan campaigns around messaging ecosystem behavior and social sharing.',
    'Keep artist profile assets consistent across local channels.',
  ],
  'AWA Music': [
    'Japan-focused audience benefits from culturally adapted release strategy.',
    'Metadata consistency helps recommendations and playlist inclusion.',
    'Use recurring content drops to sustain listener return rate.',
  ],
  KKBOX: [
    'Strong in East and Southeast Asia, so region-level strategy matters.',
    'Localized metadata and release copy improve editorial fit.',
    'Monitor retention trends to refine ongoing content cadence.',
  ],
  JOOX: [
    'Popular in Southeast Asia, with strong mobile listening patterns.',
    'Local language assets can increase playlist conversion.',
    'Coordinate ad and influencer pushes around peak app usage times.',
  ],
  Mixcloud: [
    'Best suited for long-form mixes and radio-style creator formats.',
    'Clear tracklists and timestamps improve listener satisfaction.',
    'Rights-aware mix planning reduces takedown risk.',
  ],
  Beatport: [
    'Electronic music metadata quality is crucial for genre-store discovery.',
    'Release timing around DJ cycles and weekends can improve sales.',
    'Use precise subgenre tagging to reach the right crate diggers.',
  ],
  'Yandex Music': [
    'Regional listening behavior can differ significantly by city and genre.',
    'Localized metadata helps search and recommendation quality.',
    'Evaluate campaign ROI by territory before scaling spend.',
  ],
  'Claro Música': [
    'Latin American reach benefits from Spanish-first campaign planning.',
    'Territory-specific release pushes often outperform one-size-fits-all launches.',
    'Use clean metadata to avoid catalog duplication issues.',
  ],
  'Hungama Music': [
    'Indian market discovery depends on language and region-aware strategy.',
    'Optimize metadata for multilingual search behavior.',
    'Use local promo windows to increase initial release visibility.',
  ],
  'Trebel Music': [
    'Ad-supported and offline-heavy behavior rewards repeated brand recall.',
    'Creative assets should be clear and mobile-native for better conversion.',
    'Track user save behavior to assess campaign quality.',
  ],
  'iTunes Store': [
    'Pricing and storefront positioning directly affect purchase behavior.',
    'Complete metadata improves search ranking and chart eligibility.',
    'Coordinate release timing with promo pushes for opening-week sales.',
  ],
  'Amazon Music Store': [
    'Purchase flow audiences respond to clear pricing and packaging.',
    'Cover art quality and title clarity improve conversion.',
    'Use territory-aware pricing decisions to optimize revenue.',
  ],
  TikTok: [
    'Front-load memorable hooks because short clips decide retention quickly.',
    'Seed creator campaigns early to expand sound adoption before launch week.',
    'Monitor trend velocity and iterate content variants fast.',
  ],
  Twitch: [
    'Live culture rewards real-time engagement and authentic community touchpoints.',
    'Rights-safe music usage policies should be checked before creator campaigns.',
    'Sponsor and collab streams can drive deeper fan conversion than static posts.',
  ],
  Instagram: [
    'Reels and Stories need strong visual identity and concise narrative framing.',
    'Use consistent release creative across posts, reels, and highlights.',
    'Track saves and shares to measure content resonance beyond likes.',
  ],
  Facebook: [
    'Community groups and pages can still drive targeted audience conversion.',
    'Short video clips with captions perform better across mixed-feed contexts.',
    'Retarget engaged audiences around release windows for improved lift.',
  ],
  YouTube: [
    'Content ID setup must be accurate to protect and monetize rights effectively.',
    'Coordinate official videos, art tracks, and shorts for unified discovery.',
    'Optimize titles and thumbnails to improve click-through and watch time.',
  ],
  Xiami: [
    'Legacy catalog handling may vary, so preserve clean historical metadata.',
    'Use consistent artist naming to avoid fragmented representation.',
    'Track availability status and rights continuity across territories.',
  ],
};

function getWhatToKnow(partnerName: string, category: string) {
  return partnerPlaybook[partnerName] || [
    'Verify availability by territory before launch.',
    'Keep metadata and rights data consistent across distributors.',
    `Track ${category.toLowerCase()} analytics to optimize future campaigns.`,
  ];
}

function fallbackPartnerSummary(partner: PartnerPlatform) {
  return `${partner.name} is a ${partner.category.toLowerCase()} platform in the AMT DISTRO distribution network. It helps artists reach listeners in its active markets through compliant delivery, rights-aware metadata, and platform-native discovery workflows.`;
}

function getPlatformAbout(partnerName: string): string {
  const aboutMap: Record<string, string> = {
    '7Digital': '7Digital is a leading B2B music distribution and licensing platform used by aggregators worldwide. It powers backend catalog delivery and enables direct licensing to independent music retailers and content platforms.',
    Spotify: 'Spotify is the world\'s largest music streaming platform with over 500 million users. It combines personalized recommendations, curated playlists, and artist tools to create a comprehensive music discovery ecosystem across web, mobile, and device platforms.',
    'Apple Music': 'Apple Music is a subscription streaming service integrated with Apple\'s ecosystem, offering high-fidelity audio, exclusive content, and artist connections. It reaches users across iPhone, Mac, Apple Watch, and smart speakers globally.',
    'YouTube Music': 'YouTube Music is a streaming service built on YouTube\'s massive video library and recommendation engine. It combines official music videos, live performances, covers, and audio tracks to create a unique discovery and playback experience.',
    'Amazon Music': 'Amazon Music serves millions of users through subscription, ad-supported, and purchase options. It integrates with Alexa voice control, making music discovery and playback intuitive across Amazon devices and the broader ecosystem.',
    Deezer: 'Deezer is a European-based streaming platform with strong presence in France and global reach. It emphasizes editorial curation, playlist discovery, and local music support across multiple tiers and devices.',
    TIDAL: 'TIDAL is a streaming platform focused on high-fidelity audio and artist payouts. It combines lossless sound quality, exclusive content drops, and artist-friendly economics to appeal to audiophiles and music creators.',
    Pandora: 'Pandora operates as a personalized radio service using music genome technology and algorithmic recommendations. It combines on-demand streaming with radio-style listening, powered by Music Intelligence Genome data.',
    SoundCloud: 'SoundCloud is the largest platform for independent creators, with direct artist-to-listener distribution. Its community-driven approach enables emerging artists to upload, promote, and monetize music without gatekeepers.',
    Audiomack: 'Audiomack is a mobile-first streaming platform popular in emerging markets and hip-hop communities. It emphasizes emerging artist discovery, free access, and community engagement in underserved regions.',
    Boomplay: 'Boomplay is Africa\'s leading music streaming platform with presence across 50+ African countries. It combines local language support, offline downloads, and region-specific content to serve African listeners and diaspora audiences.',
    Anghami: 'Anghami is the MENA region\'s leading Arabic music streaming platform. It specializes in Arabic music discovery, local artist support, and cultural relevance across the Middle East and North Africa.',
    Napster: 'Napster is a subscription streaming service known for its extensive catalog and value-oriented pricing. It combines on-demand streaming with radio features and integration into home entertainment and automotive systems.',
    Qobuz: 'Qobuz is a premium streaming platform focused on high-resolution audio and music enthusiasts. It offers lossless and hi-res streaming, editorial playlists, and direct artist relationships for classical and audiophile audiences.',
    JioSaavn: 'JioSaavn is India\'s largest music streaming platform with over 70 million songs. It combines Indian and global music, regional language support, and integration with Jio\'s telecom ecosystem to reach hundreds of millions of users.',
    Gaana: 'Gaana is India\'s second-largest streaming platform with strong presence in regional Indian music. It focuses on multi-language content, Bollywood releases, and partnerships with local telecom providers for deeper market penetration.',
    'Tencent Music (QQ Music)': 'Tencent Music\'s QQ Music is China\'s largest music platform with social features, karaoke integration, and direct artist collaborations. It combines streaming with live events and community engagement in the world\'s second-largest music market.',
    'KuGou Music': 'KuGou Music is one of China\'s top music platforms, known for local artist support and music discovery features. It serves millions of Chinese listeners with streaming, lyrics, and interactive music content.',
    'Kuwo Music': 'Kuwo Music (NetEase) is a major Chinese streaming service emphasizing artist relationships and exclusive content. It combines streaming with music social features and direct artist monetization.',
    'NetEase Cloud Music': 'NetEase Cloud Music is China\'s third-largest platform with 200+ million users. It blends streaming, user-generated content, comments, and social sharing to create a social music discovery experience.',
    Melon: 'Melon is South Korea\'s largest music platform and the primary chart source (Melon Chart). It drives chart performance and discovery in Korea, with exclusive content and chart-driven promotions.',
    'Genie Music': 'Genie Music is South Korea\'s second-largest platform with strong chart influence. It combines streaming with exclusive content, artist collaborations, and chart-driven listener behavior.',
    FLO: 'FLO is a premium South Korean streaming service known for high-fidelity audio and curated playlists. It targets audiophiles and music enthusiasts in the Korean market with quality-first positioning.',
    'LINE MUSIC': 'LINE MUSIC is the primary music streaming service in Japan, integrated with the LINE messaging ecosystem. It reaches Japanese users through direct messaging, video sharing, and social integration.',
    'AWA Music': 'AWA Music is a Japanese streaming platform emphasizing personalized recommendations and local artist support. It combines streaming with Japanese music discovery and curation.',
    KKBOX: 'KKBOX is the leading streaming platform in Taiwan and East Southeast Asia. It serves millions with multi-language content, offline downloads, and regional music discovery across multiple markets.',
    JOOX: 'JOOX is the primary streaming platform in Southeast Asia, with particular strength in Thailand, Malaysia, and Vietnam. It emphasizes local language support, offline listening, and regional content.',
    Mixcloud: 'Mixcloud is the world\'s largest platform for DJ and radio show streaming. It specializes in long-form audio, live DJ sets, and radio content from creators worldwide.',
    Beatport: 'Beatport is the world\'s largest electronic music download store and streaming service for DJs. It specializes in dance music metadata, genre precision, and DJ-focused discovery.',
    'Yandex Music': 'Yandex Music is Russia\'s largest music streaming platform serving Eastern Europe and Central Asia. It combines streaming with social features and integration into Yandex\'s broader ecosystem.',
    'Claro Música': 'Claro Música is Latin America\'s largest music streaming platform with presence in 10+ countries. It combines streaming with mobile carrier integration and Spanish-language content focus.',
    'Hungama Music': 'Hungama Music serves India and South Asian audiences with strong Bollywood and regional content. It emphasizes movie music, artist exclusives, and Indian market penetration.',
    'Trebel Music': 'Trebel Music is a free, ad-supported streaming platform popular in emerging markets and developing economies. It enables offline downloads and data-efficient streaming for users with limited connectivity.',
    'iTunes Store': 'iTunes Store is Apple\'s digital music download platform where users purchase individual tracks and albums. It remains a significant revenue source for artists and a primary discovery channel in Apple\'s ecosystem.',
    'Amazon Music Store': 'Amazon Music Store offers permanent digital music purchases for customers preferring ownership over subscription. It integrates with Amazon\'s broader retail and Echo ecosystem.',
    TikTok: 'TikTok is the world\'s leading short-form video platform where music discovery and viral moments drive streaming to all DSPs. Artists use TikTok sounds to reach billions, with direct track links to major streaming services.',
    Twitch: 'Twitch is the leading live-streaming platform where musicians perform, promote, and monetize directly. It combines live interaction with music promotion, reaching gaming and music communities simultaneously.',
    Instagram: 'Instagram is a visual-first social platform where artists build fandoms through Stories, Reels, and feed posts. It drives listener engagement and streaming through integrated audio features and community building.',
    Facebook: 'Facebook reaches billions of users globally with music sharing, video content, and artist pages. It remains significant for targeted promotion, community groups, and legacy audience reach.',
    YouTube: 'YouTube is the world\'s largest video platform and second-largest music platform overall. It combines official music videos, artist channels, and Content ID monetization for massive discovery and revenue potential.',
    Xiami: 'Xiami is a Chinese music platform known for independent artist support and music curation. It provides streaming and discovery for Chinese listeners and diaspora audiences worldwide.',
  };
  return aboutMap[partnerName] || fallbackPartnerSummary({ name: partnerName, category: 'Streaming', domain: '' });
}

interface PartnerWikiSummary {
  extract: string;
  sourceUrl: string;
}

async function fetchWikipediaSummary(partnerName: string): Promise<PartnerWikiSummary | null> {
  const titleCandidates = partnerWikipediaTitles[partnerName] || [partnerName.replace(/\s+/g, '_')];

  for (const title of titleCandidates) {
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        extract?: string;
        content_urls?: { desktop?: { page?: string } };
      };

      if (data.extract) {
        return {
          extract: data.extract,
          sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`,
        };
      }
    } catch {
      // Ignore per-title network errors and keep trying candidates.
    }
  }

  return null;
}

export function OurPartners() {
  const [selectedPartner, setSelectedPartner] = useState<PartnerPlatform | null>(null);
  const [aboutText, setAboutText] = useState('');
  const [wikiSource, setWikiSource] = useState<string | null>(null);
  const [isLoadingAbout, setIsLoadingAbout] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPartnerAbout(partner: PartnerPlatform) {
      setIsLoadingAbout(false);
      setWikiSource(null);

      const customAbout = getPlatformAbout(partner.name);
      setAboutText(customAbout);
    }

    if (selectedPartner) {
      loadPartnerAbout(selectedPartner);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedPartner]);

  const selectedPartnerOfficialSource = useMemo(() => {
    if (!selectedPartner) {
      return null;
    }

    const domain = logoDomainMap[selectedPartner.name] || selectedPartner.domain;
    return `https://${domain}`;
  }, [selectedPartner]);

  const selectedPartnerWhatToKnow = useMemo(() => {
    if (!selectedPartner) {
      return [];
    }

    return getWhatToKnow(selectedPartner.name, selectedPartner.category);
  }, [selectedPartner]);

  return (
    <section className="bg-[radial-gradient(circle_at_top_left,_rgba(255,107,0,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,214,0,0.08),_transparent_24%),linear-gradient(180deg,#090909_0%,#111111_42%,#0A0A0A_100%)] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-18">
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#FF6B00]/20 bg-[#1A1410] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD600]">
            Partners
          </div>
          <h1 className="text-[2rem] font-bold text-white sm:text-[2.5rem]">Our Partners</h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-[#B3B3B3]">
            We work with industry leaders to provide you with the best music distribution and
            technology solutions
          </p>
        </div>

        {/* Streaming Platform Partners */}
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Distribution Partners</h2>
          <p className="mb-6 text-sm text-[#B3B3B3]">
            Your music reaches fans on all major streaming and download platforms worldwide
          </p>
          <Card className="border-[#FF6B00]/20 bg-[#161616] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {platformPartners.map((partner) => (
                <button
                  type="button"
                  key={partner.name}
                  onClick={() => setSelectedPartner(partner)}
                  className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-[#101010] p-4 text-left transition-colors hover:border-[#FF6B00]/30 hover:bg-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/60"
                  aria-label={`Open details for ${partner.name}`}
                >
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#0B0B0B] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                    <img
                      src={getPartnerLogoSrc(partner.name, partner.domain)}
                      alt={`${partner.name} logo`}
                      className="h-10 w-10 object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallbackSrc = getRemoteLogoSrc(partner.name, partner.domain);
                        if (target.src !== fallbackSrc) {
                          target.src = fallbackSrc;
                          return;
                        }
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'inline-flex';
                      }}
                    />
                    <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
                      {getPartnerMonogram(partner.name)}
                    </span>
                  </div>
                  <div className="text-center font-medium text-white">{partner.name}</div>
                  <div className="text-xs text-[#B3B3B3]">{partner.category}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Technology Partners */}
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Technology Partners</h2>
          <p className="mb-6 text-sm text-[#B3B3B3]">
            Powered by world-class technology infrastructure for reliability and security
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {technologyPartners.map((partner) => (
              <Card key={partner.name} className="border-[#FF6B00]/20 bg-[#161616] p-6 text-center transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#0B0B0B] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                  <img
                    src={`https://img.logo.dev/${logoDomainMap[partner.name] || partner.domain}?size=220&format=svg`}
                    alt={`${partner.name} logo`}
                    className="h-10 w-10 object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'inline-flex';
                    }}
                  />
                  <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
                    {getPartnerMonogram(partner.name)}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-medium text-white">{partner.name}</h3>
                <p className="text-sm text-[#B3B3B3]">{partner.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Industry Partners */}
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-bold text-white">Industry Partners</h2>
          <p className="mb-6 text-sm text-[#B3B3B3]">
            Collaborating with leading music industry organizations to protect your rights
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {industryPartners.map((partner) => (
              <Card key={partner.name} className="border-[#FF6B00]/20 bg-[#161616] p-6 transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F5132] to-[#22C55E]/20">
                    <Handshake className="w-6 h-6 text-[#4ADE80]" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-medium text-white">{partner.name}</h3>
                    <p className="text-sm text-[#B3B3B3]">{partner.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Partnership CTA */}
        <Card className="border border-[#FF6B00]/30 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] p-8 text-center text-white shadow-[0_24px_80px_rgba(255,107,0,0.15)] sm:p-10">
          <h2 className="text-2xl font-bold">Become a Partner</h2>
          <p className="mx-auto mt-3 mb-6 max-w-2xl text-sm leading-6 text-white/85">
            Interested in partnering with AMT DISTRO? We're always looking to collaborate with
            platforms, technology providers, and industry organizations that share our mission.
          </p>
          <Button className="bg-white px-8 py-3 font-medium text-[#A04A00] hover:bg-[#FFF3DB]">
            Get in Touch
          </Button>
        </Card>
      </div>

      <Dialog open={!!selectedPartner} onOpenChange={(open) => !open && setSelectedPartner(null)}>
        <DialogContent className="border-[#FF6B00]/25 bg-[#111111] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              {selectedPartner ? selectedPartner.name : 'Partner Details'}
            </DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              {selectedPartner
                ? `${selectedPartner.category} platform overview and important notes.`
                : 'Partner overview'}
            </DialogDescription>
          </DialogHeader>

          {selectedPartner ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
                  About
                </h4>
                <p className="text-sm leading-6 text-[#D7D7D7]">
                  {isLoadingAbout
                    ? 'Loading internet-sourced profile...'
                    : aboutText || fallbackPartnerSummary(selectedPartner)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
                  What You Should Know
                </h4>
                <ul className="space-y-2 text-sm leading-6 text-[#D7D7D7]">
                  {selectedPartnerWhatToKnow.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#FF6B00]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#FFD600]">
                  Sources
                </h4>
                <div className="flex flex-wrap gap-3 text-sm">
                  {wikiSource ? (
                    <a
                      href={wikiSource}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[#E9E9E9] transition-colors hover:border-[#FF6B00]/50 hover:text-white"
                    >
                      Wikipedia
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {selectedPartnerOfficialSource ? (
                    <a
                      href={selectedPartnerOfficialSource}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[#E9E9E9] transition-colors hover:border-[#FF6B00]/50 hover:text-white"
                    >
                      Official Site
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}