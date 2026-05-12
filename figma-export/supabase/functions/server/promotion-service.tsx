import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export const PROMOTION_ASSET_BUCKET = 'make-79198001-promotion-assets';

export type PromoPlanId = '1-week' | '2-weeks' | '4-weeks';
export type PromotionStatus = 'pending_payment' | 'active' | 'completed';
export type PromotionApprovalStatus = 'pending' | 'approved';
export type PromotionAssetType = 'video' | 'banner' | 'graphic';

export interface PromotionAssetRecord {
  id: string;
  campaignId: string;
  name: string;
  type: PromotionAssetType;
  sortOrder: number;
  storageBucket?: string | null;
  storagePath?: string | null;
  url?: string | null;
  ready: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionCampaignRecord {
  id: string;
  userId: string;
  email: string;
  planId: PromoPlanId;
  planName: string;
  amount: number;
  displayPrice: string;
  purchasedAt: string;
  expiresAt: string;
  status: PromotionStatus;
  releaseTitle: string;
  artistName: string;
  releaseId?: string | null;
  releaseImageUrl?: string | null;
  releaseType?: string | null;
  releaseGenre?: string | null;
  paymentReference?: string | null;
  adminApprovalStatus: PromotionApprovalStatus;
  approvedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  assets: PromotionAssetRecord[];
}

const PROMOTION_PLANS: Record<PromoPlanId, {
  planName: string;
  amount: number;
  displayPrice: string;
  durationDays: number;
  assets: Array<{ name: string; type: PromotionAssetType }>;
}> = {
  '1-week': {
    planName: '1-Week Campaign',
    amount: 30000,
    displayPrice: '₦30,000',
    durationDays: 7,
    assets: [
      { name: '3 Promotional Graphics', type: 'graphic' },
      { name: '1 Social Banner Set', type: 'banner' },
    ],
  },
  '2-weeks': {
    planName: '2-Weeks Campaign',
    amount: 40000,
    displayPrice: '₦40,000',
    durationDays: 14,
    assets: [
      { name: '1 Promotional Video (30s)', type: 'video' },
      { name: '5 Promotional Graphics', type: 'graphic' },
      { name: '2 Social Banner Sets', type: 'banner' },
    ],
  },
  '4-weeks': {
    planName: '4-Week Campaign',
    amount: 100000,
    displayPrice: '₦100,000',
    durationDays: 28,
    assets: [
      { name: '2 Promotional Videos (60s + 15s reel)', type: 'video' },
      { name: '10 Promotional Graphics', type: 'graphic' },
      { name: '4 Social Banner Sets', type: 'banner' },
    ],
  },
};

function ensurePlan(planId: string): PromoPlanId {
  if (planId === '1-week' || planId === '2-weeks' || planId === '4-weeks') {
    return planId;
  }

  throw new Error('Invalid promotion plan selected');
}

function addDays(isoDate: string, days: number) {
  const value = new Date(isoDate);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

async function ensurePromotionAssetBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw error;
  }

  const exists = buckets?.some((bucket) => bucket.name === PROMOTION_ASSET_BUCKET);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(PROMOTION_ASSET_BUCKET, { public: false });
    if (createError) {
      throw createError;
    }
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function buildAssetUrl(asset: {
  storage_bucket?: string | null;
  storage_path?: string | null;
  ready: boolean;
}) {
  if (!asset.ready || !asset.storage_bucket || !asset.storage_path) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_path, 60 * 60);

