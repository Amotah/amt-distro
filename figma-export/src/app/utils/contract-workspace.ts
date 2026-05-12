import type { UserProfile } from './user-api';
import { supabase } from '../../../utils/supabase/client';

export const CONTRACT_WORKSPACE_STORAGE_KEY = 'amtdistro-contract-workspace';
export const CONTRACT_WORKSPACE_UPDATED_EVENT = 'amtdistro:contract-workspace-updated';

export type ContractSigningRole = 'artist' | 'partner';
export type ContractSignatureMode = 'auto' | 'typed';

export type ContractSignature = {
  mode: ContractSignatureMode;
  signedName: string;
  typedName: string;
  signedAt: string;
};

export type ContractExecutionStatus = 'draft' | 'pending-counterparty' | 'signed';
export type ContractStorageSource = 'supabase' | 'local';

export type ContractWorkspaceSummary = {
  status: ContractExecutionStatus;
  lockedAt?: string;
  contractCode: string;
  source: ContractStorageSource;
};

export type ContractWorkspaceLoadResult = {
  ownerUserId: string | null;
  record: ContractWorkspaceRecord | null;
  source: ContractStorageSource;
  error?: string;
};

export type ContractWorkspaceRecord = {
  id: string;
  contractCode: string;
  startDate: string;
  signerRole: ContractSigningRole;
  clientName: string;
  company: string;
  governmentId: string;
  taxNumber: string;
  labelName: string;
  labelCompany: string;
  labelEmail: string;
  artistName: string;
  artistCompany: string;
  artistEmail: string;
  territory: string;
  commissionRate: number;
  termSummary: string;
  customTerms: string;
  lockedAt?: string;
  executedBy?: ContractSigningRole;
  status: ContractExecutionStatus;
  signatures: Partial<Record<ContractSigningRole, ContractSignature>>;
  updatedAt: string;
};

type ContractWorkspaceMap = Record<string, ContractWorkspaceRecord>;

type ContractWorkspaceRow = {
  owner_user_id: string;
  contract_code: string;
  status: ContractExecutionStatus;
  locked_at: string | null;
  executed_by: ContractSigningRole | null;
  payload: ContractWorkspaceRecord;
  updated_at: string;
};

function getStorageKey(profile: UserProfile) {
  return profile.userId || profile.id;
}

function dispatchWorkspaceUpdated(storageKey: string, record: ContractWorkspaceRecord) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CONTRACT_WORKSPACE_UPDATED_EVENT, {
    detail: {
      storageKey,
      record,
    },
  }));
}

function getDisplayName(profile: UserProfile) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  return profile.role === 'partner'
    ? profile.labelName || fullName || profile.username || profile.email.split('@')[0]
    : profile.artistName || fullName || profile.username || profile.email.split('@')[0];
}

function getCompanyName(profile: UserProfile) {
  return profile.role === 'partner'
    ? profile.labelName || getDisplayName(profile)
    : profile.artistName || getDisplayName(profile);
}

function getCounterpartyName(role: ContractSigningRole) {
  return role === 'partner' ? 'AMT DISTRO' : 'AMT DISTRO';
}

function getCounterpartyCompany() {
  return 'AMOTAH ENTERPRISES';
}

function getSignerRole(profile: UserProfile): ContractSigningRole {
  return profile.role === 'partner' ? 'partner' : 'artist';
}

export function getCounterpartyRole(role: ContractSigningRole): ContractSigningRole {
  return role === 'partner' ? 'artist' : 'partner';
}

export function deriveCommissionRate(profile: Pick<UserProfile, 'role' | 'subscriptionTier'>) {
  return profile.role === 'artist' && profile.subscriptionTier === 'artist' ? 25 : 0;
}

export function isContractLocked(record: ContractWorkspaceRecord) {
  return record.status !== 'draft' || Boolean(record.lockedAt);
}

export function isContractFullySigned(record: ContractWorkspaceRecord) {
  return Boolean(record.signatures.artist?.signedAt && record.signatures.label?.signedAt);
}

