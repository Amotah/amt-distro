import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Metadata Provider Interface
 * Abstraction layer for different metadata resolution sources
 */

export interface MetadataResolution {
  matched: boolean;
  artist?: string;
  title?: string;
  releaseType?: 'single' | 'ep' | 'album';
  artworkUrl?: string;
  isrc?: string;
  upc?: string;
  releaseDate?: string;
  label?: string;
  genre?: string;
  services?: Array<{
    platform: string;
    url: string;
  }>;
}

export interface MetadataProvider {
  resolveByISRC(isrc: string): Promise<MetadataResolution>;
  resolveByUPC(upc: string): Promise<MetadataResolution>;
  resolveByURL(url: string): Promise<MetadataResolution>;
  getName(): string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * AMTDistro Native Provider
 * First searches the AMTDistro database for releases
 */
export class AMTDistroProvider implements MetadataProvider {
  getName(): string {
    return 'AMTDistro';
  }

  async resolveByISRC(isrc: string): Promise<MetadataResolution> {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          id, title, type, artwork_url, primary_artist, isrc, upc, 
          release_date, label, genre, explicit_status
        `)
        .ilike('isrc', `%${isrc}%`)
        .single();

      if (error || !data) {
        return { matched: false };
      }

      const services = await this.getReleaseDSPs(data.id);

      return {
        matched: true,
        artist: data.primary_artist,
        title: data.title,
        releaseType: data.type,
        artworkUrl: data.artwork_url,
        isrc: data.isrc,
        upc: data.upc,
        releaseDate: data.release_date,
        label: data.label,
        genre: data.genre,
        services,
      };
    } catch (error) {
      console.error('AMTDistro ISRC resolution error:', error);
      return { matched: false };
    }
  }

  async resolveByUPC(upc: string): Promise<MetadataResolution> {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          id, title, type, artwork_url, primary_artist, isrc, upc,
          release_date, label, genre, explicit_status
        `)
        .ilike('upc', `%${upc}%`)
        .single();

      if (error || !data) {
        return { matched: false };
      }

      const services = await this.getReleaseDSPs(data.id);

      return {
        matched: true,
        artist: data.primary_artist,
        title: data.title,
        releaseType: data.type,
        artworkUrl: data.artwork_url,
        isrc: data.isrc,
        upc: data.upc,
        releaseDate: data.release_date,
        label: data.label,
        genre: data.genre,
        services,
      };
    } catch (error) {
      console.error('AMTDistro UPC resolution error:', error);
      return { matched: false };
    }
  }

  async resolveByURL(url: string): Promise<MetadataResolution> {
    // Try to extract platform and ID from URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Extract platform-specific IDs and query existing DSP mappings
      if (hostname.includes('spotify.com')) {
        const trackId = url.split('/track/')[1]?.split('?')[0];
        if (trackId) {
          return this.resolveBySpotifyId(trackId);
        }
      }
      if (hostname.includes('music.apple.com')) {
        // Apple Music resolution
        return this.resolveByAppleMusicUrl(url);
      }
      if (hostname.includes('music.youtube.com')) {
        return this.resolveByYouTubeMusicUrl(url);
      }

      return { matched: false };
    } catch (error) {
      console.error('AMTDistro URL resolution error:', error);
      return { matched: false };
    }
  }

  private async resolveBySpotifyId(spotifyId: string): Promise<MetadataResolution> {
    // This would integrate with Spotify API if configured
    // For now, search local database for Spotify IDs
    return { matched: false };
  }

  private async resolveByAppleMusicUrl(url: string): Promise<MetadataResolution> {
    // This would integrate with Apple Music API if configured
    return { matched: false };
  }

  private async resolveByYouTubeMusicUrl(url: string): Promise<MetadataResolution> {
    // This would integrate with YouTube Music if configured
    return { matched: false };
  }

  private async getReleaseDSPs(releaseId: string): Promise<Array<{ platform: string; url: string }>> {
    try {
      const { data } = await supabase
        .from('release_dsp_urls')
        .select('*')
        .eq('release_id', releaseId)
        .single();

      if (!data) return [];

      const services = [];
      const platforms = [
        { key: 'spotify_url', platform: 'spotify' },
        { key: 'apple_music_url', platform: 'apple_music' },
        { key: 'youtube_music_url', platform: 'youtube_music' },
        { key: 'boomplay_url', platform: 'boomplay' },
        { key: 'audiomack_url', platform: 'audiomack' },
        { key: 'amazon_music_url', platform: 'amazon_music' },
        { key: 'deezer_url', platform: 'deezer' },
        { key: 'tidal_url', platform: 'tidal' },
      ];

      for (const { key, platform } of platforms) {
        const url = (data as any)[key];
        if (url) {
          services.push({ platform, url });
        }
      }

      return services;
    } catch (error) {
      console.error('Error fetching release DSPs:', error);
      return [];
    }
  }
}