  if (error) {
    console.error('Failed to sign promotion asset URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

async function mapCampaign(row: any): Promise<PromotionCampaignRecord> {
  const assets = Array.isArray(row.promotion_assets) ? row.promotion_assets : [];
  const mappedAssets = await Promise.all(assets.map(async (asset: any) => ({
    id: asset.id,
    campaignId: row.id,
    name: asset.name,
    type: asset.type,
    sortOrder: asset.sort_order,
    storageBucket: asset.storage_bucket,
    storagePath: asset.storage_path,
    url: await buildAssetUrl(asset),
    ready: Boolean(asset.ready),
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
  })));

  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: row.amount,
    displayPrice: row.display_price,
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    status: row.status,
    releaseTitle: row.release_title,
    artistName: row.artist_name,
    releaseId: row.release_id ?? null,
    releaseImageUrl: row.release_image_url ?? null,
    releaseType: row.release_type ?? null,
    releaseGenre: row.release_genre ?? null,
    paymentReference: row.payment_reference,
    adminApprovalStatus: row.admin_approval_status,
    approvedAt: row.approved_at,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assets: mappedAssets.sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

async function getCampaignRowById(id: string) {
  const { data, error } = await supabase
    .from('promotion_campaigns')
    .select(`
      *,
      promotion_assets (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to load promotion campaign: ${error.message}`);
  }

  return data;
}

export async function createPromotionCampaign(input: {
  userId: string;
  email: string;
  planId: string;
  releaseTitle: string;
  artistName: string;
  releaseId?: string | null;
  releaseImageUrl?: string | null;
  releaseType?: string | null;
  releaseGenre?: string | null;
}) {
  const planId = ensurePlan(input.planId);
  const plan = PROMOTION_PLANS[planId];
  const purchasedAt = new Date().toISOString().slice(0, 10);
  const expiresAt = addDays(purchasedAt, plan.durationDays);

  const { data: campaignRow, error: campaignError } = await supabase
    .from('promotion_campaigns')
    .insert({
      user_id: input.userId,
      email: input.email,
      plan_id: planId,
      plan_name: plan.planName,
      amount: plan.amount,
      display_price: plan.displayPrice,
      purchased_at: purchasedAt,
      expires_at: expiresAt,
      status: 'pending_payment',
      release_title: input.releaseTitle,
      artist_name: input.artistName,
      release_id: input.releaseId ?? null,
      release_image_url: input.releaseImageUrl ?? null,
      release_type: input.releaseType ?? null,
      release_genre: input.releaseGenre ?? null,
      admin_approval_status: 'pending',
    })
    .select('*')
    .single();

  if (campaignError || !campaignRow) {
    const reason = campaignError?.message
      || 'Insert returned no row. Ensure promotion_campaigns table exists and includes release_id, release_image_url, release_type, release_genre columns.';
    throw new Error(`Failed to create promotion campaign: ${reason}`);
  }

  const assetRows = plan.assets.map((asset, index) => ({
    campaign_id: campaignRow.id,
    name: asset.name,
    type: asset.type,
    sort_order: index,
    ready: false,
  }));

  const { error: assetsError } = await supabase
    .from('promotion_assets')
    .insert(assetRows);

  if (assetsError) {
    throw new Error(`Failed to create promotion assets: ${assetsError.message}`);
  }

  return getPromotionCampaignById(campaignRow.id);
}

export async function getPromotionCampaignById(id: string) {
  const row = await getCampaignRowById(id);
  return mapCampaign(row);
}

export async function getUserPromotionCampaigns(userId: string) {
  const { data, error } = await supabase
    .from('promotion_campaigns')
    .select(`
      *,
      promotion_assets (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('sort_order', { ascending: true, referencedTable: 'promotion_assets' });

  if (error) {
    throw new Error(`Failed to load promotion campaigns: ${error.message}`);
  }

  return Promise.all((data || []).map(mapCampaign));
}

export async function getAllPromotionCampaigns() {
  const { data, error } = await supabase
    .from('promotion_campaigns')
    .select(`
      *,
      promotion_assets (*)
    `)
    .order('created_at', { ascending: false })
    .order('sort_order', { ascending: true, referencedTable: 'promotion_assets' });

  if (error) {
    throw new Error(`Failed to load all promotion campaigns: ${error.message}`);
  }

  return Promise.all((data || []).map(mapCampaign));
}

export async function getPromotionCampaignForUser(campaignId: string, userId: string) {
  const { data, error } = await supabase
    .from('promotion_campaigns')
    .select(`
      *,
      promotion_assets (*)
    `)
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Promotion campaign not found');
  }

  return mapCampaign(data);
}

export async function activatePromotionPayment(campaignId: string, reference: string, paidAt?: string) {
  const { error } = await supabase
    .from('promotion_campaigns')
    .update({
      status: 'active',
      payment_reference: reference,
      purchased_at: paidAt ? new Date(paidAt).toISOString().slice(0, 10) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) {
    throw new Error(`Failed to activate promotion payment: ${error.message}`);
  }
}

export async function approvePromotionCampaign(campaignId: string, adminNotes?: string) {
  const { error } = await supabase
    .from('promotion_campaigns')
    .update({
      admin_approval_status: 'approved',
      approved_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) {
    throw new Error(`Failed to approve promotion campaign: ${error.message}`);
  }

  return getPromotionCampaignById(campaignId);
}

export async function updatePromotionCampaign(campaignId: string, input: {
  adminNotes?: string;
  status?: PromotionStatus;
}) {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.adminNotes !== undefined) {
    patch.admin_notes = input.adminNotes;
  }

  if (input.status) {
    patch.status = input.status;
  }

  const { error } = await supabase
    .from('promotion_campaigns')
    .update(patch)
    .eq('id', campaignId);

  if (error) {
    throw new Error(`Failed to update promotion campaign: ${error.message}`);
  }

  return getPromotionCampaignById(campaignId);
}

export async function createPromotionAssetUploadTarget(campaignId: string, assetId: string, fileName: string) {
  await ensurePromotionAssetBucket();
  const sanitized = sanitizeFileName(fileName);
  const path = `${campaignId}/${assetId}/${Date.now()}_${sanitized}`;
  const { data, error } = await supabase.storage
    .from(PROMOTION_ASSET_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    throw new Error(`Failed to create promotion asset upload target: ${error?.message || 'No upload token returned'}`);
  }

  return {
    bucket: PROMOTION_ASSET_BUCKET,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function finalizePromotionAssetUpload(campaignId: string, assetId: string, path: string, ready = true) {
  const { error } = await supabase
    .from('promotion_assets')
    .update({
      storage_bucket: PROMOTION_ASSET_BUCKET,
      storage_path: path,
      ready,
      updated_at: new Date().toISOString(),
    })
    .eq('campaign_id', campaignId)
    .eq('id', assetId);

  if (error) {
    throw new Error(`Failed to finalize promotion asset: ${error.message}`);
  }

  return getPromotionCampaignById(campaignId);
}

export async function getPromotionAssetUpload(campaignId: string, assetId: string) {
  const campaign = await getPromotionCampaignById(campaignId);
  const asset = campaign.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new Error('Promotion asset not found');
  }
  return asset;
}
