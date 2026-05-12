import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  CheckSquare,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Pencil,
  Receipt,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { getAnalyticsSummary, type AnalyticsSummary } from '../../utils/analytics-api';
import {
  buildManagedArtist,
  formatCompactNumber,
  formatCurrency,
  readArtistManagementOverrides,
  type ArtistManagementOverrides,
} from '../../utils/artist-management';
import { getArtistVerificationState } from '../../utils/artist-verification';
import { getBillingPaymentDate, isPayoutHistoryRecord } from '../../utils/billing-downloads';
import {
  getBillingHistory,
  getLabelArtistEarningsSummary,
  getRoyaltyBalance,
  getRoyaltyEarningsSummary,
  type BillingHistoryRecord,
  type LabelArtistEarningsSummary,
  type RoyaltyBalance,
  type RoyaltyEarningsSummary,
} from '../../utils/payment-api';
import {
  downloadReportPdf,
  downloadReportWorkbook,
  type ReportPdfChart,
  type ReportPdfSection,
  type ReportWorkbookSheet,
} from '../../utils/reporting-downloads';
import { getCurrentUserProfile, getLabelArtists, type UserProfile } from '../../utils/user-api';

const CHART_COLORS = ['#FF6B00', '#FFD600', '#1DB954', '#3B82F6', '#FA243C', '#8B5CF6'];

type ReportType = 'revenue' | 'performance' | 'tax' | 'roster' | 'streaming' | 'compliance' | 'custom';
type RangePreset = '30d' | '90d' | 'year' | 'all' | 'custom';
type MetricKey = 'revenue' | 'streams' | 'listeners' | 'geography' | 'payouts' | 'contracts' | 'verification';

type PersistedPayoutRecord = {
  id: string;
  payoutDate: string;
  artistId: string;
  artistName: string;
  grossRevenue: number;
  commission: number;
  netPayout: number;
  status: 'pending' | 'completed' | 'on-hold';
};

type PersistedRevenueOpsState = {
  artistCommission?: Record<string, number>;
  payoutRecords?: PersistedPayoutRecord[];
  holdSettings?: Record<string, { onHold: boolean; reason?: string; holdDate?: string }>;
  taxInfoByArtist?: Record<string, Array<{ formType: string; fileName: string; uploadedAt: string }>>;
};

type ArtistReportRow = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  revenue: number;
  streams: number;
  contractStatus: string;
  contractType: string;
  verificationStatus: string;
  commissionRate: number;
  payoutCompleted: number;
  payoutPending: number;
  withholdingAmount: number;
  paymentRecordCount: number;
};

type SavedReportTemplate = {
  id: string;
  name: string;
  reportType: ReportType;
  rangePreset: RangePreset;
  startDate: string;
  endDate: string;
  selectedMetrics: MetricKey[];
  selectedArtistIds: string[];
};

const reportOptions: Array<{ id: ReportType; label: string; description: string; icon: typeof Receipt }> = [
  { id: 'revenue', label: 'Revenue Report', description: 'Total revenue by artist, platform, and period.', icon: Receipt },
  { id: 'performance', label: 'Artist Performance', description: 'Charts, rankings, and artist-level performance.', icon: BarChart3 },
  { id: 'tax', label: 'Tax Report', description: 'Revenue, commission, withholding, and payout totals.', icon: FileText },
  { id: 'roster', label: 'Artist Roster', description: 'Contacts, contract status, and current revenue.', icon: Users },
  { id: 'streaming', label: 'Streaming Analytics', description: 'Streams, listeners, geography, and platform mix.', icon: Globe2 },
  { id: 'compliance', label: 'Compliance Report', description: 'Verification, contracts, and payment records.', icon: ShieldCheck },
  { id: 'custom', label: 'Custom Builder', description: 'Choose metrics, artists, dates, and export format.', icon: CheckSquare },
];

const metricOptions: Array<{ id: MetricKey; label: string }> = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'streams', label: 'Streams' },
  { id: 'listeners', label: 'Listeners' },
  { id: 'geography', label: 'Geography' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'verification', label: 'Verification' },
];

function formatMonthLabel(value: string) {
  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: RangePreset, startDate: string, endDate: string) {
  const now = new Date();

  if (preset === 'all') {
    return { start: null as Date | null, end: null as Date | null };
  }

  if (preset === 'custom') {
    return {
      start: startDate ? new Date(`${startDate}T00:00:00`) : null,
      end: endDate ? new Date(`${endDate}T23:59:59`) : null,
    };
  }

  const start = new Date(now);
  if (preset === '30d') {
    start.setDate(start.getDate() - 30);
  } else if (preset === '90d') {
    start.setDate(start.getDate() - 90);
  } else {
    start.setMonth(start.getMonth() - 12);
  }

  return { start, end: now };
}

function isWithinRange(dateValue: string, start: Date | null, end: Date | null) {
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) {
    return true;
  }

  if (start && value < start) {
    return false;
  }

  if (end && value > end) {
    return false;
  }

  return true;
}

function readRevenueOpsState(labelProfileId: string) {
  if (!labelProfileId || typeof window === 'undefined') {
    return {} as PersistedRevenueOpsState;
  }

  try {
    const rawValue = window.localStorage.getItem(`amtdistro-label-revenue-ops:${labelProfileId}`);
    if (!rawValue) {
      return {} as PersistedRevenueOpsState;
    }

    const parsed = JSON.parse(rawValue) as PersistedRevenueOpsState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {} as PersistedRevenueOpsState;
  }
}

function getStatusBadgeClass(status: string) {
  if (status === 'verified' || status === 'active' || status === 'completed') {
    return 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20';
  }

  if (status === 'pending' || status === 'renewal-due') {
    return 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20';
  }

  return 'bg-red-500/10 text-red-200 border-red-500/20';
}

