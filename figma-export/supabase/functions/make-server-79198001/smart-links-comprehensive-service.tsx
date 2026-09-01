import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface SmartLink {
  id: string;
  userId: string;
  releaseId?: string;
  title: string;
  artistName?: string;
  slug: string;
  linkType: 'standard' | 'presave';
  description?: string;
  isrc?: string;
  upc?: string;
  artworkUrl?: string;
  status: 'active' | 'draft' | 'expired' | 'presave';
  isPublic: boolean;
  totalViews: number;
  totalClicks: number;
  presaveReleaseDate?: string;
  presaveEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface SmartLinkService {
  id: string;
  smartLinkId: string;
  platformKey: string;
  platformName: string;
  platformUrl: string;
  platformId?: string;
  iconUrl?: string;
  displayName?: string;
  displayOrder: number;
  enabled: boolean;
  clickCount: number;
  viewCount: number;
  lastClickedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmartLinkSettings {
  id: string;
  smartLinkId: string;
  theme: 'light' | 'dark' | 'custom';
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundStyle: 'solid' | 'gradient' | 'image';
  buttonStyle: 'pill' | 'rounded' | 'square';
  buttonColor: string;
  buttonTextColor: string;
  buttonHoverEffect: 'scale' | 'glow' | 'shadow';
  showArtistBio: boolean;
  showCoverArt: boolean;
  showAMTDistrobranding: boolean;
  showReleaseInfo: boolean;
  showShareButtons: boolean;
  showSocialLinks: boolean;
  showStats: boolean;
  socialLinks: Record<string, string>;
  artistProfileUrl?: string;
  customCss?: string;
  customDomain?: string;
  trackingPixelCode?: string;
  removeBranding: boolean;
  showPresaveCountdown: boolean;
  enableEmailCapture: boolean;
  emailServiceId?: string;
  createdAt: string;
  updatedAt: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Create a new smart link
 */
export async function createSmartLink(
  userId: string,
  data: Omit<SmartLink, 'id' | 'createdAt' | 'updatedAt' | 'totalViews' | 'totalClicks'>
): Promise<SmartLink> {
  const { data: result, error } = await supabase
    .from('smart_links')
    .insert({
      user_id: userId,
      release_id: data.releaseId || null,
      title: data.title,
      artist_name: data.artistName,
      slug: data.slug,
      link_type: data.linkType,
      description: data.description,
      isrc: data.isrc,
      upc: data.upc,
      artwork_url: data.artworkUrl,
      status: data.status,
      is_public: data.isPublic,
      presave_release_date: data.presaveReleaseDate,
      presave_enabled: data.presaveEnabled,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating smart link:', error);
    throw new Error(`Failed to create smart link: ${error.message}`);
  }

  return formatSmartLinkRecord(result);
}

/**
 * Get smart link by slug (public access)
 */
export async function getSmartLinkBySlug(slug: string): Promise<SmartLink | null> {
  const { data, error } = await supabase
    .from('smart_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching smart link:', error);
    throw new Error(`Failed to fetch smart link: ${error.message}`);
  }

  return formatSmartLinkRecord(data);
}

/**
 * Get all smart links for a user
 */
export async function getUserSmartLinks(userId: string): Promise<SmartLink[]> {
  const { data, error } = await supabase
    .from('smart_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user smart links:', error);
    throw new Error(`Failed to fetch smart links: ${error.message}`);
  }

  return (data || []).map(formatSmartLinkRecord);
}

/**
 * Update smart link
 */
export async function updateSmartLink(
  id: string,
  userId: string,
  updates: Partial<SmartLink>
): Promise<SmartLink> {
  const { data: result, error } = await supabase
    .from('smart_links')
    .update({
      title: updates.title,
      artist_name: updates.artistName,
      slug: updates.slug,
      description: updates.description,
      artwork_url: updates.artworkUrl,
      status: updates.status,
      is_public: updates.isPublic,
      presave_enabled: updates.presaveEnabled,
      presave_release_date: updates.presaveReleaseDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating smart link:', error);
    throw new Error(`Failed to update smart link: ${error.message}`);
  }

  return formatSmartLinkRecord(result);
}

/**
 * Delete smart link
 */
export async function deleteSmartLink(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('smart_links')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting smart link:', error);
    throw new Error(`Failed to delete smart link: ${error.message}`);
  }
}

/**
 * Add service (DSP URL) to smart link
 */
export async function addSmartLinkService(
  smartLinkId: string,
  userId: string,
  data: Omit<SmartLinkService, 'id' | 'createdAt' | 'updatedAt' | 'clickCount' | 'viewCount'>
): Promise<SmartLinkService> {
  // Verify ownership
  const { data: link, error: linkError } = await supabase
    .from('smart_links')
    .select('id')
    .eq('id', smartLinkId)
    .eq('user_id', userId)
    .single();

  if (linkError || !link) {
    throw new Error('Smart link not found or unauthorized');
  }

  const { data: result, error } = await supabase
    .from('smart_link_services')
    .insert({
      smart_link_id: smartLinkId,
      platform_key: data.platformKey,
      platform_name: data.platformName,
      platform_url: data.platformUrl,
      platform_id: data.platformId,
      icon_url: data.iconUrl,
      display_name: data.displayName,
      display_order: data.displayOrder,
      enabled: data.enabled,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding service:', error);
    throw new Error(`Failed to add service: ${error.message}`);
  }

  return formatServiceRecord(result);
}

/**
 * Get services (DSP URLs) for a smart link
 */
export async function getSmartLinkServices(smartLinkId: string): Promise<SmartLinkService[]> {
  const { data, error } = await supabase
    .from('smart_link_services')
    .select('*')
    .eq('smart_link_id', smartLinkId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching services:', error);
    throw new Error(`Failed to fetch services: ${error.message}`);
  }

  return (data || []).map(formatServiceRecord);
}

/**
 * Update service (DSP URL)
 */
export async function updateSmartLinkService(
  serviceId: string,
  smartLinkId: string,
  userId: string,
  updates: Partial<SmartLinkService>
): Promise<SmartLinkService> {
  // Verify ownership
  const { data: link, error: linkError } = await supabase
    .from('smart_links')
    .select('id')
    .eq('id', smartLinkId)
    .eq('user_id', userId)
    .single();

  if (linkError || !link) {
    throw new Error('Smart link not found or unauthorized');
  }

  const { data: result, error } = await supabase
    .from('smart_link_services')
    .update({
      platform_url: updates.platformUrl,
      display_name: updates.displayName,
      display_order: updates.displayOrder,
      enabled: updates.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', serviceId)
    .eq('smart_link_id', smartLinkId)
    .select()
    .single();

  if (error) {
    console.error('Error updating service:', error);
    throw new Error(`Failed to update service: ${error.message}`);
  }

  return formatServiceRecord(result);
}

/**
 * Delete service (DSP URL)
 */
export async function deleteSmartLinkService(
  serviceId: string,
  smartLinkId: string,
  userId: string
): Promise<void> {
  // Verify ownership
  const { data: link, error: linkError } = await supabase
    .from('smart_links')
    .select('id')
    .eq('id', smartLinkId)
    .eq('user_id', userId)
    .single();

  if (linkError || !link) {
    throw new Error('Smart link not found or unauthorized');
  }

  const { error } = await supabase
    .from('smart_link_services')
    .delete()
    .eq('id', serviceId)
    .eq('smart_link_id', smartLinkId);

  if (error) {
    console.error('Error deleting service:', error);
    throw new Error(`Failed to delete service: ${error.message}`);
  }
}

/**
 * Get or create settings for a smart link
 */
export async function getOrCreateSmartLinkSettings(
  smartLinkId: string,
  userId: string
): Promise<SmartLinkSettings> {
  // Verify ownership
  const { data: link, error: linkError } = await supabase
    .from('smart_links')
    .select('id')
    .eq('id', smartLinkId)
    .eq('user_id', userId)
    .single();

  if (linkError || !link) {
    throw new Error('Smart link not found or unauthorized');
  }

  let { data, error } = await supabase
    .from('smart_link_settings')
    .select('*')
    .eq('smart_link_id', smartLinkId)
    .single();

  // Create default settings if not found
  if (error && error.code === 'PGRST116') {
    const { data: newSettings, error: createError } = await supabase
      .from('smart_link_settings')
      .insert({
        smart_link_id: smartLinkId,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create settings: ${createError.message}`);
    }

    data = newSettings;
  } else if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  return formatSettingsRecord(data!);
}

/**
 * Update smart link settings
 */
export async function updateSmartLinkSettings(
  smartLinkId: string,
  userId: string,
  updates: Partial<SmartLinkSettings>
): Promise<SmartLinkSettings> {
  // Verify ownership
  const { data: link, error: linkError } = await supabase
    .from('smart_links')
    .select('id')
    .eq('id', smartLinkId)
    .eq('user_id', userId)
    .single();

  if (linkError || !link) {
    throw new Error('Smart link not found or unauthorized');
  }

  const { data: result, error } = await supabase
    .from('smart_link_settings')
    .update({
      theme: updates.theme,
      background_color: updates.backgroundColor,
      background_image_url: updates.backgroundImageUrl,
      button_style: updates.buttonStyle,
      button_color: updates.buttonColor,
      button_text_color: updates.buttonTextColor,
      show_artist_bio: updates.showArtistBio,
      show_cover_art: updates.showCoverArt,
      show_amtdistro_branding: updates.showAMTDistrobranding,
      show_release_info: updates.showReleaseInfo,
      show_share_buttons: updates.showShareButtons,
      show_social_links: updates.showSocialLinks,
      social_links: updates.socialLinks,
      artist_profile_url: updates.artistProfileUrl,
      custom_css: updates.customCss,
      custom_domain: updates.customDomain,
      remove_branding: updates.removeBranding,
      updated_at: new Date().toISOString(),
    })
    .eq('smart_link_id', smartLinkId)
    .select()
    .single();

  if (error) {
    console.error('Error updating settings:', error);
    throw new Error(`Failed to update settings: ${error.message}`);
  }

  return formatSettingsRecord(result);
}

/**
 * Increment view count for a smart link
 */
export async function incrementSmartLinkViews(smartLinkId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_smart_link_views', {
    p_smart_link_id: smartLinkId,
  });

  if (error) {
    console.error('Error incrementing views:', error);
    // Silently fail - not critical for user experience
  }
}

/**
 * Increment click count for a service
 */
export async function incrementServiceClicks(serviceId: string, smartLinkId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_service_clicks', {
    p_service_id: serviceId,
    p_smart_link_id: smartLinkId,
  });

  if (error) {
    console.error('Error incrementing clicks:', error);
    // Silently fail - not critical for user experience
  }
}

// Formatting helpers
function formatSmartLinkRecord(record: any): SmartLink {
  return {
    id: record.id,
    userId: record.user_id,
    releaseId: record.release_id,
    title: record.title,
    artistName: record.artist_name,
    slug: record.slug,
    linkType: record.link_type,
    description: record.description,
    isrc: record.isrc,
    upc: record.upc,
    artworkUrl: record.artwork_url,
    status: record.status,
    isPublic: record.is_public,
    totalViews: record.total_views,
    totalClicks: record.total_clicks,
    presaveReleaseDate: record.presave_release_date,
    presaveEnabled: record.presave_enabled,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    publishedAt: record.published_at,
  };
}

function formatServiceRecord(record: any): SmartLinkService {
  return {
    id: record.id,
    smartLinkId: record.smart_link_id,
    platformKey: record.platform_key,
    platformName: record.platform_name,
    platformUrl: record.platform_url,
    platformId: record.platform_id,
    iconUrl: record.icon_url,
    displayName: record.display_name,
    displayOrder: record.display_order,
    enabled: record.enabled,
    clickCount: record.click_count,
    viewCount: record.view_count,
    lastClickedAt: record.last_clicked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function formatSettingsRecord(record: any): SmartLinkSettings {
  return {
    id: record.id,
    smartLinkId: record.smart_link_id,
    theme: record.theme,
    backgroundColor: record.background_color,
    backgroundImageUrl: record.background_image_url,
    backgroundStyle: record.background_style,
    buttonStyle: record.button_style,
    buttonColor: record.button_color,
    buttonTextColor: record.button_text_color,
    buttonHoverEffect: record.button_hover_effect,
    showArtistBio: record.show_artist_bio,
    showCoverArt: record.show_cover_art,
    showAMTDistrobranding: record.show_amtdistro_branding,
    showReleaseInfo: record.show_release_info,
    showShareButtons: record.show_share_buttons,
    showSocialLinks: record.show_social_links,
    showStats: record.show_stats,
    socialLinks: record.social_links || {},
    artistProfileUrl: record.artist_profile_url,
    customCss: record.custom_css,
    customDomain: record.custom_domain,
    trackingPixelCode: record.tracking_pixel_code,
    removeBranding: record.remove_branding,
    showPresaveCountdown: record.show_presave_countdown,
    enableEmailCapture: record.enable_email_capture,
    emailServiceId: record.email_service_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
