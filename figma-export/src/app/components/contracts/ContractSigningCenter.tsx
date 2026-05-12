import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Database, FileSearch, FileText, PenLine, Printer, RefreshCw, Save, ShieldCheck, UserCircle2 } from 'lucide-react';
import contractTemplateText from '../../contracts/contract-template.txt?raw';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { getCurrentUserProfile, type UserProfile } from '../../utils/user-api';
import {
  buildDefaultContractWorkspace,
  buildRenderedContractText,
  deriveCommissionRate,
  getCounterpartyRole,
  getSuggestedSignatureName,
  isContractFullySigned,
  isContractLocked,
  loadContractWorkspace,
  loadContractWorkspaceForAdmin,
  saveContractWorkspace,
  saveContractWorkspaceForAdmin,
  type ContractStorageSource,
  type ContractSigningRole,
  type ContractWorkspaceRecord,
} from '../../utils/contract-workspace';

type SignatureDraftMap = Record<ContractSigningRole, string>;

function SignaturePanel({
  role,
  title,
  description,
  record,
  draftName,
  onDraftNameChange,
  onAutoSign,
  onTypedSign,
  isFinalized,
  isDisabled,
  disabledMessage,
  allowResign,
}: {
  role: ContractSigningRole;
  title: string;
  description: string;
  record: ContractWorkspaceRecord;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  onAutoSign: () => void;
  onTypedSign: () => void;
  isFinalized: boolean;
  isDisabled: boolean;
  disabledMessage?: string;
  allowResign?: boolean;
}) {
  const signature = record.signatures[role];
  const suggestedName = getSuggestedSignatureName(role, record);
  const locked = isFinalized || isDisabled || (!allowResign && Boolean(signature));

  return (
    <Card className={`border p-5 ${!isDisabled ? 'border-[#FF6B00]/40 bg-[#161616]' : 'border-white/10 bg-[#111111]'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-[#B3B3B3]">{description}</p>
        </div>
        {signature ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" />
            Signed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-[#B3B3B3]">
            Pending
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0A0A0A] p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.24em] text-[#B3B3B3]">Auto signature preview</div>
          <div className="contract-signature-font text-3xl text-white">
            {signature?.signedName || suggestedName || 'Unsigned'}
          </div>
          <div className="mt-2 text-xs text-[#8A8A8A]">
            {signature?.signedAt ? `Signed on ${new Date(signature.signedAt).toLocaleString()}` : 'Use the saved profile or contract party name.'}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${role}-typed-signature`} className="text-[#E5E7EB]">Type signer name</Label>
          <Input
            id={`${role}-typed-signature`}
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            placeholder={suggestedName || `Enter ${role} legal name`}
            className="border-white/10 bg-[#0A0A0A] text-white"
            disabled={locked}
          />
        </div>

        {disabledMessage ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {disabledMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAutoSign} className="bg-[#FF6B00] text-white hover:bg-[#e56200]" disabled={locked}>
            <PenLine className="mr-2 h-4 w-4" />
            {allowResign && signature ? 'Re-sign' : 'Auto Sign'}
          </Button>
          <Button type="button" variant="outline" onClick={onTypedSign} className="border-white/10 text-white hover:bg-white/5" disabled={locked}>
            <UserCircle2 className="mr-2 h-4 w-4" />
            Sign with Typed Name
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ContractSigningCenter() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [record, setRecord] = useState<ContractWorkspaceRecord | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [signatureDrafts, setSignatureDrafts] = useState<SignatureDraftMap>({ artist: '', label: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [storageSource, setStorageSource] = useState<ContractStorageSource>('local');
  const [adminLookup, setAdminLookup] = useState('');
  const [isAdminLookupLoading, setIsAdminLookupLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminView = profile?.role === 'admin';

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        const nextProfile = await getCurrentUserProfile();
        if (!active) {
          return;
        }

        setProfile(nextProfile);

        if (nextProfile.role === 'admin') {
          setRecord(null);
          setOwnerUserId(null);
          setStorageSource('local');
          setSignatureDrafts({ artist: '', label: '' });
          setStatusMessage('Load a contract by owner user ID or contract code to review and sign the AMT DISTRO side.');
          setErrorMessage('');
        } else {
          const loaded = await loadContractWorkspace(nextProfile);
          if (!active) {
            return;
          }

          const nextRecord = loaded.record || buildDefaultContractWorkspace(nextProfile);
          setRecord(nextRecord);
          setOwnerUserId(loaded.ownerUserId || nextProfile.userId || nextProfile.id);
          setStorageSource(loaded.record ? loaded.source : 'local');
          setSignatureDrafts({
            artist: nextRecord.signatures.artist?.typedName || '',
            label: nextRecord.signatures.label?.typedName || '',
          });
          setStatusMessage(loaded.error ? 'Loaded the local contract copy because Supabase sync is currently unavailable.' : '');
          setErrorMessage('');
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load contract workspace.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const renderedContractText = useMemo(() => {
    if (!record) {
      return '';
    }

    return buildRenderedContractText(contractTemplateText, record);
  }, [record]);

  const contractLocked = record ? isContractLocked(record) : false;
  const contractFinalized = record ? isContractFullySigned(record) : false;
  const signerRole = isAdminView ? (record?.signerRole || 'artist') : profile?.role === 'label' ? 'label' : 'artist';
  const counterpartyRole = getCounterpartyRole(signerRole);
  const signerDisplayLabel = signerRole === 'label' ? 'Label' : 'Artist';
  const canSignerSelfSign = !isAdminView;
  const canAmtSign = Boolean(isAdminView && ownerUserId && record);
  const missingSignerRequirements = record
    ? [
        record.company.trim() ? null : 'Company name',
        record.governmentId.trim() ? null : 'NIF / CIF / ID',
        record.taxNumber.trim() ? null : 'TIN',
      ].filter((value): value is string => Boolean(value))
    : [];

  function hydrateLoadedRecord(nextRecord: ContractWorkspaceRecord, nextOwnerUserId: string | null, nextSource: ContractStorageSource, nextError?: string) {
    setRecord(nextRecord);
    setOwnerUserId(nextOwnerUserId);
    setStorageSource(nextSource);
    setSignatureDrafts({
      artist: nextRecord.signatures.artist?.typedName || '',
      label: nextRecord.signatures.label?.typedName || '',
    });
    setStatusMessage(nextError ? 'Loaded the local contract copy because Supabase sync is currently unavailable.' : '');
    setErrorMessage(nextError || '');
  }

  function patchRecord(partial: Partial<ContractWorkspaceRecord>) {
    setRecord((current) => {
      if (!current || isContractLocked(current)) {
        return current;
      }

      return { ...current, ...partial, updatedAt: new Date().toISOString() };
    });
  }

  async function saveRecord(nextRecord?: ContractWorkspaceRecord) {
    if (!profile) {
      return;
    }

    const current = nextRecord || record;
    if (!current) {
      return;
    }

    if (isContractLocked(current)) {
      if (isAdminView && ownerUserId) {
        await saveContractWorkspaceForAdmin(current, ownerUserId);
      } else {
        await saveContractWorkspace(current, profile);
      }
      setStatusMessage(contractFinalized ? 'Signed contracts are locked and cannot be edited.' : 'Contract fields are locked while the remaining signature is pending.');
      setErrorMessage('');
      return;
    }

    const payload = { ...current, updatedAt: new Date().toISOString() };
    const result = isAdminView && ownerUserId
      ? await saveContractWorkspaceForAdmin(payload, ownerUserId)
      : await saveContractWorkspace(payload, profile);

    setStorageSource(result.source);
    setStatusMessage(result.source === 'supabase'
      ? 'Contract draft saved to Supabase.'
      : 'Contract draft saved locally. Supabase sync is unavailable right now.');
    setErrorMessage(result.error || '');
  }

  async function handleSignature(role: ContractSigningRole, mode: 'auto' | 'typed') {
    if (isAdminView && (!record || !ownerUserId)) {
      setErrorMessage('Unable to sign. Load a contract first.');
      setStatusMessage('');
      return;
    }
    if (!record) {
      return;
    }

    if (isAdminView && role !== counterpartyRole) {
      setErrorMessage('Admin access can only sign the AMT DISTRO side of a contract.');
      setStatusMessage('');
      return;
    }

    if (!isAdminView && isContractFullySigned(record)) {
      setErrorMessage('This contract has already been signed and is now locked.');
      setStatusMessage('');
      return;
    }

    if (!isAdminView && record.signatures[role]?.signedAt) {
      setErrorMessage(`${role === counterpartyRole ? 'AMT DISTRO' : signerDisplayLabel} has already signed this contract.`);
      setStatusMessage('');
      return;
    }

    if (!isAdminView && role !== signerRole) {
      setErrorMessage('You can only sign your own side of the contract.');
      setStatusMessage('');
      return;
    }

    if (!isAdminView && missingSignerRequirements.length > 0) {
      setErrorMessage(`Complete the required signer fields before signing: ${missingSignerRequirements.join(', ')}.`);
      setStatusMessage('');
      return;
    }

    const signedName = mode === 'auto'
      ? getSuggestedSignatureName(role, record)
      : signatureDrafts[role].trim();

    if (!signedName) {
      setErrorMessage(`Enter a ${role} name before signing.`);
      setStatusMessage('');
      return;
    }

    const now = new Date().toISOString();
    const amtMusikSignatureName = 'AMT DISTRO';
    const amtCounterparty = getCounterpartyRole(role);
    const alreadyCounterSigned = Boolean(record.signatures[amtCounterparty]?.signedAt);

    // When artist/label signs (non-admin), auto-apply AMT DISTRO counter-signature
    const autoApplyAmtSignature = !isAdminView && !alreadyCounterSigned;

    const nextSignatures = {
      ...record.signatures,
      [role]: {
        mode,
        typedName: signatureDrafts[role].trim(),
        signedName,
        signedAt: now,
      },
      ...(autoApplyAmtSignature
        ? {
            [amtCounterparty]: {
              mode: 'auto' as const,
              typedName: amtMusikSignatureName,
              signedName: amtMusikSignatureName,
              signedAt: now,
            },
          }
        : {}),
    };

    const nextRecord: ContractWorkspaceRecord = {
      ...record,
      lockedAt: record.lockedAt || now,
      signatures: nextSignatures,
      status: autoApplyAmtSignature || alreadyCounterSigned ? 'signed' : 'pending-counterparty',
      executedBy: role,
      updatedAt: now,
    };

    setRecord(nextRecord);
    await saveRecord(nextRecord);

    if (autoApplyAmtSignature) {
      setStatusMessage(`${role === 'label' ? 'Label' : 'Artist'} signature recorded. AMT DISTRO has automatically counter-signed. The contract is now fully executed.`);
    } else if (role === counterpartyRole) {
      setStatusMessage('AMT DISTRO signature recorded.');
    } else {
      setStatusMessage(`${role === 'label' ? 'Label' : 'Artist'} signature recorded.`);
    }
    setErrorMessage('');
  }

  function regenerateDefaults() {
    if (!profile || isAdminView) {
      return;
    }

    const nextRecord = buildDefaultContractWorkspace(profile);
    setRecord(nextRecord);
    setOwnerUserId(profile.userId || profile.id);
    setSignatureDrafts({ artist: '', label: '' });
    void saveRecord(nextRecord);
    setStatusMessage('A fresh contract draft has been generated from your profile.');
    setErrorMessage('');
  }

  async function handleAdminLookupSubmit() {
    if (!adminLookup.trim()) {
      setErrorMessage('Enter a contract code or owner user ID.');
      setStatusMessage('');
      return;
    }

    try {
      setIsAdminLookupLoading(true);
      const loaded = await loadContractWorkspaceForAdmin(adminLookup);
      if (!loaded.record || !loaded.ownerUserId) {
        setRecord(null);
        setOwnerUserId(null);
        setErrorMessage(loaded.error || 'No contract found for that value.');
        setStatusMessage('');
        return;
      }

      // Fallback: if loaded.ownerUserId is missing, use adminLookup as ownerUserId
      const resolvedOwnerUserId = loaded.ownerUserId || adminLookup.trim();
      hydrateLoadedRecord(loaded.record, resolvedOwnerUserId, loaded.source, loaded.error);
      setStatusMessage(`Loaded contract ${loaded.record.contractCode} for owner ${resolvedOwnerUserId}.`);
      setErrorMessage(loaded.error || '');
    } finally {
      setIsAdminLookupLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-[#B3B3B3]">Loading contract workspace...</div>;
  }

  if (errorMessage && !record) {
    return <div className="p-6 text-sm text-red-300">{errorMessage}</div>;
  }

  if (!profile || !record) {
    if (profile?.role === 'admin') {
      return (
        <section className="min-h-screen bg-[#0A0A0A] px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <Card className="border-white/10 bg-[#161616] p-6 text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B00]/15">
                  <FileSearch className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Admin Contract Lookup</h1>
                  <p className="text-sm text-[#B3B3B3]">Load a user contract by owner user ID or contract code to apply the AMT DISTRO signature.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-contract-lookup" className="text-[#E5E7EB]">Owner User ID or Contract Code</Label>
                  <Input
                    id="admin-contract-lookup"
                    value={adminLookup}
                    onChange={(event) => setAdminLookup(event.target.value)}
                    placeholder="Enter owner user ID or contract code"
                    className="border-white/10 bg-[#0A0A0A] text-white"
                  />
                </div>
                {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}
                {statusMessage ? <p className="text-sm text-[#B3B3B3]">{statusMessage}</p> : null}
                <Button type="button" onClick={handleAdminLookupSubmit} className="bg-[#FF6B00] text-white hover:bg-[#e56200]" disabled={isAdminLookupLoading}>
                  <Database className="mr-2 h-4 w-4" />
                  {isAdminLookupLoading ? 'Loading Contract...' : 'Load Contract'}
                </Button>
              </div>
            </Card>
          </div>
        </section>
      );
    }

    return <div className="p-6 text-sm text-[#B3B3B3]">No contract workspace available.</div>;
  }

  return (
    <section className="min-h-screen bg-[#0A0A0A] px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Contract Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#B3B3B3] sm:text-base">
              {isAdminView
                ? 'Admin view for applying the AMT DISTRO counter-signature to a loaded contract. Only the AMT DISTRO side can be signed from this page.'
                : `This agreement is strictly between the signed-in ${profile.role} account and AMT DISTRO. Contract code and start date are system-generated. When you sign, AMT DISTRO will automatically counter-sign and the contract becomes permanently locked.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[#B3B3B3]">
              {storageSource === 'supabase' ? 'Synced to Supabase' : 'Local Fallback'}
            </div>
            <Button type="button" variant="outline" onClick={regenerateDefaults} className="border-white/10 text-white hover:bg-white/5" disabled={contractLocked || isAdminView}>
              <RefreshCw className="mr-2 h-4 w-4" />
              New Draft
            </Button>
            <Button type="button" variant="outline" onClick={() => void saveRecord()} className="border-white/10 text-white hover:bg-white/5" disabled={contractLocked && !isAdminView}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button type="button" onClick={handlePrint} className="bg-[#FF6B00] text-white hover:bg-[#e56200]">
              <Printer className="mr-2 h-4 w-4" />
              Print Contract
            </Button>
          </div>
        </div>

        {statusMessage ? (
          <div className="print:hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="print:hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] print:grid-cols-1">
          <div className="space-y-6 print:hidden">
            {isAdminView ? (
              <Card className="border-white/10 bg-[#161616] p-5 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B00]/15">
                    <FileSearch className="h-5 w-5 text-[#FF6B00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Load Contract</h2>
                    <p className="text-sm text-[#B3B3B3]">Switch to another contract by owner user ID or contract code.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={adminLookup}
                    onChange={(event) => setAdminLookup(event.target.value)}
                    placeholder="Owner user ID or contract code"
                    className="border-white/10 bg-[#0A0A0A] text-white"
                  />
                  <Button type="button" onClick={handleAdminLookupSubmit} className="bg-[#FF6B00] text-white hover:bg-[#e56200]" disabled={isAdminLookupLoading}>
                    <Database className="mr-2 h-4 w-4" />
                    Load
                  </Button>
                </div>
                {ownerUserId ? <p className="mt-3 text-xs text-[#B3B3B3]">Loaded owner: {ownerUserId}</p> : null}
              </Card>
            ) : null}

            <Card className="border-white/10 bg-[#161616] p-5 text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B00]/15">
                  <FileText className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Agreement Details</h2>
                  <p className="text-sm text-[#B3B3B3]">Locked party details, compliance data, and editable commercial terms before signature.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-start-date" className="text-[#E5E7EB]">Start Date</Label>
                    <Input
                      id="contract-start-date"
                      type="date"
                      value={record.startDate}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-code" className="text-[#E5E7EB]">Contract Code</Label>
                    <Input
                      id="contract-code"
                      value={record.contractCode}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-client-name" className="text-[#E5E7EB]">Client Name</Label>
                    <Input
                      id="contract-client-name"
                      value={record.clientName}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-company" className="text-[#E5E7EB]">Company</Label>
                    <Input
                      id="contract-company"
                      value={record.company}
                      onChange={(event) => patchRecord({ company: event.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      disabled={contractLocked}
                    />
                  </div>
                </div>

                {!isAdminView && missingSignerRequirements.length > 0 ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Complete these fields before {signerDisplayLabel.toLowerCase()} signing: {missingSignerRequirements.join(', ')}.
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-government-id" className="text-[#E5E7EB]">NIF / CIF / ID</Label>
                    <Input
                      id="contract-government-id"
                      value={record.governmentId}
                      onChange={(event) => patchRecord({ governmentId: event.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      disabled={contractLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-tax-number" className="text-[#E5E7EB]">TIN</Label>
                    <Input
                      id="contract-tax-number"
                      value={record.taxNumber}
                      onChange={(event) => patchRecord({ taxNumber: event.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      disabled={contractLocked}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-primary-party" className="text-[#E5E7EB]">Signed-in Party</Label>
                    <Input
                      id="contract-primary-party"
                      value={profile.role === 'label' ? record.labelName : record.artistName}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-counterparty" className="text-[#E5E7EB]">Counterparty</Label>
                    <Input
                      id="contract-counterparty"
                      value={profile.role === 'label' ? record.artistName : record.labelName}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-primary-company" className="text-[#E5E7EB]">Signed-in Company</Label>
                    <Input
                      id="contract-primary-company"
                      value={profile.role === 'label' ? record.labelCompany : record.artistCompany}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-counterparty-company" className="text-[#E5E7EB]">AMT DISTRO Company</Label>
                    <Input
                      id="contract-counterparty-company"
                      value={profile.role === 'label' ? record.artistCompany : record.labelCompany}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contract-territory" className="text-[#E5E7EB]">Territory</Label>
                    <Input
                      id="contract-territory"
                      value={record.territory}
                      onChange={(event) => patchRecord({ territory: event.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      disabled={contractLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contract-commission" className="text-[#E5E7EB]">Commission %</Label>
                    <Input
                      id="contract-commission"
                      type="number"
                      value={record.commissionRate}
                      className="border-white/10 bg-[#0A0A0A] text-white"
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-[#8A8A8A]">Free artist plans use 25%. Paid artist and label plans use 0%.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-term-summary" className="text-[#E5E7EB]">Terms Summary</Label>
                  <Textarea
                    id="contract-term-summary"
                    value={record.termSummary}
                    onChange={(event) => patchRecord({ termSummary: event.target.value })}
                    className="min-h-24 border-white/10 bg-[#0A0A0A] text-white"
                    disabled={contractLocked}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-custom-terms" className="text-[#E5E7EB]">Additional Terms</Label>
                  <Textarea
                    id="contract-custom-terms"
                    value={record.customTerms}
                    onChange={(event) => patchRecord({ customTerms: event.target.value })}
                    className="min-h-32 border-white/10 bg-[#0A0A0A] text-white"
                    disabled={contractLocked}
                  />
                </div>
              </div>
            </Card>

            <Card className="border-white/10 bg-[#161616] p-5 text-white">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Signature Control</h2>
                  <p className="text-sm text-[#B3B3B3]">The first signer is the signed-in account. The second signatory is fixed as AMT DISTRO. Once signed, the agreement cannot be changed.</p>
                </div>
              </div>
              <div className="space-y-4">
                <SignaturePanel
                  role={signerRole}
                  title={`${signerDisplayLabel} Signature`}
                  description={isAdminView ? 'This side is completed by the account holder and cannot be signed from admin mode.' : 'You can sign directly from this account after Company, NIF / CIF / ID, and TIN are filled.'}
                  record={record}
                  draftName={signatureDrafts[signerRole]}
                  onDraftNameChange={(value) => setSignatureDrafts((current) => ({ ...current, [signerRole]: value }))}
                  onAutoSign={() => void handleSignature(signerRole, 'auto')}
                  onTypedSign={() => void handleSignature(signerRole, 'typed')}
                  isFinalized={contractFinalized}
                  isDisabled={!canSignerSelfSign}
                  disabledMessage={isAdminView ? 'Admin mode cannot sign the artist or label side.' : missingSignerRequirements.length > 0 ? `Required before signing: ${missingSignerRequirements.join(', ')}.` : undefined}
                />
                <SignaturePanel
                  role={counterpartyRole}
                  title="AMT DISTRO Signature"
                  description={isAdminView ? 'Internal AMT DISTRO admin controls for counter-signing this contract.' : 'AMT DISTRO will automatically counter-sign when you sign your side of the agreement.'}
                  record={record}
                  draftName={signatureDrafts[counterpartyRole]}
                  onDraftNameChange={(value) => setSignatureDrafts((current) => ({ ...current, [counterpartyRole]: value }))}
                  onAutoSign={() => void handleSignature(counterpartyRole, 'auto')}
                  onTypedSign={() => void handleSignature(counterpartyRole, 'typed')}
                  isFinalized={isAdminView ? false : contractFinalized}
                  isDisabled={!canAmtSign}
                  disabledMessage={isAdminView ? (record.signatures[counterpartyRole]?.signedAt ? 'Previously auto-signed. You may re-sign to override.' : undefined) : 'AMT DISTRO signature is applied automatically when you sign your side.'}
                  allowResign={isAdminView}
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-2xl print:rounded-none print:border-0 print:p-0 print:shadow-none">
              <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Printable Contract</div>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">AMT DISTRO Terms of Use</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Contract code {record.contractCode} between {record.clientName || 'the contracting party'} and AMT DISTRO.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                  <div>Generated {new Date(record.updatedAt).toLocaleString()}</div>
                  <div className="mt-1 font-medium text-slate-900">{contractLocked ? `Locked on ${new Date(record.lockedAt || record.updatedAt).toLocaleString()}` : (profile.role === 'label' ? 'Label workspace' : 'Artist workspace')}</div>
                </div>
              </div>

              <div className="mb-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Commercial Summary</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div><span className="font-medium text-slate-900">Territory:</span> {record.territory || 'Worldwide'}</div>
                    <div><span className="font-medium text-slate-900">Commission:</span> {record.commissionRate}%</div>
                    <div><span className="font-medium text-slate-900">Signed-in party:</span> {record.clientName || 'Not filled yet'}</div>
                    <div><span className="font-medium text-slate-900">Counterparty:</span> AMT DISTRO</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Signature Status</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div><span className="font-medium text-slate-900">{signerDisplayLabel}:</span> {record.signatures[signerRole]?.signedName ? `${record.signatures[signerRole]?.signedName} on ${new Date(record.signatures[signerRole]!.signedAt).toLocaleDateString()}` : 'Pending'}</div>
                    <div><span className="font-medium text-slate-900">AMT DISTRO:</span> {record.signatures[counterpartyRole]?.signedName ? `${record.signatures[counterpartyRole]?.signedName} on ${new Date(record.signatures[counterpartyRole]!.signedAt).toLocaleDateString()}` : 'Pending'}</div>
                  </div>
                </div>
              </div>

              <div className="mb-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Business Terms</div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{record.termSummary}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Additional Terms</div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{record.customTerms}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <pre className="contract-body-font whitespace-pre-wrap text-sm leading-7 text-slate-800">
                  {renderedContractText}
                </pre>
              </div>

              <div className="mt-8 grid gap-6 border-t border-slate-200 pt-8 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{signerDisplayLabel} Signature</div>
                  <div className="contract-signature-font min-h-16 border-b border-slate-300 pb-2 text-3xl text-slate-900">
                    {record.signatures[signerRole]?.signedName || ''}
                  </div>
                  <div className="text-sm text-slate-700">Name: {record.signatures[signerRole]?.signedName || record.clientName || 'Pending'}</div>
                  <div className="text-sm text-slate-700">Date: {record.signatures[signerRole]?.signedAt ? new Date(record.signatures[signerRole]!.signedAt).toLocaleString() : 'Pending'}</div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AMT DISTRO Signature</div>
                  <div className="contract-signature-font min-h-16 border-b border-slate-300 pb-2 text-3xl text-slate-900">
                    {record.signatures[counterpartyRole]?.signedName || ''}
                  </div>
                  <div className="text-sm text-slate-700">Name: {record.signatures[counterpartyRole]?.signedName || 'AMT DISTRO'}</div>
                  <div className="text-sm text-slate-700">Date: {record.signatures[counterpartyRole]?.signedAt ? new Date(record.signatures[counterpartyRole]!.signedAt).toLocaleString() : 'Pending'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}