function normalizeRecord(record: ContractWorkspaceRecord, profile: UserProfile): ContractWorkspaceRecord {
  const signerRole = getSignerRole(profile);
  const clientName = getDisplayName(profile);
  const company = getCompanyName(profile);
  const counterpartyRole = getCounterpartyRole(signerRole);
  const signatures = record.signatures || {};
  const status = isContractFullySigned(record)
    ? 'signed'
    : isContractLocked(record)
      ? 'pending-counterparty'
      : 'draft';
  const lockedAt = record.lockedAt || signatures.artist?.signedAt || signatures.label?.signedAt;
  const commissionRate = status === 'signed' ? record.commissionRate : deriveCommissionRate(profile);

  return {
    ...record,
    signerRole,
    clientName,
    company,
    labelName: signerRole === 'partner' ? clientName : getCounterpartyName(counterpartyRole),
    labelCompany: signerRole === 'partner' ? company : getCounterpartyCompany(),
    labelEmail: signerRole === 'partner' ? profile.email : 'support@amtmusic.com',
    artistName: signerRole === 'artist' ? clientName : getCounterpartyName(counterpartyRole),
    artistCompany: signerRole === 'artist' ? company : getCounterpartyCompany(),
    artistEmail: signerRole === 'artist' ? profile.email : 'support@amtmusic.com',
    commissionRate,
    signatures,
    status,
    lockedAt,
    executedBy: record.executedBy || (lockedAt ? signerRole : undefined),
  };
}

function getCountryCode(country?: string) {
  const trimmed = (country || 'WW').trim();
  if (!trimmed) {
    return 'WW';
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const initials = parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return initials || trimmed.slice(0, 2).toUpperCase();
}

function formatContractDate(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  const day = `${parsed.getDate()}`.padStart(2, '0');
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const year = `${parsed.getFullYear()}`.slice(-2);
  return `${day}${month}${year}`;
}

function getProfileStartDate(profile: UserProfile) {
  const rawDate = profile.createdAt || new Date().toISOString();
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function readWorkspaceMap(): ContractWorkspaceMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CONTRACT_WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ContractWorkspaceMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeWorkspaceMap(workspaceMap: ContractWorkspaceMap) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONTRACT_WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceMap));
}

function writeWorkspaceRecord(storageKey: string, record: ContractWorkspaceRecord) {
  const current = readWorkspaceMap();
  current[storageKey] = record;
  writeWorkspaceMap(current);
  dispatchWorkspaceUpdated(storageKey, record);
}

function readContractWorkspaceByStorageKey(storageKey: string) {
  const current = readWorkspaceMap();
  return current[storageKey] || null;
}

function findContractWorkspaceByCode(contractCode: string): ContractWorkspaceLoadResult {
  const current = readWorkspaceMap();
  const entry = Object.entries(current).find(([, record]) => record.contractCode === contractCode);

  if (!entry) {
    return {
      ownerUserId: null,
      record: null,
      source: 'local',
    };
  }

  // entry[0] is the storageKey
  return {
    ownerUserId: entry[0],
    record: entry[1],
    source: 'local',
  };
}

function mapRowToRecord(row: ContractWorkspaceRow) {
  return {
    ownerUserId: row.owner_user_id,
    record: row.payload,
    source: 'supabase' as const,
  };
}

async function readSupabaseContractWorkspaceByOwner(ownerUserId: string): Promise<ContractWorkspaceLoadResult> {
  try {
    const { data, error } = await supabase
      .from('contract_workspaces')
      .select('owner_user_id, contract_code, status, locked_at, executed_by, payload, updated_at')
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ownerUserId,
        record: null,
        source: 'supabase',
      };
    }

    return mapRowToRecord(data as ContractWorkspaceRow);
  } catch (error) {
    return {
      ownerUserId,
      record: null,
      source: 'supabase',
      error: error instanceof Error ? error.message : 'Unable to load contract from Supabase.',
    };
  }
}

async function readSupabaseContractWorkspaceByCode(contractCode: string): Promise<ContractWorkspaceLoadResult> {
  try {
    const { data, error } = await supabase
      .from('contract_workspaces')
      .select('owner_user_id, contract_code, status, locked_at, executed_by, payload, updated_at')
      .eq('contract_code', contractCode)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ownerUserId: null,
        record: null,
        source: 'supabase',
      };
    }

    return mapRowToRecord(data as ContractWorkspaceRow);
  } catch (error) {
    return {
      ownerUserId: null,
      record: null,
      source: 'supabase',
      error: error instanceof Error ? error.message : 'Unable to load contract from Supabase.',
    };
  }
}

