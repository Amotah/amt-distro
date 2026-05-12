import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, Database, FileSearch, FileText, PenLine, Printer, RefreshCw, Save, ShieldCheck, UserCircle2, Clock, CheckCircle2 } from 'lucide-react';
import contractTemplateText from '../../contracts/contract-template.txt?raw';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '/utils/supabase/client';
import {
  buildRenderedContractText,
  getCounterpartyRole,
  getSuggestedSignatureName,
  isContractFullySigned,
  isContractLocked,
  loadContractWorkspaceForAdmin,
  saveContractWorkspaceForAdmin,
  type ContractStorageSource,
  type ContractSigningRole,
  type ContractWorkspaceRecord,
} from '../../utils/contract-workspace';

// Additional contract statuses
type AdminContractStatus = 'draft' | 'pending-counterparty' | 'signed' | 'rejected' | 'under-review';

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
}) {
  const signature = record.signatures[role];
  const suggestedName = getSuggestedSignatureName(role, record);

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
            disabled={isFinalized || isDisabled || Boolean(signature)}
          />
        </div>

        {disabledMessage ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {disabledMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAutoSign} className="bg-[#FF6B00] text-white hover:bg-[#e56200]" disabled={isFinalized || isDisabled || Boolean(signature)}>
            <PenLine className="mr-2 h-4 w-4" />
            Auto Sign
          </Button>
          <Button type="button" variant="outline" onClick={onTypedSign} className="border-white/10 text-white hover:bg-white/5" disabled={isFinalized || isDisabled || Boolean(signature)}>
            <UserCircle2 className="mr-2 h-4 w-4" />
            Sign with Typed Name
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface ContractListItem {
  id: string;
  ownerUserId: string;
  contractCode: string;
  artistName?: string;
  labelName?: string;
  email?: string;
  status: 'draft' | 'pending-counterparty' | 'signed';
  createdAt: string;
}

export function AdminContractsView() {
  const { adminUser } = useAdmin();
  const [record, setRecord] = useState<ContractWorkspaceRecord | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [signatureDrafts, setSignatureDrafts] = useState<SignatureDraftMap>({ artist: '', label: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [storageSource, setStorageSource] = useState<ContractStorageSource>('local');
  const [contractList, setContractList] = useState<ContractListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const renderedContractText = useMemo(() => {
    if (!record) return '';
    return buildRenderedContractText(contractTemplateText, record);
  }, [record]);

  // Admin actions: reject and review
  async function handleRejectContract() {
    if (!record || !ownerUserId) return;
    const updated = { ...record, status: 'rejected', lockedAt: new Date().toISOString() };
    setRecord(updated);
    await saveContractWorkspaceForAdmin(updated, ownerUserId);
    setStatusMessage('Contract rejected.');
    setErrorMessage('');
  }

  async function handleReviewContract() {
    if (!record || !ownerUserId) return;
    const updated = { ...record, status: 'under-review' };
    setRecord(updated);
    await saveContractWorkspaceForAdmin(updated, ownerUserId);
    setStatusMessage('Contract marked as under review.');
    setErrorMessage('');
  }

  const contractLocked = record ? isContractLocked(record) : false;
  const contractFinalized = record ? isContractFullySigned(record) : false;
  const canAmtSign = Boolean(ownerUserId && record && !contractFinalized);
  const signerRole = (record?.signerRole || 'artist') as ContractSigningRole;
  const counterpartyRole = getCounterpartyRole(signerRole);

  // Fetch all contracts on mount
  useEffect(() => {
    let active = true;

    async function loadContractsList() {
      try {
        setIsLoadingList(true);
        setErrorMessage('');

        // Fetch all contract workspaces from Supabase
        const { data, error } = await supabase
          .from('contract_workspaces')
          .select('owner_user_id, contract_code, status, created_at, payload')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (!active) return;

        const list: ContractListItem[] = (data || []).map((row: any) => {
          const payload = row.payload || {};
          return {
            id: row.contract_code || row.owner_user_id,
            ownerUserId: row.owner_user_id,
            contractCode: row.contract_code,
            artistName: payload.artistName,
            labelName: payload.labelName,
            email: payload.artistEmail || payload.labelEmail,
            status: row.status || 'draft',
            createdAt: row.created_at,
          };
        });

        setContractList(list);
        setStatusMessage(`Loaded ${list.length} contract(s).`);
      } catch (error) {
        if (active) {
          console.error('Failed to load contracts:', error);
          const msg = (error as any)?.message || (error as any)?.code || JSON.stringify(error);
          setErrorMessage(`Unable to load contracts from database: ${msg}`);
          setContractList([]);
        }
      } finally {
        if (active) {
          setIsLoadingList(false);
        }
      }
    }

    loadContractsList();

    return () => {
      active = false;
    };
  }, []);

  function hydrateLoadedRecord(nextRecord: ContractWorkspaceRecord, nextOwnerUserId: string | null, nextSource: ContractStorageSource, nextError?: string) {
    setRecord(nextRecord);
    setOwnerUserId(nextOwnerUserId);
    setStorageSource(nextSource);
    setSignatureDrafts({
      artist: nextRecord.signatures.artist?.typedName || '',
      label: nextRecord.signatures.label?.typedName || '',
    });
    setStatusMessage(nextError ? 'Loaded the local contract copy because Supabase sync is currently unavailable.' : '');
    setErrorMessage('');
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
    const current = nextRecord || record;
    if (!current || !ownerUserId) {
      return;
    }

    if (isContractLocked(current)) {
      await saveContractWorkspaceForAdmin(current, ownerUserId);
      setStatusMessage(contractFinalized ? 'Signed contracts are locked and cannot be edited.' : 'Contract fields are locked while the remaining signature is pending.');
      setErrorMessage('');
      return;
    }

    const payload = { ...current, updatedAt: new Date().toISOString() };
    const result = await saveContractWorkspaceForAdmin(payload, ownerUserId);

    setStorageSource(result.source);
    setStatusMessage(result.source === 'supabase'
      ? 'Contract draft saved to Supabase.'
      : 'Contract draft saved locally. Supabase sync is unavailable right now.');
    setErrorMessage(result.error || '');
  }

  async function handleSignature(mode: 'auto' | 'typed') {
    if (!record || !ownerUserId) {
      return;
    }

    if (isContractFullySigned(record)) {
      setErrorMessage('This contract has already been signed and is now locked.');
      setStatusMessage('');
      return;
    }

    if (record.signatures['label']?.signedAt) {
      setErrorMessage('AMT DISTRO has already signed this contract.');
      setStatusMessage('');
      return;
    }

    const draftName = signatureDrafts['label'];
    if (!draftName && mode === 'typed') {
      setErrorMessage('Enter the signer name before signing.');
      setStatusMessage('');
      return;
    }

    const nextRecord = { ...record };
    nextRecord.signatures['label'] = {
      signedName: mode === 'auto' ? getSuggestedSignatureName('label', record) : draftName,
      typedName: draftName || '',
      signedAt: new Date().toISOString(),
    };
    nextRecord.executedBy = adminUser?.userId || '';

    setRecord(nextRecord);
    await saveRecord(nextRecord);
    setStatusMessage('AMT DISTRO signature added successfully.');
    setErrorMessage('');
  }

  async function handleLoadContract(item: ContractListItem) {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const loaded = await loadContractWorkspaceForAdmin(item.ownerUserId);
      if (loaded.record) {
        hydrateLoadedRecord(loaded.record, loaded.ownerUserId || null, loaded.source, loaded.error);
        setStatusMessage(`Loaded contract for: ${item.artistName || item.labelName || item.email}`);
      } else {
        setErrorMessage(`Could not load contract for user: ${item.ownerUserId}`);
        setRecord(null);
        setOwnerUserId(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load contract.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.reload();
  }

  function handlePrint() {
    window.print();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'signed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Signed
          </Badge>
        );
      case 'pending-counterparty':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Awaiting AMT DISTRO
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-300 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'under-review':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 flex items-center gap-1 w-fit">
            <FileSearch className="h-3 w-3" />
            Under Review
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge className="bg-blue-500/20 text-blue-300 flex items-center gap-1 w-fit">
            <FileText className="h-3 w-3" />
            Draft
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-6 bg-[#0A0A0A] p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Contract Management</h1>
          <p className="text-[#B3B3B3]">Review and sign pending contracts</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200 flex items-start gap-2">
          <Database className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contracts List */}
        <Card className="lg:col-span-1 border-white/10 bg-[#111111] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Contracts</h2>

          {isLoadingList ? (
            <div className="text-sm text-[#B3B3B3] py-8 text-center">Loading contracts...</div>
          ) : contractList.length === 0 ? (
            <div className="text-sm text-[#B3B3B3] py-8 text-center">No contracts found</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {contractList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleLoadContract(item)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    ownerUserId === item.ownerUserId
                      ? 'border-[#FF6B00]/40 bg-[#FF6B00]/10'
                      : 'border-white/10 bg-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">
                        {item.artistName || item.labelName || 'Unnamed'}
                      </div>
                      <div className="text-xs text-[#B3B3B3] truncate">{item.email}</div>
                      <div className="text-[11px] text-[#8A8A8A] truncate">{item.contractCode}</div>
                      <div className="text-xs text-[#8A8A8A] mt-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Contract Detail */}
        <div className="lg:col-span-2 space-y-6">
          {record ? (
            <>
              {/* Storage Source Indicator */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                {storageSource === 'supabase' ? 'Stored in Supabase' : 'Stored locally (backend sync unavailable)'}
              </div>

              {/* Template Preview */}
              <Card className="border-white/10 bg-[#111111] p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#FF6B00]" />
                    <h2 className="text-xl font-semibold text-white">Contract Template</h2>
                  </div>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-[#0A0A0A] p-6 text-sm text-[#E5E7EB] leading-relaxed whitespace-pre-wrap font-mono">
                  {renderedContractText}
                </div>
              </Card>

              {/* Signer Details Form */}
              <Card className="border-white/10 bg-[#111111] p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">Signer Details</h2>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label className="text-[#E5E7EB]">Company Name</Label>
                    <Input
                      value={record.company}
                      onChange={(e) => patchRecord({ company: e.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white mt-1"
                      disabled={contractLocked}
                    />
                  </div>
                  <div>
                    <Label className="text-[#E5E7EB]">Government ID / NIF</Label>
                    <Input
                      value={record.governmentId}
                      onChange={(e) => patchRecord({ governmentId: e.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white mt-1"
                      disabled={contractLocked}
                    />
                  </div>
                  <div>
                    <Label className="text-[#E5E7EB]">Tax Number (TIN)</Label>
                    <Input
                      value={record.taxNumber}
                      onChange={(e) => patchRecord({ taxNumber: e.target.value })}
                      className="border-white/10 bg-[#0A0A0A] text-white mt-1"
                      disabled={contractLocked}
                    />
                  </div>
                </div>
              </Card>

              {/* AMT DISTRO Signature Panel */}
              <SignaturePanel
                role="label"
                title="AMT DISTRO Signature"
                description="Sign this contract on behalf of AMT DISTRO"
                record={record}
                draftName={signatureDrafts['label']}
                onDraftNameChange={(value) => setSignatureDrafts({ ...signatureDrafts, label: value })}
                onAutoSign={() => handleSignature('auto')}
                onTypedSign={() => handleSignature('typed')}
                isFinalized={contractFinalized}
                isDisabled={!canAmtSign}
                disabledMessage={!canAmtSign ? 'Unable to sign. Load a contract first.' : undefined}
              />

              {/* Admin Actions: Save, Print, Review, Reject */}
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <Button
                  onClick={() => saveRecord()}
                  className="bg-[#FF6B00] text-white hover:bg-[#e56200]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Contract
                </Button>
                <Button
                  onClick={handleReviewContract}
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10"
                  disabled={record.status === 'under-review' || record.status === 'signed' || record.status === 'rejected'}
                >
                  <FileSearch className="mr-2 h-4 w-4" />
                  Mark as Under Review
                </Button>
                <Button
                  onClick={handleRejectContract}
                  variant="outline"
                  className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                  disabled={record.status === 'rejected' || record.status === 'signed'}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Reject Contract
                </Button>
              </div>
            </>
          ) : (
            <Card className="border-white/10 bg-[#111111] p-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-[#B3B3B3]" />
              <h3 className="mb-2 text-lg font-semibold text-white">No Contract Selected</h3>
              <p className="text-[#B3B3B3]">Select a contract from the list to view and manage.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
