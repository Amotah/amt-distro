import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Archive,
  ArrowUpDown,
  ArrowUpRight,
  Clock3,
  Download,
  Megaphone,
  MoreHorizontal,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getCurrentUserProfile, getLabelArtists, removeLabelArtist, type UserProfile } from '../../utils/user-api';
import { getLabelArtistEarningsSummary, type LabelArtistEarningsSummary } from '../../utils/payment-api';
import {
  type ArtistDataRetentionOption,
  buildManagedArtist,
  formatCompactNumber,
  formatCurrency,
  getArtistInitials,
  type ArtistManagementOverride,
  type ArtistManagementOverrides,
  type ArtistStatus,
  type ManagedArtist,
  readArtistManagementOverrides,
  writeArtistManagementOverrides,
} from '../../utils/artist-management';
import { getArtistVerificationBadge, getArtistVerificationState } from '../../utils/artist-verification';

type SortKey = 'name' | 'labelStreams' | 'labelRevenue' | 'status';
type SortDirection = 'asc' | 'desc';

type ManagedArtistRow = ManagedArtist & {
  labelUploadedStreams: number;
  labelUploadedRevenue: number;
  hasLabelUploadedData: boolean;
};

function downloadCsv(filename: string, content: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function AllArtists() {
  const location = useLocation();
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [currentLabel, setCurrentLabel] = useState<UserProfile | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [overrides, setOverrides] = useState<ArtistManagementOverrides>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [editingArtist, setEditingArtist] = useState<ManagedArtist | null>(null);
  const [archiveTargets, setArchiveTargets] = useState<ManagedArtist[]>([]);
  const [removeTargets, setRemoveTargets] = useState<ManagedArtist[]>([]);
  const [removeReason, setRemoveReason] = useState('');
  const [retentionOption, setRetentionOption] = useState<ArtistDataRetentionOption>('retain-all');
  const [removalHistoryQuery, setRemovalHistoryQuery] = useState('');
  const [removalHistoryFilter, setRemovalHistoryFilter] = useState<'all' | ArtistDataRetentionOption>('all');
  const [removalHistoryStartDate, setRemovalHistoryStartDate] = useState('');
  const [removalHistoryEndDate, setRemovalHistoryEndDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isRemovingArtists, setIsRemovingArtists] = useState(false);
  const [editForm, setEditForm] = useState({
    genres: '',
    campaignName: '',
    status: 'active' as ArtistStatus,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setOverrides(readArtistManagementOverrides());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const [nextArtists, nextProfile, nextSummary] = await Promise.all([
          getLabelArtists(),
          getCurrentUserProfile(),
          getLabelArtistEarningsSummary().catch(() => null),
        ]);

        if (!cancelled) {
          setArtists(nextArtists);
          setCurrentLabel(nextProfile.role === 'partner' ? nextProfile : null);
          setEarningsSummary(nextSummary);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load artist list.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const routeState = location.state as { createdArtistName?: string; linkedArtistName?: string } | null;
    const createdArtistName = routeState?.createdArtistName;
    const linkedArtistName = routeState?.linkedArtistName;

    if (createdArtistName) {
      toast.success(`${createdArtistName} added to your artist list.`);
    }

    if (linkedArtistName) {
      toast.success(`${linkedArtistName} linked to your label list.`);
    }
  }, [location.state]);

  const managedArtists = useMemo(() => {
    const liveArtistMap = new Map<string, LabelArtistEarningsSummary['topArtists'][number]>();

    earningsSummary?.topArtists.forEach((artist) => {
      liveArtistMap.set(artist.userId, artist);
      liveArtistMap.set(artist.artistId, artist);
    });

    return artists.map((artist, index) => {
      const managedArtist = buildManagedArtist(artist, index, overrides);
      const liveArtist = liveArtistMap.get(managedArtist.profile.userId) || liveArtistMap.get(managedArtist.profile.id);

      return {
        ...managedArtist,
        labelUploadedStreams: liveArtist?.totalStreams ?? 0,
        labelUploadedRevenue: liveArtist?.totalRevenue ?? 0,
        hasLabelUploadedData: Boolean(liveArtist),
      } satisfies ManagedArtistRow;
    });
  }, [artists, earningsSummary, overrides]);

  const autocompleteMatches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [] as ManagedArtist[];
    }

    return managedArtists
      .filter((artist) => artist.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [managedArtists, searchQuery]);

  const visibleArtists = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredArtists = managedArtists.filter((artist) => {
      const matchesArchive = showArchived ? true : !artist.archived;
      const matchesQuery = normalizedQuery
        ? artist.name.toLowerCase().includes(normalizedQuery) || artist.email.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesArchive && matchesQuery;
    });

    return filteredArtists.slice().sort((left, right) => {
      let comparison = 0;

      if (sortKey === 'name') {
        comparison = left.name.localeCompare(right.name);
      } else if (sortKey === 'labelStreams') {
        comparison = left.labelUploadedStreams - right.labelUploadedStreams;
      } else if (sortKey === 'labelRevenue') {
        comparison = left.labelUploadedRevenue - right.labelUploadedRevenue;
      } else if (sortKey === 'status') {
        comparison = left.status.localeCompare(right.status);
      }

      return sortDirection === 'asc' ? comparison : comparison * -1;
    });
  }, [managedArtists, searchQuery, showArchived, sortDirection, sortKey]);

  const selectedArtists = useMemo(() => {
    return visibleArtists.filter((artist) => selectedArtistIds.includes(artist.id));
  }, [selectedArtistIds, visibleArtists]);

  const allVisibleSelected = visibleArtists.length > 0 && visibleArtists.every((artist) => selectedArtistIds.includes(artist.id));

  const removalHistory = useMemo(() => {
    return (currentLabel?.removedArtists || [])
      .slice()
      .sort((left, right) => new Date(right.removedAt).getTime() - new Date(left.removedAt).getTime());
  }, [currentLabel]);

  const visibleRemovalHistory = useMemo(() => {
    const normalizedQuery = removalHistoryQuery.trim().toLowerCase();
    const startTime = removalHistoryStartDate ? new Date(`${removalHistoryStartDate}T00:00:00`).getTime() : null;
    const endTime = removalHistoryEndDate ? new Date(`${removalHistoryEndDate}T23:59:59.999`).getTime() : null;

    return removalHistory.filter((record) => {
      const removedAt = new Date(record.removedAt).getTime();
      const matchesFilter = removalHistoryFilter === 'all' || record.retentionOption === removalHistoryFilter;
      const matchesQuery = !normalizedQuery
        || (record.artistName || '').toLowerCase().includes(normalizedQuery)
        || (record.artistEmail || '').toLowerCase().includes(normalizedQuery)
        || (record.reason || '').toLowerCase().includes(normalizedQuery);
      const matchesStartDate = startTime === null || removedAt >= startTime;
      const matchesEndDate = endTime === null || removedAt <= endTime;

      return matchesFilter && matchesQuery && matchesStartDate && matchesEndDate;
    });
  }, [removalHistory, removalHistoryEndDate, removalHistoryFilter, removalHistoryQuery, removalHistoryStartDate]);

  function formatRetentionLabel(value: ArtistDataRetentionOption) {
    if (value === 'retain-financials') {
      return 'Retain financials';
    }

    if (value === 'remove-roster-only') {
      return 'Roster link only';
    }

    return 'Retain all records';
  }

  function exportRemovalHistoryCsv() {
    if (visibleRemovalHistory.length === 0) {
      toast.error('No removal history records match the current filters.');
      return;
    }

    const rows = [
      ['Artist Name', 'Artist Email', 'Retention Option', 'Reason', 'Removed At'],
      ...visibleRemovalHistory.map((record) => [
        record.artistName || '',
        record.artistEmail || '',
        formatRetentionLabel(record.retentionOption),
        record.reason || '',
        record.removedAt,
      ]),
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCsv('artist-removal-history.csv', csv);
    toast.success(`Exported ${visibleRemovalHistory.length} removal record${visibleRemovalHistory.length === 1 ? '' : 's'}.`);
  }

  function resetRemovalHistoryFilters() {
    setRemovalHistoryQuery('');
    setRemovalHistoryFilter('all');
    setRemovalHistoryStartDate('');
    setRemovalHistoryEndDate('');
  }

  function persistOverrides(nextOverrides: ArtistManagementOverrides) {
    setOverrides(nextOverrides);
    writeArtistManagementOverrides(nextOverrides);
  }

  function patchArtistOverride(artist: ManagedArtist, partial: Partial<ArtistManagementOverride>) {
    const current = overrides[artist.id];
    persistOverrides({
      ...overrides,
      [artist.id]: {
        ...current,
        status: current?.status ?? artist.status,
        archived: current?.archived ?? artist.archived,
        campaignName: current?.campaignName ?? artist.campaignName,
        genres: current?.genres ?? artist.genres,
        internalNotes: current?.internalNotes,
        contract: current?.contract,
        taxDocuments: current?.taxDocuments,
        removal: current?.removal,
        ...partial,
      },
    });
  }

  function openEditDialog(artist: ManagedArtist) {
    setEditingArtist(artist);
    setEditForm({
      genres: artist.genres.join(', '),
      campaignName: artist.campaignName || '',
      status: artist.status,
    });
  }

  function toggleArtistSelection(artistId: string, checked: boolean) {
    setSelectedArtistIds((current) => checked ? [...current, artistId] : current.filter((id) => id !== artistId));
  }

  function handleSelectAll(checked: boolean) {
    setSelectedArtistIds(checked ? visibleArtists.map((artist) => artist.id) : []);
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'name' || nextKey === 'status' ? 'asc' : 'desc');
  }

  function getSortLabel(key: SortKey) {
    if (sortKey !== key) {
      return 'Sort column';
    }

    return sortDirection === 'asc' ? 'Sorted ascending' : 'Sorted descending';
  }

  function handleExportCsv() {
    if (selectedArtists.length === 0) {
      toast.error('Select at least one artist to export.');
      return;
    }

    const rows = [
      ['Artist Name', 'Email', 'Genres', 'Label Uploaded Streams', 'Label Uploaded Revenue', 'Status'],
      ...selectedArtists.map((artist) => [
        artist.name,
        artist.email,
        artist.genres.join(' / '),
        artist.hasLabelUploadedData ? artist.labelUploadedStreams.toString() : '',
        artist.hasLabelUploadedData ? artist.labelUploadedRevenue.toString() : '',
        artist.status,
      ]),
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadCsv('artist-roster.csv', csv);
    toast.success(`Exported ${selectedArtists.length} artist${selectedArtists.length === 1 ? '' : 's'} to CSV.`);
  }

  function handleArchiveSelected() {
    if (selectedArtists.length === 0) {
      toast.error('Select artists before archiving.');
      return;
    }

    setArchiveTargets(selectedArtists);
    setArchiveDialogOpen(true);
  }

  function openSingleArchiveDialog(artist: ManagedArtist) {
    setArchiveTargets([artist]);
    setArchiveDialogOpen(true);
  }

  function confirmArchiveArtists() {
    if (archiveTargets.length === 0) {
      return;
    }

    const nextOverrides = { ...overrides };
    const allArchived = archiveTargets.every((artist) => artist.archived);

    for (const artist of archiveTargets) {
      const current = nextOverrides[artist.id];
      nextOverrides[artist.id] = {
        ...current,
        status: allArchived ? 'active' : 'inactive',
        archived: !allArchived,
        campaignName: current?.campaignName ?? artist.campaignName,
        genres: current?.genres ?? artist.genres,
        internalNotes: current?.internalNotes,
        contract: current?.contract,
        taxDocuments: current?.taxDocuments,
        removal: current?.removal,
      };
    }

    persistOverrides(nextOverrides);
    setArchiveDialogOpen(false);
    setArchiveTargets([]);
    setSelectedArtistIds([]);
    toast.success(
      allArchived
        ? `Restored ${archiveTargets.length} artist${archiveTargets.length === 1 ? '' : 's'} to the active roster.`
        : `Archived ${archiveTargets.length} artist${archiveTargets.length === 1 ? '' : 's'}.`,
    );
  }

  function handleAssignCampaign() {
    if (selectedArtists.length === 0) {
      toast.error('Select artists before adding them to a campaign.');
      return;
    }

    setCampaignDialogOpen(true);
  }

  function confirmAssignCampaign() {
    const nextCampaignName = campaignName.trim();
    if (!nextCampaignName) {
      toast.error('Enter a campaign name.');
      return;
    }

    const nextOverrides = { ...overrides };
    for (const artist of selectedArtists) {
      nextOverrides[artist.id] = {
        ...nextOverrides[artist.id],
        status: nextOverrides[artist.id]?.status ?? artist.status,
        archived: nextOverrides[artist.id]?.archived ?? false,
        campaignName: nextCampaignName,
        genres: nextOverrides[artist.id]?.genres ?? artist.genres,
        internalNotes: nextOverrides[artist.id]?.internalNotes,
        contract: nextOverrides[artist.id]?.contract,
        taxDocuments: nextOverrides[artist.id]?.taxDocuments,
        removal: nextOverrides[artist.id]?.removal,
      };
    }

    persistOverrides(nextOverrides);
    setCampaignDialogOpen(false);
    setCampaignName('');
    toast.success(`Added ${selectedArtists.length} artist${selectedArtists.length === 1 ? '' : 's'} to ${nextCampaignName}.`);
  }

  function toggleArtistStatus(artist: ManagedArtist) {
    const nextStatus: ArtistStatus = artist.status === 'active' ? 'inactive' : 'active';
    patchArtistOverride(artist, { status: nextStatus, archived: nextStatus === 'inactive' ? artist.archived : false });
    toast.success(`${artist.name} marked ${nextStatus}.`);
  }

  function toggleArtistArchive(artist: ManagedArtist) {
    openSingleArchiveDialog(artist);
  }

  function openRemoveDialog(targets: ManagedArtist[]) {
    if (targets.length === 0) {
      return;
    }

    setRemoveTargets(targets);
    setRetentionOption('retain-all');
    setRemoveReason('');
    setRemoveDialogOpen(true);
  }

  async function confirmRemoveArtists() {
    if (removeTargets.length === 0) {
      return;
    }

    try {
      setIsRemovingArtists(true);

      for (const artist of removeTargets) {
        await removeLabelArtist(artist.id, retentionOption, removeReason.trim() || undefined);
      }

      const nextOverrides = { ...overrides };
      for (const artist of removeTargets) {
        const current = nextOverrides[artist.id];
        nextOverrides[artist.id] = {
          ...current,
          status: current?.status ?? artist.status,
          archived: current?.archived ?? artist.archived,
          campaignName: current?.campaignName ?? artist.campaignName,
          genres: current?.genres ?? artist.genres,
          internalNotes: current?.internalNotes,
          contract: current?.contract,
          taxDocuments: current?.taxDocuments,
          removal: {
            retentionOption,
            reason: removeReason.trim() || undefined,
            removedAt: new Date().toISOString(),
          },
        };
      }

      persistOverrides(nextOverrides);
      setArtists((current) => current.filter((artist) => !removeTargets.some((target) => target.id === artist.id)));
      setCurrentLabel((current) => {
        if (!current || current.role !== 'partner') {
          return current;
        }

        const newRecords = removeTargets.map((artist) => ({
          artistId: artist.id,
          artistName: artist.name,
          artistEmail: artist.email,
          retentionOption,
          reason: removeReason.trim() || undefined,
          removedAt: new Date().toISOString(),
        }));

        return {
          ...current,
          removedArtists: [
            ...newRecords,
            ...(current.removedArtists || []).filter((record) => !removeTargets.some((target) => target.id === record.artistId)),
          ],
        };
      });
      setSelectedArtistIds((current) => current.filter((id) => !removeTargets.some((target) => target.id === id)));
      setRemoveDialogOpen(false);
      toast.success(`Removed ${removeTargets.length} artist${removeTargets.length === 1 ? '' : 's'} from the roster.`);
      setRemoveTargets([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove artist from roster.');
    } finally {
      setIsRemovingArtists(false);
    }
  }

  function saveArtistEdits() {
    if (!editingArtist) {
      return;
    }

    const genres = editForm.genres
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (genres.length === 0) {
      toast.error('Enter at least one genre.');
      return;
    }

    patchArtistOverride(editingArtist, {
      status: editForm.status,
      campaignName: editForm.campaignName.trim() || undefined,
      genres,
      archived: editForm.status === 'inactive' ? editingArtist.archived : false,
    });

    toast.success(`${editingArtist.name} updated.`);
    setEditingArtist(null);
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#FFD9BF]">
            <Users className="h-3.5 w-3.5 text-[#FFD600]" />
            Artist management
          </div>
          <h1 className="text-3xl font-semibold text-white">Artist List</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#B3B3B3]">
            Manage your label list with searchable artist records, label-uploaded performance only, and bulk campaign or archive actions.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="inline-flex items-center gap-2 rounded-lg border border-[#FF6B00]/20 bg-[#161616] px-3 py-2 text-sm text-[#B3B3B3]">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(Boolean(checked))}
              className="border-[#FF6B00]/30 data-[state=checked]:border-[#FF6B00] data-[state=checked]:bg-[#FF6B00]"
            />
            Show archived artists
          </label>
          <Button asChild className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
            <Link to="/label-dashboard/artists/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Artist
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B3B3B3]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Search artists by name or email"
              className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-9 text-white placeholder:text-[#666]"
            />

            {isSearchFocused && autocompleteMatches.length > 0 ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#FF6B00]/20 bg-[#101010] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                {autocompleteMatches.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    className="flex w-full items-center gap-3 border-b border-[#FF6B00]/10 px-3 py-3 text-left transition hover:bg-[#161616] last:border-b-0"
                    onClick={() => {
                      setSearchQuery(artist.name);
                      setIsSearchFocused(false);
                    }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#0A0A0A] text-sm font-semibold text-white">
                      {artist.avatar ? (
                        <ImageWithFallback src={artist.avatar} alt={`${artist.name} avatar`} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getArtistInitials(artist.name) || 'AR'}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{artist.name}</div>
                      <div className="text-xs text-[#B3B3B3]">{artist.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Total</div>
              <div className="mt-1 text-xl font-semibold text-white">{managedArtists.length}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Visible</div>
              <div className="mt-1 text-xl font-semibold text-white">{visibleArtists.length}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Active</div>
              <div className="mt-1 text-xl font-semibold text-white">{managedArtists.filter((artist) => artist.status === 'active' && !artist.archived).length}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Archived</div>
              <div className="mt-1 text-xl font-semibold text-white">{managedArtists.filter((artist) => artist.archived).length}</div>
            </div>
          </div>
        </div>
      </Card>

      {selectedArtistIds.length > 0 ? (
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-white">{selectedArtistIds.length} artist{selectedArtistIds.length === 1 ? '' : 's'} selected</div>
              <div className="text-sm text-[#B3B3B3]">Bulk actions apply to the current selection in the roster table.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export List (CSV)
              </Button>
              <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={handleAssignCampaign}>
                <Megaphone className="mr-2 h-4 w-4" />
                Add to Campaign
              </Button>
              <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={handleArchiveSelected}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
              <Button type="button" variant="outline" className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10" onClick={() => openRemoveDialog(selectedArtists)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-0 text-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
              <TableHead className="w-12 px-4">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all artists"
                  className="border-[#FF6B00]/30 data-[state=checked]:border-[#FF6B00] data-[state=checked]:bg-[#FF6B00]"
                />
              </TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">
                <button type="button" className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => handleSort('name')}>
                  Artist Name
                  <ArrowUpDown className="h-3.5 w-3.5" aria-label={getSortLabel('name')} />
                </button>
              </TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">Avatar</TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">Genres</TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">
                <button type="button" className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => handleSort('labelStreams')}>
                  Label Streams
                  <ArrowUpDown className="h-3.5 w-3.5" aria-label={getSortLabel('labelStreams')} />
                </button>
              </TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">
                <button type="button" className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => handleSort('labelRevenue')}>
                  Label Revenue
                  <ArrowUpDown className="h-3.5 w-3.5" aria-label={getSortLabel('labelRevenue')} />
                </button>
              </TableHead>
              <TableHead className="px-4 text-[#B3B3B3]">
                <button type="button" className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => handleSort('status')}>
                  Status
                  <ArrowUpDown className="h-3.5 w-3.5" aria-label={getSortLabel('status')} />
                </button>
              </TableHead>
              <TableHead className="px-4 text-right text-[#B3B3B3]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                <TableCell colSpan={8} className="px-4 py-10 text-center text-[#B3B3B3]">Loading artist list...</TableCell>
              </TableRow>
            ) : errorMessage ? (
              <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                <TableCell colSpan={8} className="px-4 py-10 text-center text-red-200">{errorMessage}</TableCell>
              </TableRow>
            ) : visibleArtists.length === 0 ? (
              <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                <TableCell colSpan={8} className="px-4 py-10 text-center text-[#B3B3B3]">
                  No artists match the current search. Try a different name or <Link to="/label-dashboard/artists/new" className="text-[#FF6B00] underline-offset-4 hover:underline">add a new artist</Link>.
                </TableCell>
              </TableRow>
            ) : (
              visibleArtists.map((artist) => (
                <TableRow key={artist.id} className="border-[#FF6B00]/10 data-[state=selected]:bg-[#FF6B00]/5 hover:bg-[#0A0A0A]" data-state={selectedArtistIds.includes(artist.id) ? 'selected' : undefined}>
                  <TableCell className="px-4">
                    <Checkbox
                      checked={selectedArtistIds.includes(artist.id)}
                      onCheckedChange={(checked) => toggleArtistSelection(artist.id, Boolean(checked))}
                      aria-label={`Select ${artist.name}`}
                      className="border-[#FF6B00]/30 data-[state=checked]:border-[#FF6B00] data-[state=checked]:bg-[#FF6B00]"
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <div>
                      <div className="font-medium text-white">{artist.name}</div>
                      <div className="text-xs text-[#B3B3B3]">{artist.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#0A0A0A] text-sm font-semibold text-white">
                      {artist.avatar ? (
                        <ImageWithFallback src={artist.avatar} alt={`${artist.name} avatar`} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getArtistInitials(artist.name) || 'AR'}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex max-w-[240px] flex-wrap gap-2 whitespace-normal">
                      {artist.genres.map((genre) => (
                        <Badge key={genre} variant="secondary" className="border border-[#FF6B00]/15 bg-[#FF6B00]/10 text-[#FFD9BF]">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 font-medium text-white">{artist.hasLabelUploadedData ? formatCompactNumber(artist.labelUploadedStreams) : 'No data'}</TableCell>
                  <TableCell className="px-4 font-medium text-white">{artist.hasLabelUploadedData ? formatCurrency(artist.labelUploadedRevenue) : 'No data'}</TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col gap-2">
                      <Badge className={artist.status === 'active' ? 'w-fit border border-[#1DB954]/20 bg-[#1DB954]/10 text-[#B8FFD0]' : 'w-fit border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]'}>
                        {artist.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className={`w-fit ${getArtistVerificationBadge(getArtistVerificationState(artist.profile).status).className}`}>
                        {getArtistVerificationBadge(getArtistVerificationState(artist.profile).status).label}
                      </Badge>
                      {artist.archived ? <span className="text-xs text-[#888]">Archived</span> : null}
                      {artist.campaignName ? <span className="text-xs text-[#888]">Campaign: {artist.campaignName}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
                        <Link to={`/label-dashboard/artists/${artist.id}`}>
                          <ArrowUpRight className="mr-1 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => openEditDialog(artist)}>
                        <MoreHorizontal className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => toggleArtistStatus(artist)}>
                        {artist.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => toggleArtistArchive(artist)}>
                        <Archive className="mr-1 h-4 w-4" />
                        {artist.archived ? 'Restore' : 'Archive'}
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10" onClick={() => openRemoveDialog([artist])}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-5 text-white">
        <div className="mb-4 flex items-center gap-2 text-[#FFD9BF]">
          <Clock3 className="h-4 w-4 text-[#FF6B00]" />
          Removal History
        </div>
        {removalHistory.length === 0 ? (
          <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 text-sm text-[#B3B3B3]">
            No artists have been removed from this label roster yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr] lg:flex-1">
                <Input
                  value={removalHistoryQuery}
                  onChange={(event) => setRemovalHistoryQuery(event.target.value)}
                  placeholder="Search removed artists or reasons"
                  className="border-[#FF6B00]/20 bg-[#111111] text-white placeholder:text-[#666]"
                />
                <select
                  aria-label="Removal retention filter"
                  title="Removal retention filter"
                  value={removalHistoryFilter}
                  onChange={(event) => setRemovalHistoryFilter(event.target.value as 'all' | ArtistDataRetentionOption)}
                  className="w-full rounded-md border border-[#FF6B00]/20 bg-[#111111] px-3 py-2 text-white outline-none"
                >
                  <option value="all">All retention options</option>
                  <option value="retain-all">Retain all records</option>
                  <option value="retain-financials">Retain financials</option>
                  <option value="remove-roster-only">Roster link only</option>
                </select>
                <Input
                  type="date"
                  value={removalHistoryStartDate}
                  onChange={(event) => setRemovalHistoryStartDate(event.target.value)}
                  aria-label="Removal history start date"
                  className="border-[#FF6B00]/20 bg-[#111111] text-white"
                />
                <Input
                  type="date"
                  value={removalHistoryEndDate}
                  onChange={(event) => setRemovalHistoryEndDate(event.target.value)}
                  aria-label="Removal history end date"
                  className="border-[#FF6B00]/20 bg-[#111111] text-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm text-[#B3B3B3]">{visibleRemovalHistory.length} record{visibleRemovalHistory.length === 1 ? '' : 's'}</div>
                <Button type="button" variant="outline" className="border-white/10 bg-transparent text-[#B3B3B3] hover:bg-[#0A0A0A]" onClick={resetRemovalHistoryFilters}>
                  Reset
                </Button>
                <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={exportRemovalHistoryCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
            {visibleRemovalHistory.length === 0 ? (
              <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 text-sm text-[#B3B3B3]">
                No removal history records match the current filters.
              </div>
            ) : visibleRemovalHistory.slice(0, 12).map((record) => (
              <div key={`${record.artistId}-${record.removedAt}`} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{record.artistName || 'Removed artist'}</div>
                    <div className="mt-1 text-xs text-[#B3B3B3]">{record.artistEmail || record.artistId}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border border-red-500/20 bg-red-500/10 text-red-200">
                      Removed {new Date(record.removedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Badge>
                    <Badge className="border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]">
                      {formatRetentionLabel(record.retentionOption)}
                    </Badge>
                  </div>
                </div>
                {record.reason ? (
                  <p className="mt-3 text-sm text-[#B3B3B3]">Reason: {record.reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="border-[#FF6B00]/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Add Artists to Campaign</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Assign the selected artists to a campaign label so your team can track outreach and promotion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm text-[#B3B3B3]" htmlFor="campaignName">Campaign name</label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder="Summer rollout"
              className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
            />
            <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3 text-sm text-[#B3B3B3]">
              {selectedArtists.map((artist) => artist.name).join(', ')}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => setCampaignDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={confirmAssignCampaign}>
              Save Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="border-[#FF6B00]/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>{archiveTargets.every((artist) => artist.archived) ? 'Restore Artists' : 'Archive Artists'}</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              {archiveTargets.every((artist) => artist.archived)
                ? 'Restore the selected artists to the active roster while keeping their contract details, notes, and verification state.'
                : 'Archive the selected artists to hide them from the active roster while retaining their contract details, notes, and verification state.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3 text-sm text-[#B3B3B3]">
            {archiveTargets.map((artist) => artist.name).join(', ')}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={() => setArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={confirmArchiveArtists}>
              {archiveTargets.every((artist) => artist.archived) ? 'Restore Artists' : 'Confirm Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="border-red-500/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Remove Artist From List</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Choose how label-side data should be handled when the selected artist list link is removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/15 bg-[#0A0A0A]/60 p-3 text-sm text-[#B3B3B3]">
              {removeTargets.map((artist) => artist.name).join(', ')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="retentionOption" className="text-[#B3B3B3]">Data Retention</Label>
              <select id="retentionOption" aria-label="Data Retention" title="Data Retention" value={retentionOption} onChange={(event) => setRetentionOption(event.target.value as ArtistDataRetentionOption)} className="w-full rounded-md border border-red-500/20 bg-[#0A0A0A] px-3 py-2 text-white outline-none">
                <option value="retain-all">Retain all label records</option>
                <option value="retain-financials">Retain only financial and contract records</option>
                <option value="remove-roster-only">Remove roster link only</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="removeReason" className="text-[#B3B3B3]">Removal Reason</Label>
              <Input
                id="removeReason"
                value={removeReason}
                onChange={(event) => setRemoveReason(event.target.value)}
                placeholder="Internal reason for removal"
                className="border-red-500/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="border-red-500/20 bg-transparent text-red-300 hover:bg-red-500/10" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isRemovingArtists} className="bg-red-600 text-white hover:bg-red-700" onClick={confirmRemoveArtists}>
              {isRemovingArtists ? 'Removing...' : `Remove ${removeTargets.length === 1 ? 'Artist' : 'Artists'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingArtist)} onOpenChange={(open) => !open && setEditingArtist(null)}>
        <DialogContent className="border-[#FF6B00]/20 bg-[#161616] text-white">
          <DialogHeader>
            <DialogTitle>Edit Artist Management</DialogTitle>
            <DialogDescription className="text-[#B3B3B3]">
              Update the local roster metadata used by this management view for {editingArtist?.name || 'the selected artist'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artistGenres" className="text-[#B3B3B3]">Genres</Label>
              <Input
                id="artistGenres"
                value={editForm.genres}
                onChange={(event) => setEditForm((current) => ({ ...current, genres: event.target.value }))}
                placeholder="Afrobeats, Amapiano, Pop"
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artistCampaign" className="text-[#B3B3B3]">Campaign</Label>
              <Input
                id="artistCampaign"
                value={editForm.campaignName}
                onChange={(event) => setEditForm((current) => ({ ...current, campaignName: event.target.value }))}
                placeholder="Summer rollout"
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={editForm.status === 'active' ? 'border-[#1DB954]/30 bg-[#1DB954]/10 text-[#B8FFD0] hover:bg-[#1DB954]/15' : 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]'}
                  onClick={() => setEditForm((current) => ({ ...current, status: 'active' }))}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={editForm.status === 'inactive' ? 'border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FFD9BF] hover:bg-[#FF6B00]/15' : 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]'}
                  onClick={() => setEditForm((current) => ({ ...current, status: 'inactive' }))}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={saveArtistEdits}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}