async function upsertSupabaseContractWorkspace(storageKey: string, record: ContractWorkspaceRecord) {
  const payload: ContractWorkspaceRow = {
    owner_user_id: storageKey,
    contract_code: record.contractCode,
    status: record.status,
    locked_at: record.lockedAt || null,
    executed_by: record.executedBy || null,
    payload: record,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('contract_workspaces')
    .upsert([payload] as any, { onConflict: 'owner_user_id' });

  if (error) {
    throw error;
  }
}

export function writeContractWorkspace(record: ContractWorkspaceRecord, profile: UserProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getStorageKey(profile);
  writeWorkspaceRecord(storageKey, normalizeRecord(record, profile));
}

export function readContractWorkspace(profile: UserProfile) {
  const stored = readContractWorkspaceByStorageKey(getStorageKey(profile));
  return stored ? normalizeRecord(stored, profile) : null;
}

export async function loadContractWorkspace(profile: UserProfile): Promise<ContractWorkspaceLoadResult> {
  const storageKey = getStorageKey(profile);
  const localRecord = readContractWorkspace(profile);
  const remote = await readSupabaseContractWorkspaceByOwner(storageKey);

  if (remote.record) {
    const normalized = normalizeRecord(remote.record, profile);
    writeWorkspaceRecord(storageKey, normalized);
    return {
      ownerUserId: storageKey,
      record: normalized,
      source: 'supabase',
    };
  }

  if (localRecord) {
    return {
      ownerUserId: storageKey,
      record: localRecord,
      source: 'local',
      error: remote.error,
    };
  }

  return {
    ownerUserId: storageKey,
    record: null,
    source: remote.error ? 'local' : remote.source,
    error: remote.error,
  };
}

export async function saveContractWorkspace(record: ContractWorkspaceRecord, profile: UserProfile) {
  const storageKey = getStorageKey(profile);
  const normalized = normalizeRecord(record, profile);
  writeWorkspaceRecord(storageKey, normalized);

  try {
    await upsertSupabaseContractWorkspace(storageKey, normalized);
    return {
      ownerUserId: storageKey,
      record: normalized,
      source: 'supabase' as const,
    };
  } catch (error) {
    return {
      ownerUserId: storageKey,
      record: normalized,
      source: 'local' as const,
      error: error instanceof Error ? error.message : 'Unable to sync contract to Supabase.',
    };
  }
}

export async function loadContractWorkspaceForAdmin(searchValue: string): Promise<ContractWorkspaceLoadResult> {
  const trimmed = searchValue.trim();
  if (!trimmed) {
    return {
      ownerUserId: null,
      record: null,
      source: 'local',
      error: 'Enter a contract code or owner user ID.',
    };
  }

  const remoteByOwner = await readSupabaseContractWorkspaceByOwner(trimmed);
  if (remoteByOwner.record) {
    writeWorkspaceRecord(remoteByOwner.ownerUserId || trimmed, remoteByOwner.record);
    return remoteByOwner;
  }

  const remoteByCode = await readSupabaseContractWorkspaceByCode(trimmed);
  if (remoteByCode.record && remoteByCode.ownerUserId) {
    writeWorkspaceRecord(remoteByCode.ownerUserId, remoteByCode.record);
    return remoteByCode;
  }

  const localByOwner = readContractWorkspaceByStorageKey(trimmed);
  if (localByOwner) {
    return {
      ownerUserId: trimmed,
      record: localByOwner,
      source: 'local',
      error: remoteByOwner.error || remoteByCode.error,
    };
  }

  const localByCode = findContractWorkspaceByCode(trimmed);
  if (localByCode.record) {
    return {
      ...localByCode,
      error: remoteByOwner.error || remoteByCode.error,
    };
  }

  return {
    ownerUserId: null,
    record: null,
    source: 'local',
    error: remoteByOwner.error || remoteByCode.error || 'No contract found for that code or owner user ID.',
  };
}

export async function saveContractWorkspaceForAdmin(record: ContractWorkspaceRecord, ownerUserId: string) {
  writeWorkspaceRecord(ownerUserId, record);

  try {
    await upsertSupabaseContractWorkspace(ownerUserId, record);
    return {
      ownerUserId,
      record,
      source: 'supabase' as const,
    };
  } catch (error) {
    return {
      ownerUserId,
      record,
      source: 'local' as const,
      error: error instanceof Error ? error.message : 'Unable to sync contract to Supabase.',
    };
  }
}

export function getStoredContractWorkspaceSummary(storageKey?: string | null): ContractWorkspaceSummary | null {
  if (!storageKey) {
    return null;
  }

  const record = readContractWorkspaceByStorageKey(storageKey);
  if (!record) {
    return null;
  }

  return {
    status: record.status,
    lockedAt: record.lockedAt,
    contractCode: record.contractCode,
    source: 'local',
  };
}

export function generateContractCode(profile: UserProfile, startDate: string) {
  const prefix = `${getCountryCode(profile.country)}${formatContractDate(startDate)}${profile.role === 'label' ? 'L' : 'A'}`;
  const current = Object.values(readWorkspaceMap());
  const nextSequence = current.filter((record) => record.contractCode.startsWith(prefix)).length + 1;
  return `${prefix}${`${nextSequence}`.padStart(3, '0')}`;
}

export function buildDefaultContractWorkspace(profile: UserProfile): ContractWorkspaceRecord {
  const startDate = getProfileStartDate(profile);
  const displayName = getDisplayName(profile);
  const company = getCompanyName(profile);
  const signerRole = getSignerRole(profile);
  const counterpartyRole = getCounterpartyRole(signerRole);

  return {
    id: crypto.randomUUID(),
    contractCode: generateContractCode(profile, startDate),
    startDate,
    signerRole,
    clientName: displayName,
    company,
    governmentId: '',
    taxNumber: '',
    labelName: signerRole === 'label' ? displayName : getCounterpartyName(counterpartyRole),
    labelCompany: signerRole === 'label' ? company : getCounterpartyCompany(),
    labelEmail: signerRole === 'label' ? profile.email : 'support@amtmusic.com',
    artistName: signerRole === 'artist' ? displayName : getCounterpartyName(counterpartyRole),
    artistCompany: signerRole === 'artist' ? company : getCounterpartyCompany(),
    artistEmail: signerRole === 'artist' ? profile.email : 'support@amtmusic.com',
    territory: profile.country || 'Worldwide',
    commissionRate: deriveCommissionRate(profile),
    termSummary: 'Digital distribution and administration agreement for releases delivered through the platform.',
    customTerms: deriveCommissionRate(profile) > 0
      ? 'A 25% commission applies to free artist net receipts after platform deductions and taxes. Both parties confirm they have the authority to enter this agreement.'
      : 'No AMT DISTRO sales commission applies to this paid artist or label plan. Both parties confirm they have the authority to enter this agreement.',
    status: 'draft',
    signatures: {},
    updatedAt: new Date().toISOString(),
  };
}

export function getSuggestedSignatureName(role: ContractSigningRole, record: ContractWorkspaceRecord) {
  if (role === 'label') {
    return record.labelName || record.labelCompany || record.clientName;
  }

  return record.artistName || record.clientName;
}

export function buildRenderedContractText(template: string, record: ContractWorkspaceRecord) {
  const commissionSentence = record.commissionRate > 0
    ? `Additionally, You will receive 100.00% of the net incomes (deducting expenses and taxes) which We receive from Digital Music Services from the exploitation of Your Content. If applicable, You authorize Us to deduct ${record.commissionRate}% sales commission percentage from the net incomes received by Us from Digital Music Services for free artist only.`
    : 'Additionally, You will receive 100.00% of the net incomes (deducting expenses and taxes) which We receive from Digital Music Services from the exploitation of Your Content. No sales commission percentage is deducted by AMT DISTRO for paid artist or label plans under the current pricing terms.';

  return template
    .replace('Start Date:\tDate of Profile creation', `Start Date:\t${record.startDate || '—'}`)
    .replace(
      'Contract Code:\tgenerate code based on client country , date , ARTIST OR LABEL and a generate number (NG090426A001)',
      `Contract Code:\t${record.contractCode}`,
    )
    .replace('Client Name:\t— ARTIST NAME OR LABEL', `Client Name:\t${record.clientName || '—'}`)
    .replace('Company:\t— ARTIST NAME OR LABEL COMPANY', `Company:\t${record.company || '—'}`)
    .replace('NIF/CIF/ID:\t—', `NIF/CIF/ID:\t${record.governmentId || '—'}`)
    .replace('TIN: Tax number if possible', `TIN:\t${record.taxNumber || '—'}`)
    .replace(
      'Additionally, You will receive 100.00% of the net incomes (deducting expenses and taxes) which We receive from Digital Music Services from the exploitation of Your Content. If applicable, You authorize Us to deduct 20% sales commission percentage from the net incomes received by Us from Digital Music Services for free artist only.',
      commissionSentence,
    );
}