/**
 * External Provider Adapter
 * Can be configured with various external metadata APIs
 * (Spotify, Apple Music, Acoustid, etc)
 */
export class ExternalProviderAdapter implements MetadataProvider {
  private providerName: string;
  private apiKey: string;
  private apiEndpoint: string;

  constructor(providerName: string, apiKey: string, apiEndpoint: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  getName(): string {
    return this.providerName;
  }

  async resolveByISRC(isrc: string): Promise<MetadataResolution> {
    try {
      const response = await fetch(`${this.apiEndpoint}/search/isrc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isrc }),
      });

      if (!response.ok) {
        return { matched: false };
      }

      const data = await response.json();
      return this.formatExternalResponse(data);
    } catch (error) {
      console.error(`External provider ${this.providerName} ISRC error:`, error);
      return { matched: false };
    }
  }

  async resolveByUPC(upc: string): Promise<MetadataResolution> {
    try {
      const response = await fetch(`${this.apiEndpoint}/search/upc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upc }),
      });

      if (!response.ok) {
        return { matched: false };
      }

      const data = await response.json();
      return this.formatExternalResponse(data);
    } catch (error) {
      console.error(`External provider ${this.providerName} UPC error:`, error);
      return { matched: false };
    }
  }

  async resolveByURL(url: string): Promise<MetadataResolution> {
    try {
      const response = await fetch(`${this.apiEndpoint}/search/url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        return { matched: false };
      }

      const data = await response.json();
      return this.formatExternalResponse(data);
    } catch (error) {
      console.error(`External provider ${this.providerName} URL error:`, error);
      return { matched: false };
    }
  }

  private formatExternalResponse(data: any): MetadataResolution {
    // Format varies by provider - this is a generic example
    return {
      matched: !!data.id,
      artist: data.artist || data.artists?.[0]?.name,
      title: data.title || data.name,
      releaseType: data.type,
      artworkUrl: data.image || data.artwork,
      isrc: data.isrc,
      upc: data.upc || data.ean,
      releaseDate: data.release_date || data.releaseDate,
      label: data.label,
      genre: data.genre,
      services: data.links || [],
    };
  }
}

/**
 * Metadata Resolution Service
 * Coordinates between multiple providers with fallback strategy
 */
export class MetadataResolutionService {
  private providers: MetadataProvider[] = [];

  addProvider(provider: MetadataProvider, priority: number = 0): void {
    this.providers.push(provider);
    // Sort by priority (higher first)
    this.providers.sort(() => priority);
  }

  async resolveByISRC(isrc: string): Promise<MetadataResolution> {
    for (const provider of this.providers) {
      try {
        const result = await provider.resolveByISRC(isrc);
        if (result.matched) {
          console.log(`Resolved ISRC ${isrc} via ${provider.getName()}`);
          return result;
        }
      } catch (error) {
        console.error(`Error resolving ISRC via ${provider.getName()}:`, error);
        continue;
      }
    }

    return { matched: false };
  }

  async resolveByUPC(upc: string): Promise<MetadataResolution> {
    for (const provider of this.providers) {
      try {
        const result = await provider.resolveByUPC(upc);
        if (result.matched) {
          console.log(`Resolved UPC ${upc} via ${provider.getName()}`);
          return result;
        }
      } catch (error) {
        console.error(`Error resolving UPC via ${provider.getName()}:`, error);
        continue;
      }
    }

    return { matched: false };
  }

  async resolveByURL(url: string): Promise<MetadataResolution> {
    for (const provider of this.providers) {
      try {
        const result = await provider.resolveByURL(url);
        if (result.matched) {
          console.log(`Resolved URL via ${provider.getName()}`);
          return result;
        }
      } catch (error) {
        console.error(`Error resolving URL via ${provider.getName()}:`, error);
        continue;
      }
    }

    return { matched: false };
  }
}

// Export singleton instance
export const metadataService = new MetadataResolutionService();

// Initialize with AMTDistro provider (always first/highest priority)
metadataService.addProvider(new AMTDistroProvider(), 100);

// External providers can be added via environment configuration
if (Deno.env.get('EXTERNAL_METADATA_PROVIDER')) {
  const externalProvider = new ExternalProviderAdapter(
    Deno.env.get('EXTERNAL_METADATA_PROVIDER')!,
    Deno.env.get('EXTERNAL_METADATA_API_KEY') || '',
    Deno.env.get('EXTERNAL_METADATA_API_ENDPOINT') || ''
  );
  metadataService.addProvider(externalProvider, 50);
}