function buildSummarySheet(title: string, entries: Array<[string, string]>) {
  return {
    name: 'Summary',
    rows: [[title], [], ['Metric', 'Value'], ...entries.map(([label, value]) => [label, value])],
  } satisfies ReportWorkbookSheet;
}

function getTemplatesStorageKey(profileId: string, role: 'artist' | 'label') {
  return `amtdistro-report-templates:${role}:${profileId}`;
}

function readSavedTemplates(profileId: string, role: 'artist' | 'label') {
  if (!profileId || typeof window === 'undefined') {
    return [] as SavedReportTemplate[];
  }

  try {
    const rawValue = window.localStorage.getItem(getTemplatesStorageKey(profileId, role));
    if (!rawValue) {
      return [] as SavedReportTemplate[];
    }

    const parsed = JSON.parse(rawValue) as SavedReportTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as SavedReportTemplate[];
  }
}

function writeSavedTemplates(profileId: string, role: 'artist' | 'label', templates: SavedReportTemplate[]) {
  if (!profileId || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getTemplatesStorageKey(profileId, role), JSON.stringify(templates));
}

export function ReportingDashboard() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const [activeReport, setActiveReport] = useState<ReportType>('revenue');
  const [rangePreset, setRangePreset] = useState<RangePreset>('90d');
  const [startDate, setStartDate] = useState(formatDateInputValue(new Date(new Date().setDate(new Date().getDate() - 90))));
  const [endDate, setEndDate] = useState(formatDateInputValue(new Date()));
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['revenue', 'streams', 'listeners', 'payouts']);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [overrides, setOverrides] = useState<ArtistManagementOverrides>({});
  const [labelSummary, setLabelSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [royaltyBalance, setRoyaltyBalance] = useState<RoyaltyBalance | null>(null);
  const [royaltySummary, setRoyaltySummary] = useState<RoyaltyEarningsSummary | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRecord[]>([]);
  const [revenueOpsState, setRevenueOpsState] = useState<PersistedRevenueOpsState>({});
  const [savedTemplates, setSavedTemplates] = useState<SavedReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const analyticsRange = rangePreset === 'custom' ? 'all' : rangePreset;

  useEffect(() => {
    setOverrides(readArtistManagementOverrides());

    const handleStorage = () => {
      setOverrides(readArtistManagementOverrides());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadReportsData() {
      setIsLoading(true);
      setErrorMessage('');

      const profileResult = getCurrentUserProfile();
      const billingResult = getBillingHistory();
      const analyticsResult = getAnalyticsSummary(analyticsRange);

      const results = await Promise.allSettled([
        profileResult,
        billingResult,
        analyticsResult,
        isLabelDashboard ? getLabelArtists() : Promise.resolve([]),
        isLabelDashboard ? getLabelArtistEarningsSummary() : Promise.resolve(null),
        isLabelDashboard ? Promise.resolve(null) : getRoyaltyBalance(),
        isLabelDashboard ? Promise.resolve(null) : getRoyaltyEarningsSummary(),
      ]);

      if (!active) {
        return;
      }

      const [profileState, billingState, analyticsState, artistsState, labelState, balanceState, royaltyState] = results;

      if (profileState.status === 'fulfilled') {
        setProfile(profileState.value);
        setSavedTemplates(readSavedTemplates(profileState.value.id || profileState.value.userId || '', profileState.value.role === 'label' ? 'label' : 'artist'));
        if (isLabelDashboard) {
          setRevenueOpsState(readRevenueOpsState(profileState.value.id || profileState.value.userId || ''));
        }
      }

      if (billingState.status === 'fulfilled') {
        setBillingHistory(billingState.value);
      }

      if (analyticsState.status === 'fulfilled') {
        setAnalyticsSummary(analyticsState.value);
      }

      if (artistsState.status === 'fulfilled') {
        setArtists(artistsState.value);
      }

      if (labelState.status === 'fulfilled') {
        setLabelSummary(labelState.value);
      }

      if (balanceState.status === 'fulfilled') {
        setRoyaltyBalance(balanceState.value);
      }

      if (royaltyState.status === 'fulfilled') {
        setRoyaltySummary(royaltyState.value);
      }

      if (results.every((result) => result.status === 'rejected')) {
        setErrorMessage('Unable to load reporting data right now.');
      }

      setIsLoading(false);
    }

    loadReportsData().catch((error) => {
      if (!active) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load reporting data.');
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [analyticsRange, isLabelDashboard]);

  useEffect(() => {
    if (!isLabelDashboard || artists.length === 0 || selectedArtistIds.length > 0) {
      return;
    }

    setSelectedArtistIds(artists.map((artist) => artist.id));
  }, [artists, isLabelDashboard, selectedArtistIds.length]);

  const range = useMemo(() => getPresetRange(rangePreset, startDate, endDate), [endDate, rangePreset, startDate]);

  const artistRows = useMemo<ArtistReportRow[]>(() => {
    if (isLabelDashboard) {
      const liveArtistMap = new Map<string, LabelArtistEarningsSummary['topArtists'][number]>();
      labelSummary?.topArtists.forEach((artist) => {
        liveArtistMap.set(artist.userId, artist);
        liveArtistMap.set(artist.artistId, artist);
      });

      const completedByArtist = new Map<string, number>();
      const pendingByArtist = new Map<string, number>();

      (revenueOpsState.payoutRecords || []).forEach((record) => {
        if (record.status === 'completed') {
          completedByArtist.set(record.artistId, (completedByArtist.get(record.artistId) || 0) + record.netPayout);
        } else {
          pendingByArtist.set(record.artistId, (pendingByArtist.get(record.artistId) || 0) + record.netPayout);
        }
      });

      const rows = artists.map((artist, index) => {
        const managed = buildManagedArtist(artist, index, overrides);
        const liveArtist = liveArtistMap.get(managed.profile.userId) || liveArtistMap.get(managed.profile.id);
        const contract = overrides[managed.id]?.contract;
        const commissionRate = revenueOpsState.artistCommission?.[managed.id] ?? contract?.commissionRate ?? 20;
        const verification = getArtistVerificationState(managed.profile);
        const hold = revenueOpsState.holdSettings?.[managed.id];
        const payoutCompleted = completedByArtist.get(managed.id) || 0;
        const payoutPending = pendingByArtist.get(managed.id) || 0;
        const revenue = liveArtist?.totalRevenue ?? 0;
        const streams = liveArtist?.totalStreams ?? 0;

        return {
          id: managed.id,
          name: managed.name,
          email: managed.email,
          status: managed.status,
          revenue,
          streams,
          contractStatus: contract?.renewalStatus || 'unassigned',
          contractType: contract?.contractType || 'distribution',
          verificationStatus: verification.status,
          commissionRate,
          payoutCompleted,
          payoutPending,
          withholdingAmount: hold?.onHold ? Math.max(revenue * (1 - commissionRate / 100) - payoutCompleted, 0) : payoutPending,
          paymentRecordCount: (revenueOpsState.payoutRecords || []).filter((record) => record.artistId === managed.id).length,
        } satisfies ArtistReportRow;
      });

      return rows.sort((left, right) => right.revenue - left.revenue);
    }

    if (!profile) {
      return [];
    }

    const verification = getArtistVerificationState(profile);
    const earnings = royaltySummary?.earnings || [];
    const grossRevenue = earnings.reduce((sum, item) => sum + item.grossRevenue, 0);
    const netRevenue = earnings.reduce((sum, item) => sum + item.netRevenue, 0);
    const completedPayouts = billingHistory
      .filter((payment) => isPayoutHistoryRecord(payment) && payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingPayouts = billingHistory
      .filter((payment) => isPayoutHistoryRecord(payment) && payment.status === 'pending')
      .reduce((sum, payment) => sum + payment.amount, 0);
    const commissionAmount = Math.max(grossRevenue - netRevenue, 0);
    const commissionRate = grossRevenue > 0 ? (commissionAmount / grossRevenue) * 100 : 0;

    return [{
      id: profile.id,
      name: profile.artistName || profile.username || profile.firstName || profile.email.split('@')[0] || 'Artist',
      email: profile.email,
      status: profile.isVerified ? 'active' : 'inactive',
      revenue: royaltyBalance?.totalEarnings || royaltySummary?.stats.totalRevenue || 0,
      streams: royaltySummary?.stats.totalStreams || 0,
      contractStatus: 'active',
      contractType: 'artist-plan',
      verificationStatus: verification.status,
      commissionRate,
      payoutCompleted: completedPayouts,
      payoutPending: pendingPayouts,
      withholdingAmount: royaltyBalance?.pendingBalance || pendingPayouts,
      paymentRecordCount: billingHistory.filter(isPayoutHistoryRecord).length,
    }];
  }, [artists, billingHistory, isLabelDashboard, labelSummary, overrides, profile, revenueOpsState, royaltyBalance, royaltySummary]);

  const filteredArtistRows = useMemo(() => {
    if (!isLabelDashboard || selectedArtistIds.length === 0) {
      return artistRows;
    }

    return artistRows.filter((row) => selectedArtistIds.includes(row.id));
  }, [artistRows, isLabelDashboard, selectedArtistIds]);

  const monthlyTrend = useMemo(() => {
    const points = isLabelDashboard ? labelSummary?.monthlyTrend || [] : royaltySummary?.stats.monthlyTrend || [];
    return points.filter((point) => isWithinRange(`${point.month}-01T00:00:00`, range.start, range.end));
  }, [isLabelDashboard, labelSummary, range.end, range.start, royaltySummary]);

  const filteredBillingHistory = useMemo(() => {
    return billingHistory.filter((payment) => isWithinRange(getBillingPaymentDate(payment), range.start, range.end));
  }, [billingHistory, range.end, range.start]);

  const revenueSummary = useMemo(() => {
    const totalRevenue = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, point) => sum + point.revenue, 0)
      : filteredArtistRows.reduce((sum, row) => sum + row.revenue, 0);
    const totalStreams = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, point) => sum + point.streams, 0)
      : filteredArtistRows.reduce((sum, row) => sum + row.streams, 0);
    const totalCommission = filteredArtistRows.reduce((sum, row) => sum + row.revenue * (row.commissionRate / 100), 0);
    const totalWithholding = filteredArtistRows.reduce((sum, row) => sum + row.withholdingAmount, 0);
    const payoutTotals = filteredArtistRows.reduce((sum, row) => sum + row.payoutCompleted, 0);

    return {
      totalRevenue,
      totalStreams,
      totalCommission,
      totalWithholding,
      payoutTotals,
    };
  }, [filteredArtistRows, monthlyTrend]);

  const platformRows = useMemo(() => {
    return (analyticsSummary?.platformBreakdown || []).map((row) => ({
      platform: row.name,
      streams: row.streams,
      listeners: row.listeners,
      revenue: row.revenue,
    }));
  }, [analyticsSummary]);

  const geographyRows = useMemo(() => analyticsSummary?.geographyBreakdown || [], [analyticsSummary]);

  const performanceRanking = useMemo(() => {
    return filteredArtistRows
      .map((row) => ({
        artist: row.name,
        revenue: row.revenue,
        streams: row.streams,
        score: row.revenue + row.streams * 0.1,
      }))
      .sort((left, right) => right.score - left.score);
  }, [filteredArtistRows]);

  const complianceRows = useMemo(() => {
    const payoutRecords = revenueOpsState.payoutRecords || [];

    return filteredArtistRows.map((row) => {
      const profileMatch = artists.find((artist) => artist.id === row.id) || (profile?.id === row.id ? profile : null);
      const verification = profileMatch ? getArtistVerificationState(profileMatch) : { status: row.verificationStatus };
      const lastPayout = payoutRecords
        .filter((item) => item.artistId === row.id)
        .sort((left, right) => new Date(right.payoutDate).getTime() - new Date(left.payoutDate).getTime())[0];

      return {
        name: row.name,
        verificationStatus: verification.status,
        contractStatus: row.contractStatus,
        contractType: row.contractType,
        paymentRecords: row.paymentRecordCount,
        taxForms: (overrides[row.id]?.taxDocuments || []).length || (revenueOpsState.taxInfoByArtist?.[row.id] || []).length,
        lastPayoutStatus: lastPayout?.status || 'none',
      };
    });
  }, [artists, filteredArtistRows, overrides, profile, revenueOpsState]);

  const customPreviewRows = useMemo(() => {
    return filteredArtistRows.map((row) => ({
      artist: row.name,
      revenue: selectedMetrics.includes('revenue') ? formatCurrency(row.revenue) : '-',
      streams: selectedMetrics.includes('streams') ? formatCompactNumber(row.streams) : '-',
      listeners: selectedMetrics.includes('listeners')
        ? formatCompactNumber(Math.round((analyticsSummary?.metrics.reportedListeners || 0) / Math.max(filteredArtistRows.length, 1)))
        : '-',
      payouts: selectedMetrics.includes('payouts') ? formatCurrency(row.payoutCompleted) : '-',
      contracts: selectedMetrics.includes('contracts') ? row.contractStatus : '-',
      verification: selectedMetrics.includes('verification') ? row.verificationStatus : '-',
    }));
  }, [analyticsSummary, filteredArtistRows, selectedMetrics]);

  const reportSubtitle = useMemo(() => {
    const subject = isLabelDashboard
      ? profile?.labelName || profile?.artistName || profile?.username || 'Label account'
      : profile?.artistName || profile?.username || profile?.firstName || 'Artist account';
    const rangeLabel = rangePreset === 'custom' ? `${startDate} to ${endDate}` : rangePreset.toUpperCase();
    return `${subject} • ${rangeLabel} • ${isLabelDashboard ? 'Label reporting dashboard' : 'Artist reporting dashboard'}`;
  }, [endDate, isLabelDashboard, profile, rangePreset, startDate]);

  function toggleMetric(metric: MetricKey) {
    setSelectedMetrics((current) => (
      current.includes(metric)
        ? current.filter((item) => item !== metric)
        : [...current, metric]
    ));
  }

  function toggleArtist(artistId: string) {
    setSelectedArtistIds((current) => (
      current.includes(artistId)
        ? current.filter((item) => item !== artistId)
        : [...current, artistId]
    ));
  }

  function saveCurrentTemplate() {
    if (!profile) {
      return;
    }

    const trimmedName = templateName.trim();
    if (!trimmedName) {
      toast.error('Enter a template name before saving.');
      return;
    }

    const nextTemplate: SavedReportTemplate = {
      id: selectedTemplateId || crypto.randomUUID(),
      name: trimmedName,
      reportType: activeReport,
      rangePreset,
      startDate,
      endDate,
      selectedMetrics,
      selectedArtistIds,
    };

    const nextTemplates = savedTemplates.some((template) => template.id === nextTemplate.id)
      ? savedTemplates.map((template) => template.id === nextTemplate.id ? nextTemplate : template)
      : [nextTemplate, ...savedTemplates];

    setSavedTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplate.id);
    writeSavedTemplates(profile.id || profile.userId, profile.role === 'label' ? 'label' : 'artist', nextTemplates);
    toast.success('Report template saved.');
  }

  function applyTemplate(templateId: string) {
    if (!templateId) {
      setSelectedTemplateId('');
      setTemplateName('');
      return;
    }

    const template = savedTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setActiveReport(template.reportType);
    setRangePreset(template.rangePreset);
    setStartDate(template.startDate);
    setEndDate(template.endDate);
    setSelectedMetrics(template.selectedMetrics);
    setSelectedArtistIds(template.selectedArtistIds);
    toast.success(`Applied template: ${template.name}.`);
  }

  function renameTemplate() {
    if (!profile || !selectedTemplateId) {
      toast.error('Select a template to rename.');
      return;
    }

    const trimmedName = templateName.trim();
    if (!trimmedName) {
      toast.error('Enter a new template name first.');
      return;
    }

    const nextTemplates = savedTemplates.map((template) => (
      template.id === selectedTemplateId
        ? { ...template, name: trimmedName }
        : template
    ));

    setSavedTemplates(nextTemplates);
    writeSavedTemplates(profile.id || profile.userId, profile.role === 'label' ? 'label' : 'artist', nextTemplates);
    toast.success('Report template renamed.');
  }

  function duplicateTemplate() {
    if (!profile) {
      return;
    }

    const sourceTemplate = selectedTemplateId
      ? savedTemplates.find((template) => template.id === selectedTemplateId)
      : null;

    const duplicateNameBase = (templateName.trim() || sourceTemplate?.name || reportTitle).trim();
    const duplicateTemplate: SavedReportTemplate = {
      id: crypto.randomUUID(),
      name: `${duplicateNameBase} Copy`,
      reportType: sourceTemplate?.reportType || activeReport,
      rangePreset: sourceTemplate?.rangePreset || rangePreset,
      startDate: sourceTemplate?.startDate || startDate,
      endDate: sourceTemplate?.endDate || endDate,
      selectedMetrics: sourceTemplate?.selectedMetrics || selectedMetrics,
      selectedArtistIds: sourceTemplate?.selectedArtistIds || selectedArtistIds,
    };

    const nextTemplates = [duplicateTemplate, ...savedTemplates];
    setSavedTemplates(nextTemplates);
    setSelectedTemplateId(duplicateTemplate.id);
    setTemplateName(duplicateTemplate.name);
    writeSavedTemplates(profile.id || profile.userId, profile.role === 'label' ? 'label' : 'artist', nextTemplates);
    toast.success('Report template duplicated.');
  }

  function deleteTemplate() {
    if (!profile || !selectedTemplateId) {
      return;
    }

    const nextTemplates = savedTemplates.filter((template) => template.id !== selectedTemplateId);
    setSavedTemplates(nextTemplates);
    writeSavedTemplates(profile.id || profile.userId, profile.role === 'label' ? 'label' : 'artist', nextTemplates);
    setSelectedTemplateId('');
    setTemplateName('');
    toast.success('Report template deleted.');
  }

  function buildRevenueSections() {
    return [
      {
        title: 'Revenue by Artist',
        columns: ['Artist', 'Revenue', 'Commission %', 'Payout Completed'],
        rows: filteredArtistRows.map((row) => [
          row.name,
          formatCurrency(row.revenue),
          `${row.commissionRate.toFixed(1)}%`,
          formatCurrency(row.payoutCompleted),
        ]),
      },
      {
        title: 'Revenue by Platform',
        columns: ['Platform', 'Revenue', 'Streams', 'Listeners'],
        rows: platformRows.map((row) => [
          row.platform,
          formatCurrency(row.revenue),
          formatCompactNumber(row.streams),
          formatCompactNumber(row.listeners),
        ]),
      },
      {
        title: 'Revenue by Period',
        columns: ['Period', 'Revenue', 'Streams'],
        rows: monthlyTrend.map((point) => [
          formatMonthLabel(point.month),
          formatCurrency(point.revenue),
          formatCompactNumber(point.streams),
        ]),
      },
    ] satisfies ReportPdfSection[];
  }

  function buildPerformanceSections() {
    return [{
      title: 'Artist Rankings',
      columns: ['Rank', 'Artist', 'Revenue', 'Streams'],
      rows: performanceRanking.map((row, index) => [
        index + 1,
        row.artist,
        formatCurrency(row.revenue),
        formatCompactNumber(row.streams),
      ]),
    }] satisfies ReportPdfSection[];
  }

  function buildTaxSections() {
    return [{
      title: 'Tax Totals',
      columns: ['Artist', 'Revenue', 'Commission', 'Withholding', 'Payout Totals'],
      rows: filteredArtistRows.map((row) => [
        row.name,
        formatCurrency(row.revenue),
        formatCurrency(row.revenue * (row.commissionRate / 100)),
        formatCurrency(row.withholdingAmount),
        formatCurrency(row.payoutCompleted),
      ]),
    }] satisfies ReportPdfSection[];
  }

  function buildRosterSections() {
    return [{
      title: 'Artist Roster',
      columns: ['Artist', 'Email', 'Contract', 'Status', 'Revenue'],
      rows: filteredArtistRows.map((row) => [
        row.name,
        row.email,
        `${row.contractType} / ${row.contractStatus}`,
        row.status,
        formatCurrency(row.revenue),
      ]),
    }] satisfies ReportPdfSection[];
  }

  function buildStreamingSections() {
    return [
      {
        title: 'Platform Analytics',
        columns: ['Platform', 'Streams', 'Listeners', 'Revenue'],
        rows: platformRows.map((row) => [
          row.platform,
          formatCompactNumber(row.streams),
          formatCompactNumber(row.listeners),
          formatCurrency(row.revenue),
        ]),
      },
      {
        title: 'Geography',
        columns: ['Country', 'Streams', 'Share'],
        rows: geographyRows.map((row) => [
          row.country,
          formatCompactNumber(row.streams),
          `${row.percentage.toFixed(1)}%`,
        ]),
      },
    ] satisfies ReportPdfSection[];
  }

  function buildComplianceSections() {
    return [{
      title: 'Compliance Overview',
      columns: ['Artist', 'Verification', 'Contract', 'Payments', 'Tax Forms', 'Last Payout'],
      rows: complianceRows.map((row) => [
        row.name,
        row.verificationStatus,
        `${row.contractType} / ${row.contractStatus}`,
        row.paymentRecords,
        row.taxForms,
        row.lastPayoutStatus,
      ]),
    }] satisfies ReportPdfSection[];
  }

  function buildCustomSections() {
    return [{
      title: 'Custom Report Output',
      columns: ['Artist', 'Revenue', 'Streams', 'Listeners', 'Payouts', 'Contracts', 'Verification'],
      rows: customPreviewRows.map((row) => [
        row.artist,
        row.revenue,
        row.streams,
        row.listeners,
        row.payouts,
        row.contracts,
        row.verification,
      ]),
    }] satisfies ReportPdfSection[];
  }

  function getExportSections(reportType: ReportType) {
    if (reportType === 'revenue') {
      return buildRevenueSections();
    }

    if (reportType === 'performance') {
      return buildPerformanceSections();
    }

    if (reportType === 'tax') {
      return buildTaxSections();
    }

    if (reportType === 'roster') {
      return buildRosterSections();
    }

    if (reportType === 'streaming') {
      return buildStreamingSections();
    }

    if (reportType === 'compliance') {
      return buildComplianceSections();
    }

    return buildCustomSections();
  }

  function getWorkbookSheets(reportType: ReportType) {
    const sections = getExportSections(reportType);
    const title = reportOptions.find((option) => option.id === reportType)?.label || 'Report';
    const summaryEntries: Array<[string, string]> = [
      ['Role', isLabelDashboard ? 'Label' : 'Artist'],
      ['Revenue', formatCurrency(revenueSummary.totalRevenue)],
      ['Streams', formatCompactNumber(revenueSummary.totalStreams)],
      ['Payout Totals', formatCurrency(revenueSummary.payoutTotals)],
      ['Artists in Scope', filteredArtistRows.length.toString()],
    ];

    return [
      buildSummarySheet(title, summaryEntries),
      ...sections.map((section) => ({
        name: section.title,
        rows: [section.columns, ...section.rows],
      } satisfies ReportWorkbookSheet)),
    ];
  }

  function getExportCharts(reportType: ReportType) {
    if (reportType === 'revenue') {
      return [
        {
          title: 'Revenue Trend',
          type: 'line',
          color: '#FF6B00',
          data: monthlyTrend.map((point) => ({ label: formatMonthLabel(point.month), value: point.revenue })),
        },
        {
          title: 'Platform Revenue',
          type: 'bar',
          color: '#FFD600',
          data: platformRows.slice(0, 6).map((row) => ({ label: row.platform, value: row.revenue })),
        },
      ] satisfies ReportPdfChart[];
    }

    if (reportType === 'performance') {
      return [{
        title: 'Top Artist Revenue Ranking',
        type: 'bar',
        color: '#1DB954',
        data: performanceRanking.slice(0, 8).map((row) => ({ label: row.artist, value: row.revenue })),
      }] satisfies ReportPdfChart[];
    }

    if (reportType === 'tax') {
      return [{
        title: 'Withholding By Artist',
        type: 'bar',
        color: '#FA243C',
        data: filteredArtistRows.slice(0, 8).map((row) => ({ label: row.name, value: row.withholdingAmount })),
      }] satisfies ReportPdfChart[];
    }

    if (reportType === 'streaming') {
      return [
        {
          title: 'Platform Streams',
          type: 'bar',
          color: '#3B82F6',
          data: platformRows.slice(0, 6).map((row) => ({ label: row.platform, value: row.streams })),
        },
        {
          title: 'Top Markets',
          type: 'bar',
          color: '#8B5CF6',
          data: geographyRows.slice(0, 6).map((row) => ({ label: row.country, value: row.streams })),
        },
      ] satisfies ReportPdfChart[];
    }

    if (reportType === 'compliance') {
      return [{
        title: 'Payment Records By Artist',
        type: 'bar',
        color: '#FF6B00',
        data: complianceRows.slice(0, 8).map((row) => ({ label: row.name, value: row.paymentRecords })),
      }] satisfies ReportPdfChart[];
    }

    if (reportType === 'custom') {
      const customMetric = selectedMetrics.includes('revenue')
        ? filteredArtistRows.slice(0, 8).map((row) => ({ label: row.name, value: row.revenue }))
        : filteredArtistRows.slice(0, 8).map((row) => ({ label: row.name, value: row.streams }));

      return [{
        title: selectedMetrics.includes('revenue') ? 'Custom Revenue View' : 'Custom Streams View',
        type: 'bar',
        color: '#FFD600',
        data: customMetric,
      }] satisfies ReportPdfChart[];
    }

    return [] as ReportPdfChart[];
  }

  function exportReport(reportType: ReportType, format: 'pdf' | 'excel') {
    const title = reportOptions.find((option) => option.id === reportType)?.label || 'Report';
    const baseName = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      downloadReportWorkbook(`${baseName}.xlsx`, getWorkbookSheets(reportType));
      toast.success(`${title} exported to Excel.`);
      return;
    }

    downloadReportPdf({
      fileName: `${baseName}.pdf`,
      title,
      subtitle: reportSubtitle,
      summary: [
        ['Revenue', formatCurrency(revenueSummary.totalRevenue)],
        ['Streams', formatCompactNumber(revenueSummary.totalStreams)],
        ['Commission', formatCurrency(revenueSummary.totalCommission)],
        ['Withholding', formatCurrency(revenueSummary.totalWithholding)],
        ['Artists in Scope', filteredArtistRows.length.toString()],
      ],
      charts: getExportCharts(reportType),
      sections: getExportSections(reportType),
    });
    toast.success(`${title} exported to PDF.`);
  }

  const reportTitle = reportOptions.find((option) => option.id === activeReport)?.label || 'Reporting Dashboard';

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Reporting Dashboard</h1>
          <p className="max-w-3xl text-[#B3B3B3]">
            Build export-ready reports for revenue, artist performance, tax filing, roster visibility, streaming analytics,
            and compliance. Available to both artist and label plans with PDF and Excel output only.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => exportReport(activeReport, 'excel')} className="border-[#FF6B00]/20 text-white hover:bg-[#0A0A0A]">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={() => exportReport(activeReport, 'pdf')} className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="space-y-5 border-[#FF6B00]/20 bg-[#161616] p-6">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#FFD600]">
          <Filter className="h-4 w-4" />
          Report Filters
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Date Range</span>
              <select
                aria-label="Report date range"
                value={rangePreset}
                onChange={(event) => setRangePreset(event.target.value as RangePreset)}
                className="h-10 w-full rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="year">Last 12 months</option>
                <option value="all">All time</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Start Date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={rangePreset !== 'custom'}
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white disabled:opacity-50"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">End Date</span>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={rangePreset !== 'custom'}
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white disabled:opacity-50"
              />
            </label>

            <div className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] p-3 text-sm text-[#B3B3B3]">
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-[#FFD600]">Scope</div>
              <div>{isLabelDashboard ? 'Label dashboard with roster-level reporting' : 'Artist dashboard with self-service reporting'}</div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Metrics Selection</div>
            <div className="grid grid-cols-2 gap-2">
              {metricOptions.map((metric) => (
                <label key={metric.id} className="flex items-center gap-2 rounded-lg border border-[#FF6B00]/10 bg-[#120D09] px-3 py-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => toggleMetric(metric.id)}
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Template Name</span>
            <Input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Quarterly label tax pack"
              className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Saved Templates</span>
            <select
              aria-label="Saved report templates"
              value={selectedTemplateId}
              onChange={(event) => applyTemplate(event.target.value)}
              className="h-10 min-w-[220px] rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
            >
              <option value="">Select template</option>
              {savedTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={saveCurrentTemplate} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
            <Button variant="outline" onClick={renameTemplate} disabled={!selectedTemplateId} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09] disabled:opacity-50">
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </Button>
            <Button variant="outline" onClick={duplicateTemplate} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={deleteTemplate} disabled={!selectedTemplateId} className="border-red-500/30 text-red-200 hover:bg-red-500/10 disabled:opacity-50">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {isLabelDashboard ? (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Artists In Scope</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {artistRows.map((artist) => (
                <label key={artist.id} className="flex items-center justify-between rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                  <span>{artist.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedArtistIds.includes(artist.id)}
                    onChange={() => toggleArtist(artist.id)}
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Total Revenue</div>
          <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(revenueSummary.totalRevenue)}</div>
        </Card>
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Streams</div>
          <div className="mt-2 text-3xl font-semibold text-white">{formatCompactNumber(revenueSummary.totalStreams)}</div>
        </Card>
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Commission</div>
          <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(revenueSummary.totalCommission)}</div>
        </Card>
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Payout Totals</div>
          <div className="mt-2 text-3xl font-semibold text-white">{formatCurrency(revenueSummary.payoutTotals)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {reportOptions.map((option) => {
          const Icon = option.icon;
          const active = activeReport === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveReport(option.id)}
              className={`rounded-2xl border p-5 text-left transition-colors ${
                active
                  ? 'border-[#FF6B00]/40 bg-[#1B130D]'
                  : 'border-[#FF6B00]/15 bg-[#161616] hover:bg-[#121212]'
              }`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B00]/10 text-[#FFD600]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-lg font-semibold text-white">{option.label}</div>
              <div className="mt-2 text-sm text-[#B3B3B3]">{option.description}</div>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-[#B3B3B3]">Loading reporting dashboard...</Card>
      ) : errorMessage ? (
        <Card className="border-red-500/20 bg-red-500/10 p-6 text-red-200">{errorMessage}</Card>
      ) : (
        <>
          <Card className="border-[#FF6B00]/20 bg-[#161616] p-6">
            <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{reportTitle}</h2>
                <p className="text-sm text-[#B3B3B3]">{reportSubtitle}</p>
              </div>
              <Badge className="w-fit border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD600]">
                {filteredArtistRows.length} {filteredArtistRows.length === 1 ? 'artist' : 'artists'} in report
              </Badge>
            </div>

            {activeReport === 'revenue' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Revenue by period</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={monthlyTrend.map((point) => ({ label: formatMonthLabel(point.month), revenue: point.revenue, streams: point.streams }))}>
                        <defs>
                          <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#2A2A2A" vertical={false} />
                        <XAxis dataKey="label" stroke="#8A8A8A" />
                        <YAxis stroke="#8A8A8A" />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#FF6B00" fill="url(#reportRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Revenue by platform</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={platformRows} dataKey="revenue" nameKey="platform" outerRadius={94} innerRadius={54}>
                          {platformRows.map((entry, index) => (
                            <Cell key={entry.platform} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Revenue by artist</div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                          <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                          <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                          <TableHead className="text-[#B3B3B3]">Commission %</TableHead>
                          <TableHead className="text-[#B3B3B3]">Completed Payouts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredArtistRows.map((row) => (
                          <TableRow key={row.id} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                            <TableCell className="text-white">{row.name}</TableCell>
                            <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-white">{row.commissionRate.toFixed(1)}%</TableCell>
                            <TableCell className="text-white">{formatCurrency(row.payoutCompleted)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Revenue by platform</div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                          <TableHead className="text-[#B3B3B3]">Platform</TableHead>
                          <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                          <TableHead className="text-[#B3B3B3]">Streams</TableHead>
                          <TableHead className="text-[#B3B3B3]">Listeners</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platformRows.map((row) => (
                          <TableRow key={row.platform} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                            <TableCell className="text-white">{row.platform}</TableCell>
                            <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-white">{formatCompactNumber(row.streams)}</TableCell>
                            <TableCell className="text-white">{formatCompactNumber(row.listeners)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeReport === 'performance' ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                  <div className="mb-4 text-sm text-[#B3B3B3]">Artist performance rankings</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={performanceRanking.slice(0, 8)}>
                      <CartesianGrid stroke="#2A2A2A" vertical={false} />
                      <XAxis dataKey="artist" stroke="#8A8A8A" />
                      <YAxis stroke="#8A8A8A" />
                      <Tooltip />
                      <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#FF6B00" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                        <TableHead className="text-[#B3B3B3]">Rank</TableHead>
                        <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                        <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                        <TableHead className="text-[#B3B3B3]">Streams</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceRanking.map((row, index) => (
                        <TableRow key={row.artist} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                          <TableCell className="text-white">#{index + 1}</TableCell>
                          <TableCell className="text-white">{row.artist}</TableCell>
                          <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-white">{formatCompactNumber(row.streams)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {activeReport === 'tax' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Revenue</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(revenueSummary.totalRevenue)}</div>
                  </div>
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Commission</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(revenueSummary.totalCommission)}</div>
                  </div>
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Withholding</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(revenueSummary.totalWithholding)}</div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                        <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                        <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                        <TableHead className="text-[#B3B3B3]">Commission</TableHead>
                        <TableHead className="text-[#B3B3B3]">Withholding</TableHead>
                        <TableHead className="text-[#B3B3B3]">Payout Totals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArtistRows.map((row) => (
                        <TableRow key={row.id} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                          <TableCell className="text-white">{row.name}</TableCell>
                          <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                          <TableCell className="text-white">{formatCurrency(row.revenue * (row.commissionRate / 100))}</TableCell>
                          <TableCell className="text-white">{formatCurrency(row.withholdingAmount)}</TableCell>
                          <TableCell className="text-white">{formatCurrency(row.payoutCompleted)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {activeReport === 'roster' ? (
              <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                      <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                      <TableHead className="text-[#B3B3B3]">Email</TableHead>
                      <TableHead className="text-[#B3B3B3]">Contract</TableHead>
                      <TableHead className="text-[#B3B3B3]">Status</TableHead>
                      <TableHead className="text-[#B3B3B3]">Current Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArtistRows.map((row) => (
                      <TableRow key={row.id} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                        <TableCell className="text-white">{row.name}</TableCell>
                        <TableCell className="text-white">{row.email}</TableCell>
                        <TableCell className="text-white">{row.contractType} / {row.contractStatus}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(row.status)}>{row.status}</Badge>
                        </TableCell>
                        <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {activeReport === 'streaming' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Platform mix</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={platformRows}>
                        <CartesianGrid stroke="#2A2A2A" vertical={false} />
                        <XAxis dataKey="platform" stroke="#8A8A8A" />
                        <YAxis stroke="#8A8A8A" />
                        <Tooltip />
                        <Bar dataKey="streams" radius={[10, 10, 0, 0]} fill="#FFD600" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <div className="mb-4 text-sm text-[#B3B3B3]">Geographic distribution</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={geographyRows} dataKey="streams" nameKey="country" outerRadius={94} innerRadius={52}>
                          {geographyRows.map((row, index) => (
                            <Cell key={row.country} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                          <TableHead className="text-[#B3B3B3]">Platform</TableHead>
                          <TableHead className="text-[#B3B3B3]">Streams</TableHead>
                          <TableHead className="text-[#B3B3B3]">Listeners</TableHead>
                          <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platformRows.map((row) => (
                          <TableRow key={row.platform} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                            <TableCell className="text-white">{row.platform}</TableCell>
                            <TableCell className="text-white">{formatCompactNumber(row.streams)}</TableCell>
                            <TableCell className="text-white">{formatCompactNumber(row.listeners)}</TableCell>
                            <TableCell className="text-white">{formatCurrency(row.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                          <TableHead className="text-[#B3B3B3]">Country</TableHead>
                          <TableHead className="text-[#B3B3B3]">Streams</TableHead>
                          <TableHead className="text-[#B3B3B3]">Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {geographyRows.map((row) => (
                          <TableRow key={row.country} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                            <TableCell className="text-white">{row.country}</TableCell>
                            <TableCell className="text-white">{formatCompactNumber(row.streams)}</TableCell>
                            <TableCell className="text-white">{row.percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeReport === 'compliance' ? (
              <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                      <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                      <TableHead className="text-[#B3B3B3]">Verification</TableHead>
                      <TableHead className="text-[#B3B3B3]">Contract</TableHead>
                      <TableHead className="text-[#B3B3B3]">Payment Records</TableHead>
                      <TableHead className="text-[#B3B3B3]">Tax Forms</TableHead>
                      <TableHead className="text-[#B3B3B3]">Last Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceRows.map((row) => (
                      <TableRow key={row.name} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                        <TableCell className="text-white">{row.name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(row.verificationStatus)}>{row.verificationStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-white">{row.contractType} / {row.contractStatus}</TableCell>
                        <TableCell className="text-white">{row.paymentRecords}</TableCell>
                        <TableCell className="text-white">{row.taxForms}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(row.lastPayoutStatus)}>{row.lastPayoutStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {activeReport === 'custom' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4 text-sm text-[#B3B3B3]">
                    The custom report builder uses the selected date window, artist scope, and metric checkboxes above.
                    Export is limited to Excel and PDF as requested.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => exportReport('custom', 'excel')} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Build Excel
                    </Button>
                    <Button onClick={() => exportReport('custom', 'pdf')} className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
                      <FileText className="mr-2 h-4 w-4" />
                      Build PDF
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                        <TableHead className="text-[#B3B3B3]">Artist</TableHead>
                        <TableHead className="text-[#B3B3B3]">Revenue</TableHead>
                        <TableHead className="text-[#B3B3B3]">Streams</TableHead>
                        <TableHead className="text-[#B3B3B3]">Listeners</TableHead>
                        <TableHead className="text-[#B3B3B3]">Payouts</TableHead>
                        <TableHead className="text-[#B3B3B3]">Contracts</TableHead>
                        <TableHead className="text-[#B3B3B3]">Verification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customPreviewRows.map((row) => (
                        <TableRow key={row.artist} className="border-[#FF6B00]/10 hover:bg-[#120D09]">
                          <TableCell className="text-white">{row.artist}</TableCell>
                          <TableCell className="text-white">{row.revenue}</TableCell>
                          <TableCell className="text-white">{row.streams}</TableCell>
                          <TableCell className="text-white">{row.listeners}</TableCell>
                          <TableCell className="text-white">{row.payouts}</TableCell>
                          <TableCell className="text-white">{row.contracts}</TableCell>
                          <TableCell className="text-white">{row.verification}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="border-[#FF6B00]/20 bg-[#120D09] p-5 text-sm text-[#E5E7EB]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                Reports are generated from live billing, analytics, earnings, verification, and contract data already available to the signed-in role.
              </div>
              <div className="text-[#B3B3B3]">
                Export format is restricted to Excel and PDF for both artist and label dashboards.
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}