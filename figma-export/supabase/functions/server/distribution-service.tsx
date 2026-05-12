import * as kv from './kv_store.tsx';
import * as metadataService from './metadata-service.tsx';
import * as isrcService from './isrc-upc-service.tsx';

/**
 * Distribution Service
 * Converts metadata to DDEX format and manages distribution to DSPs
 */

export type DSPPlatform = 
  | 'spotify' 
  | 'apple_music' 
  | 'youtube_music' 
  | 'deezer' 
  | 'tidal' 
  | 'amazon_music'
  | '7Digital'
  | 'ACRCloud'
  | 'Alibaba'
  | 'Amazon'
  | 'Anghami'
  | 'Itunes'
  | 'Audible_magic'
  | 'bmat'
  | 'boomplay'
  | 'Claro'
  | 'dmusic'
  | 'facebook_instagram'
  | 'fluxus'
  | 'hio_music'
  | 'iheart_radio'
  | 'jio_saavn'
  | 'joox'
  | 'kan_music'
  | 'audiomack';

export type DeliveryStatus = 
  | 'pending' 
  | 'processing' 
  | 'delivered' 
  | 'ingested' 
  | 'live' 
  | 'failed' 
  | 'rejected'
  | 'takedown';

export interface DSPDelivery {
  id: string;
  releaseId: string;
  platform: DSPPlatform;
  status: DeliveryStatus;
  ddexXml?: string;
  submittedAt?: string;
  deliveredAt?: string;
  goLiveDate?: string;
  platformReleaseId?: string; // ID assigned by the DSP
  platformUrl?: string; // URL on the DSP platform
  errorMessage?: string;
  retryCount: number;
  lastStatusCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionBatch {
  id: string;
  releaseId: string;
  userId: string;
  platforms: DSPPlatform[];
  deliveryIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate DDEX XML (ERN 4.1 - Electronic Release Notification)
 * This is a simplified version - production would need full DDEX compliance
 */
export async function generateDDEXXML(releaseId: string): Promise<string> {
  const release = await metadataService.getReleaseById(releaseId);
  if (!release) {
    throw new Error('Release not found');
  }

  const tracks = await metadataService.getReleaseTracks(releaseId);
  if (tracks.length === 0) {
    throw new Error('Release has no tracks');
  }

  // Ensure UPC is assigned
  if (!release.upc) {
    const upc = await isrcService.assignUPCToRelease(releaseId);
    await metadataService.updateReleaseMetadata(releaseId, { upc });
    release.upc = upc;
  }

  // Ensure all tracks have ISRCs
  for (const track of tracks) {
    if (!track.isrc) {
      const isrc = await isrcService.assignISRCToTrack(track.id);
      await metadataService.updateTrackMetadata(track.id, { isrc });
      track.isrc = isrc;
    }
  }

  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Build DDEX XML (simplified ERN 4.1 structure)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ernm:NewReleaseMessage 
  xmlns:ernm="http://ddex.net/xml/ern/41" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://ddex.net/xml/ern/41 http://ddex.net/xml/ern/41/release-notification.xsd"
  MessageSchemaVersionId="ern/41"
  LanguageAndScriptCode="en">
  
  <MessageHeader>
    <MessageThreadId>${messageId}</MessageThreadId>
    <MessageId>${messageId}</MessageId>
    <MessageCreatedDateTime>${timestamp}</MessageCreatedDateTime>
    <MessageSender>
      <PartyId>PADPIDA2024010101A</PartyId>
      <PartyName>
        <FullName>AMTDISTRO</FullName>
      </PartyName>
    </MessageSender>
  </MessageHeader>

  <ResourceList>
${tracks.map((track, index) => `    <SoundRecording>
      <SoundRecordingType>MusicalWorkSoundRecording</SoundRecordingType>
      <SoundRecordingId>
        <ISRC>${track.isrc}</ISRC>
      </SoundRecordingId>
      <ResourceReference>A${(index + 1).toString().padStart(3, '0')}</ResourceReference>
      <ReferenceTitle>
        <TitleText>${escapeXML(track.title)}</TitleText>
      </ReferenceTitle>
      <Duration>${formatDuration(track.duration)}</Duration>
      <SoundRecordingDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <Title TitleType="DisplayTitle">
          <TitleText>${escapeXML(track.title)}</TitleText>
        </Title>
        ${track.contributors.map(c => `<DisplayArtist>
          <PartyName>
            <FullName>${escapeXML(c.name)}</FullName>
          </PartyName>
          <ArtistRole>${mapContributorRole(c.role)}</ArtistRole>
        </DisplayArtist>`).join('\n        ')}
        <LabelName>${escapeXML(release.label || release.primaryArtist)}</LabelName>
        <PLine>
          <Year>${release.copyrightYear}</Year>
          <PLineText>${escapeXML(release.publishingRights)}</PLineText>
        </PLine>
        <Genre>
          <GenreText>${escapeXML(track.genre)}</GenreText>
        </Genre>
        <ParentalWarningType>${track.explicit ? 'Explicit' : 'NotExplicit'}</ParentalWarningType>
        <TechnicalSoundRecordingDetails>
          <TechnicalResourceDetailsReference>T001</TechnicalResourceDetailsReference>
          <AudioCodecType>FLAC</AudioCodecType>
          <File>
            <URI>${escapeXML(track.audioFileUrl)}</URI>
          </File>
        </TechnicalSoundRecordingDetails>
      </SoundRecordingDetailsByTerritory>
      <LanguageOfPerformance>${track.language}</LanguageOfPerformance>
    </SoundRecording>
`).join('\n')}
    <Image>
      <ImageType>FrontCoverImage</ImageType>
      <ImageId>
        <ProprietaryId>${release.id}_artwork</ProprietaryId>
      </ImageId>
      <ResourceReference>IMG001</ResourceReference>
      <ImageDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <TechnicalImageDetails>
          <TechnicalResourceDetailsReference>T002</TechnicalResourceDetailsReference>
          <ImageCodecType>JPEG</ImageCodecType>
          <ImageHeight>3000</ImageHeight>
          <ImageWidth>3000</ImageWidth>
          <File>
            <URI>${escapeXML(release.artworkUrl)}</URI>
          </File>
        </TechnicalImageDetails>
      </ImageDetailsByTerritory>
    </Image>
  </ResourceList>

  <ReleaseList>
    <Release>
      <ReleaseId>
        <GRid>A1${release.upc}</GRid>
        <ICPN>${release.upc}</ICPN>
      </ReleaseId>
      <ReleaseReference>R001</ReleaseReference>
      <ReferenceTitle>
        <TitleText>${escapeXML(release.title)}</TitleText>
      </ReferenceTitle>
      <ReleaseDetailsByTerritory>
        <TerritoryCode>Worldwide</TerritoryCode>
        <DisplayArtistName>${escapeXML(release.primaryArtist)}</DisplayArtistName>
        <LabelName>${escapeXML(release.label || release.primaryArtist)}</LabelName>
        <Title TitleType="DisplayTitle">
          <TitleText>${escapeXML(release.title)}</TitleText>
        </Title>
        <DisplayArtist>
          <PartyName>
            <FullName>${escapeXML(release.primaryArtist)}</FullName>
          </PartyName>
          <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>
        <Genre>
          <GenreText>${escapeXML(release.genre)}</GenreText>
        </Genre>
        <ReleaseDate>${release.releaseDate}</ReleaseDate>
        <OriginalReleaseDate>${release.originalReleaseDate || release.releaseDate}</OriginalReleaseDate>
        <ParentalWarningType>NotExplicit</ParentalWarningType>
        <ResourceGroup>
          <ResourceGroupContentItem>
            <SequenceNumber>1</SequenceNumber>
            <ResourceType>PrimaryResource</ResourceType>
${tracks.map((track, index) => `            <ReleaseResourceReference>
              <SequenceNumber>${index + 1}</SequenceNumber>
              <ResourceReference>A${(index + 1).toString().padStart(3, '0')}</ResourceReference>
            </ReleaseResourceReference>`).join('\n')}
          </ResourceGroupContentItem>
        </ResourceGroup>
      </ReleaseDetailsByTerritory>
      <ReleaseType>${mapReleaseType(release.type)}</ReleaseType>
    </Release>
  </ReleaseList>

  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R001</DealReleaseReference>
      <Deal>
        <DealTerms>
          <ValidityPeriod>
            <StartDate>${release.releaseDate}</StartDate>
          </ValidityPeriod>
          <TerritoryCode>Worldwide</TerritoryCode>
          <PriceInformation>
            <PriceType>StreamingPrice</PriceType>
          </PriceInformation>
        </DealTerms>
      </Deal>
    </ReleaseDeal>
  </DealList>

</ernm:NewReleaseMessage>`;

  return xml;
}

/**
 * Helper functions for DDEX XML generation
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds: number): string {
  // DDEX format: PT#H#M#S (ISO 8601 duration)
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `PT${hours > 0 ? hours + 'H' : ''}${minutes}M${secs}S`;
}

function mapContributorRole(role: string): string {
  const roleMap: Record<string, string> = {
    'primary_artist': 'MainArtist',
    'featured_artist': 'FeaturedArtist',
    'producer': 'Producer',
    'composer': 'Composer',
    'lyricist': 'Lyricist',
    'remixer': 'Remixer',
  };
  return roleMap[role] || 'MainArtist';
}

function mapReleaseType(type: string): string {
  const typeMap: Record<string, string> = {
    'single': 'Single',
    'ep': 'EP',
    'album': 'Album',
  };
  return typeMap[type] || 'Single';
}

/**
 * Create distribution batch
 */
export async function createDistributionBatch(
  releaseId: string,
  userId: string,
  platforms: DSPPlatform[]
): Promise<DistributionBatch> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Validate release before distribution
  const validation = await metadataService.validateRelease(releaseId);
  if (!validation.valid) {
    throw new Error(`Release validation failed: ${validation.errors.join(', ')}`);
  }

  // Generate DDEX XML
  const ddexXml = await generateDDEXXML(releaseId);

  // Create deliveries for each platform
  const deliveryIds: string[] = [];
  for (const platform of platforms) {
    const delivery = await createDSPDelivery(releaseId, platform, ddexXml);
    deliveryIds.push(delivery.id);
  }

  const batch: DistributionBatch = {
    id,
    releaseId,
    userId,
    platforms,
    deliveryIds,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`distribution:batch:${id}`, batch);
  await kv.set(`distribution:release:${releaseId}`, id);

  return batch;
}

/**
 * Create DSP delivery
 */
async function createDSPDelivery(
  releaseId: string,
  platform: DSPPlatform,
  ddexXml: string
): Promise<DSPDelivery> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const delivery: DSPDelivery = {
    id,
    releaseId,
    platform,
    status: 'pending',
    ddexXml,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(`delivery:${id}`, delivery);
  await kv.set(`delivery:release:${releaseId}:${platform}`, id);

  return delivery;
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  updates?: {
    platformReleaseId?: string;
    platformUrl?: string;
    errorMessage?: string;
  }
): Promise<DSPDelivery | null> {
  const delivery = await kv.get<DSPDelivery>(`delivery:${deliveryId}`);
  if (!delivery) return null;

  const now = new Date().toISOString();
  const updatedDelivery: DSPDelivery = {
    ...delivery,
    status,
    ...updates,
    deliveredAt: status === 'delivered' ? now : delivery.deliveredAt,
    goLiveDate: status === 'live' ? now : delivery.goLiveDate,
    lastStatusCheck: now,
    updatedAt: now,
  };

  await kv.set(`delivery:${deliveryId}`, updatedDelivery);

  return updatedDelivery;
}

/**
 * Get delivery by ID
 */
export async function getDeliveryById(deliveryId: string): Promise<DSPDelivery | null> {
  return await kv.get(`delivery:${deliveryId}`);
}

/**
 * Get all deliveries for a release
 */
export async function getReleaseDeliveries(releaseId: string): Promise<DSPDelivery[]> {
  const deliveryKeys = await kv.getByPrefix(`delivery:release:${releaseId}:`);
  const deliveries: DSPDelivery[] = [];

  for (const key of deliveryKeys) {
    const deliveryId = key.value;
    if (typeof deliveryId === 'string') {
      const delivery = await getDeliveryById(deliveryId);
      if (delivery) {
        deliveries.push(delivery);
      }
    }
  }

  return deliveries;
}

/**
 * Get distribution batch
 */
export async function getDistributionBatch(batchId: string): Promise<DistributionBatch | null> {
  return await kv.get(`distribution:batch:${batchId}`);
}

/**
 * Retry failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<DSPDelivery | null> {
  const delivery = await getDeliveryById(deliveryId);
  if (!delivery) return null;

  if (delivery.retryCount >= 3) {
    throw new Error('Maximum retry attempts reached');
  }

  const updatedDelivery: DSPDelivery = {
    ...delivery,
    status: 'pending',
    retryCount: delivery.retryCount + 1,
    errorMessage: undefined,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`delivery:${deliveryId}`, updatedDelivery);

  return updatedDelivery;
}

/**
 * Simulate delivery to DSP (placeholder for actual API integrations)
 */
export async function simulateDelivery(deliveryId: string): Promise<void> {
  const delivery = await getDeliveryById(deliveryId);
  if (!delivery) {
    throw new Error('Delivery not found');
  }

  // Update to processing
  await updateDeliveryStatus(deliveryId, 'processing');

  // Simulate delivery delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Update to delivered (in production, this would be actual DSP API calls)
  await updateDeliveryStatus(deliveryId, 'delivered', {
    platformReleaseId: `${delivery.platform}_${crypto.randomUUID().slice(0, 8)}`,
    platformUrl: `https://${delivery.platform}.com/release/${delivery.releaseId}`,
  });
}

/**
 * Get delivery statistics for user
 */
export async function getUserDeliveryStats(userId: string): Promise<{
  total: number;
  pending: number;
  processing: number;
  delivered: number;
  live: number;
  failed: number;
}> {
  const releases = await metadataService.getUserReleases(userId);
  const stats = {
    total: 0,
    pending: 0,
    processing: 0,
    delivered: 0,
    live: 0,
    failed: 0,
  };

  for (const release of releases) {
    const deliveries = await getReleaseDeliveries(release.id);
    for (const delivery of deliveries) {
      stats.total++;
      if (delivery.status === 'pending') stats.pending++;
      if (delivery.status === 'processing') stats.processing++;
      if (delivery.status === 'delivered') stats.delivered++;
      if (delivery.status === 'live') stats.live++;
      if (delivery.status === 'failed') stats.failed++;
    }
  }

  return stats;
}
