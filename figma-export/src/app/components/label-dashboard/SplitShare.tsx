import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowUpRight,
  Calendar,
  Download,
  DollarSign,
  Percent,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  getAnalyticsCatalogPerformance,
  type AnalyticsCatalogPerformance,
} from '../../utils/analytics-api';
import {
  buildManagedArtist,
  formatCompactNumber,
  formatCurrency,
  readArtistManagementOverrides,
  type ArtistManagementOverrides,
} from '../../utils/artist-management';
import {
  formatBillingCurrency,
  getBillingPaymentDate,
  isPayoutHistoryRecord,
} from '../../utils/billing-downloads';
import {
  getBillingHistory,
  getLabelArtistEarningsSummary,
  type BillingHistoryRecord,
  type LabelArtistEarningsSummary,
} from '../../utils/payment-api';
import { getCurrentUserProfile, getLabelArtists, type UserProfile } from '../../utils/user-api';

const DEFAULT_COMMISSION_RATE = 20;
const MILESTONE_TARGETS = [50000, 100000, 200000, 500000, 1000000] as const;

type ArtistRevenueRow = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  dataSource: 'live' | 'none';
  streams: number;
  artistRevenue: number;
  commissionRate: number;
  labelCommission: number;
  artistPayout: number;
};

type PaymentScheduleRow = {
  id: string;
  paymentDate: string;
  artistRevenue: number;
  labelCommission: number;
  netPayout: number;
  status: 'pending' | 'completed';
  periodLabel: string;
};

type PayoutSchedule = 'monthly' | 'quarterly';
type AutoPayoutMode = 'threshold' | 'calendar';
type PayoutMethodType = 'bank-transfer' | 'paypal' | 'wise' | 'check';
type PayoutRecordStatus = 'pending' | 'completed' | 'on-hold';
type TaxFormType = 'W-9' | '1099' | 'Other';

type PayoutMethod = {
  id: string;
  method: PayoutMethodType;
  accountName: string;
  accountNumber: string;
  bankOrProvider: string;
  isDefault: boolean;
};

type PayoutRecord = {
  id: string;
  payoutDate: string;
  artistId: string;
  artistName: string;
  grossRevenue: number;
  commission: number;
  netPayout: number;
  status: PayoutRecordStatus;
  methodId?: string;
};

type HoldSetting = {
  onHold: boolean;
  reason?: string;
  holdDate?: string;
};

type ArtistTaxInfo = {
  formType: TaxFormType;
  fileName: string;
  uploadedAt: string;
};

type RevenueOpsState = {
  artistCommission: Record<string, number>;
  paymentThreshold: number;
  payoutSchedule: PayoutSchedule;
  calculatorCommissionPercent: number;
  adminFeePercent: number;
  payoutMethods: PayoutMethod[];
  payoutRecords: PayoutRecord[];
  autoPayoutMode: AutoPayoutMode;
  autoPayoutDay: number;
  holdSettings: Record<string, HoldSetting>;
  taxInfoByArtist: Record<string, ArtistTaxInfo[]>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);

  if (!year || !monthIndex) {
    return month;
  }

  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildEstimatedSettlementDate(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);

  if (!year || !monthIndex) {
    return new Date().toISOString();
  }

  return new Date(Date.UTC(year, monthIndex, 15)).toISOString();
}

function getRevenueOpsStorageKey(labelProfileId: string) {
  return `amtdistro-label-revenue-ops:${labelProfileId}`;
}

function getDefaultRevenueOpsState(calculatorCommissionPercent: number): RevenueOpsState {
  return {
    artistCommission: {},
    paymentThreshold: 50000,
    payoutSchedule: 'monthly',
    calculatorCommissionPercent,
    adminFeePercent: 0,
    payoutMethods: [],
    payoutRecords: [],
    autoPayoutMode: 'threshold',
    autoPayoutDay: 1,
    holdSettings: {},
    taxInfoByArtist: {},
  };
}

function getNextPayoutDate(schedule: PayoutSchedule, now = new Date()) {
  const nextDate = new Date(now);
  if (schedule === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 3);
  }
  nextDate.setDate(1);
  return nextDate;
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function downloadRevenueReportCsv(
  rows: ArtistRevenueRow[],
  paymentRows: PaymentScheduleRow[],
  totalArtistRevenue: number,
  totalLabelCommission: number,
  totalArtistPayout: number,
) {
  const summaryLines = [
    ['Metric', 'Value'],
    ['Total Artist Revenue', totalArtistRevenue.toFixed(2)],
    ['Total Label Commission', totalLabelCommission.toFixed(2)],
    ['Total Artist Payout', totalArtistPayout.toFixed(2)],
    [],
  ];

  const artistLines = [
    ['Artist', 'Email', 'Revenue', 'Commission Rate', 'Label Commission', 'Artist Payout', 'Streams', 'Source'],
    ...rows.map((row) => [
      row.name,
      row.email,
      row.artistRevenue.toFixed(2),
      `${row.commissionRate}%`,
      row.labelCommission.toFixed(2),
      row.artistPayout.toFixed(2),
      row.streams.toString(),
      row.dataSource,
    ]),
    [],
  ];

  const paymentLines = [
    ['Payment Date', 'Period', 'Artist Revenue', 'Label Commission', 'Net Payout', 'Status'],
    ...paymentRows.map((row) => [
      new Date(row.paymentDate).toISOString(),
      row.periodLabel,
      row.artistRevenue.toFixed(2),
      row.labelCommission.toFixed(2),
      row.netPayout.toFixed(2),
      row.status,
    ]),
  ];

  const csvContent = [...summaryLines, ...artistLines, ...paymentLines]
    .map((row) => row.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n');

  downloadBlob(csvContent, `artist-revenue-report-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

function downloadRevenueReportPdf(
  rows: ArtistRevenueRow[],
  paymentRows: PaymentScheduleRow[],
  totalArtistRevenue: number,
  totalLabelCommission: number,
  totalArtistPayout: number,
  labelName: string,
) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  const right = 555;
  let top = 48;

  const ensureSpace = (requiredHeight: number) => {
    if (top + requiredHeight <= 780) {
      return;
    }

    pdf.addPage();
    top = 48;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(`${labelName} Artist Revenue Report`, left, top);
  top += 18;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated ${new Date().toLocaleString()}`, left, top);
  top += 28;

  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Artist Revenue: NGN ${totalArtistRevenue.toLocaleString()}`, left, top);
  top += 16;
  pdf.text(`Label Commission: NGN ${totalLabelCommission.toLocaleString()}`, left, top);
  top += 16;
  pdf.text(`Artist Payout: NGN ${totalArtistPayout.toLocaleString()}`, left, top);
  top += 28;

  pdf.text('Artist Revenue Breakdown', left, top);
  top += 18;
  pdf.setFontSize(9);
  pdf.text('Artist', left, top);
  pdf.text('Revenue', 220, top);
  pdf.text('Commission', 310, top);
  pdf.text('Payout', 410, top);
  top += 8;
  pdf.line(left, top, right, top);
  top += 16;

  rows.forEach((row) => {
    ensureSpace(36);
    pdf.setFont('helvetica', 'normal');
    pdf.text(row.name.slice(0, 26), left, top);
    pdf.text(`NGN ${row.artistRevenue.toLocaleString()}`, 220, top);
    pdf.text(`NGN ${row.labelCommission.toLocaleString()}`, 310, top);
    pdf.text(`NGN ${row.artistPayout.toLocaleString()}`, 410, top);
    top += 18;
  });

  top += 12;
  ensureSpace(90);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Payment Schedule', left, top);
  top += 18;
  pdf.setFontSize(9);
  pdf.text('Date', left, top);
  pdf.text('Period', 120, top);
  pdf.text('Revenue', 220, top);
  pdf.text('Commission', 295, top);
  pdf.text('Net Payout', 385, top);
  pdf.text('Status', 485, top);
  top += 8;
  pdf.line(left, top, right, top);
  top += 16;

  paymentRows.forEach((row) => {
    ensureSpace(32);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date(row.paymentDate).toLocaleDateString(), left, top);
    pdf.text(row.periodLabel, 120, top);
    pdf.text(`NGN ${row.artistRevenue.toLocaleString()}`, 220, top);
    pdf.text(`NGN ${row.labelCommission.toLocaleString()}`, 295, top);
    pdf.text(`NGN ${row.netPayout.toLocaleString()}`, 385, top);
    pdf.text(row.status, 485, top);
    top += 16;
  });

  pdf.save(`artist-revenue-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function SplitShare() {
  const [searchQuery, setSearchQuery] = useState('');
  const [artists, setArtists] = useState<UserProfile[]>([]);
  const [labelProfileId, setLabelProfileId] = useState('');
  const [labelName, setLabelName] = useState('Label');
  const [overrides, setOverrides] = useState<ArtistManagementOverrides>({});
  const [earningsSummary, setEarningsSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [catalogPerformance, setCatalogPerformance] = useState<AnalyticsCatalogPerformance>({ topSongs: [], topReleases: [] });
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRecord[]>([]);
  const [artistCommissionSettings, setArtistCommissionSettings] = useState<Record<string, number>>({});
  const [paymentThreshold, setPaymentThreshold] = useState(50000);
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>('monthly');
  const [calculatorCommissionPercent, setCalculatorCommissionPercent] = useState(20);
  const [adminFeePercent, setAdminFeePercent] = useState(0);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [payoutRecords, setPayoutRecords] = useState<PayoutRecord[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [autoPayoutMode, setAutoPayoutMode] = useState<AutoPayoutMode>('threshold');
  const [autoPayoutDay, setAutoPayoutDay] = useState(1);
  const [holdSettings, setHoldSettings] = useState<Record<string, HoldSetting>>({});
  const [taxInfoByArtist, setTaxInfoByArtist] = useState<Record<string, ArtistTaxInfo[]>>({});
  const [methodForm, setMethodForm] = useState({
    method: 'bank-transfer' as PayoutMethodType,
    accountName: '',
    accountNumber: '',
    bankOrProvider: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setOverrides(readArtistManagementOverrides());

    const handleStorage = (event: StorageEvent) => {
      if (event.key) {
        setOverrides(readArtistManagementOverrides());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSplitShareData() {
      setIsLoading(true);
      setErrorMessage('');

      const [profileResult, artistsResult, earningsResult, catalogResult, billingResult] = await Promise.allSettled([
        getCurrentUserProfile(),
        getLabelArtists(),
        getLabelArtistEarningsSummary(),
        getAnalyticsCatalogPerformance('all'),
        getBillingHistory(),
      ]);

      if (!active) {
        return;
      }

      if (profileResult.status === 'fulfilled') {
        setLabelName(profileResult.value.labelName || profileResult.value.artistName || profileResult.value.username || 'Label');
        setLabelProfileId(profileResult.value.id || profileResult.value.userId || '');
      }

      if (artistsResult.status === 'fulfilled') {
        setArtists(artistsResult.value);
      }

      if (earningsResult.status === 'fulfilled') {
        setEarningsSummary(earningsResult.value);
      }

      if (catalogResult.status === 'fulfilled') {
        setCatalogPerformance(catalogResult.value);
      }

      if (billingResult.status === 'fulfilled') {
        setBillingHistory(billingResult.value);
      }

      if (artistsResult.status === 'rejected' && earningsResult.status === 'rejected') {
        setErrorMessage('Unable to load split share revenue data right now.');
      }

      setIsLoading(false);
    }

    loadSplitShareData().catch((error) => {
      if (!active) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load split share revenue data.');
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!labelProfileId || typeof window === 'undefined') {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(getRevenueOpsStorageKey(labelProfileId));
      if (!rawValue) {
        return;
      }

      const parsedState = JSON.parse(rawValue) as Partial<RevenueOpsState>;
      if (parsedState.artistCommission) setArtistCommissionSettings(parsedState.artistCommission);
      if (typeof parsedState.paymentThreshold === 'number') setPaymentThreshold(parsedState.paymentThreshold);
      if (parsedState.payoutSchedule) setPayoutSchedule(parsedState.payoutSchedule);
      if (typeof parsedState.calculatorCommissionPercent === 'number') setCalculatorCommissionPercent(parsedState.calculatorCommissionPercent);
      if (typeof parsedState.adminFeePercent === 'number') setAdminFeePercent(parsedState.adminFeePercent);
      if (Array.isArray(parsedState.payoutMethods)) setPayoutMethods(parsedState.payoutMethods);
      if (Array.isArray(parsedState.payoutRecords)) setPayoutRecords(parsedState.payoutRecords);
      if (parsedState.autoPayoutMode) setAutoPayoutMode(parsedState.autoPayoutMode);
      if (typeof parsedState.autoPayoutDay === 'number') setAutoPayoutDay(parsedState.autoPayoutDay);
      if (parsedState.holdSettings) setHoldSettings(parsedState.holdSettings);
      if (parsedState.taxInfoByArtist) setTaxInfoByArtist(parsedState.taxInfoByArtist);
    } catch {
      // Keep defaults when persisted state is corrupted.
    }
  }, [labelProfileId]);

  const artistRows = useMemo<ArtistRevenueRow[]>(() => {
    const liveArtistMap = new Map<string, LabelArtistEarningsSummary['topArtists'][number]>();

    earningsSummary?.topArtists.forEach((artist) => {
      liveArtistMap.set(artist.userId, artist);
      liveArtistMap.set(artist.artistId, artist);
    });

    const managedArtists = artists.map((artist, index) => buildManagedArtist(artist, index, overrides));
    const seen = new Set<string>();

    const rows = managedArtists.map((artist) => {
      const liveArtist = liveArtistMap.get(artist.profile.userId) || liveArtistMap.get(artist.profile.id);
      const artistRevenue = liveArtist?.totalRevenue ?? 0;
      const streams = liveArtist?.totalStreams ?? 0;
      const commissionRate = overrides[artist.id]?.contract?.commissionRate ?? DEFAULT_COMMISSION_RATE;
      seen.add(artist.id);

      return {
        id: artist.id,
        name: artist.name,
        email: artist.email,
        status: artist.status,
        dataSource: liveArtist ? 'live' : 'none',
        streams,
        artistRevenue,
        commissionRate,
        labelCommission: artistRevenue * (commissionRate / 100),
        artistPayout: artistRevenue * (1 - commissionRate / 100),
      } satisfies ArtistRevenueRow;
    });

    earningsSummary?.topArtists.forEach((artist) => {
      const match = artists.find((candidate) => candidate.userId === artist.userId || candidate.id === artist.artistId);
      const id = match?.id || artist.artistId || artist.userId;

      if (seen.has(id)) {
        return;
      }

      const commissionRate = overrides[id]?.contract?.commissionRate ?? DEFAULT_COMMISSION_RATE;
      rows.push({
        id,
        name: artist.artistName,
        email: artist.email,
        status: 'active',
        dataSource: 'live',
        streams: artist.totalStreams,
        artistRevenue: artist.totalRevenue,
        commissionRate,
        labelCommission: artist.totalRevenue * (commissionRate / 100),
        artistPayout: artist.totalRevenue * (1 - commissionRate / 100),
      });
    });

    return rows.sort((left, right) => right.artistRevenue - left.artistRevenue);
  }, [artists, earningsSummary, overrides]);

  const filteredArtistRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return artistRows;
    }

    return artistRows.filter((row) => (
      row.name.toLowerCase().includes(normalizedQuery)
      || row.email.toLowerCase().includes(normalizedQuery)
      || row.status.toLowerCase().includes(normalizedQuery)
    ));
  }, [artistRows, searchQuery]);

  const displayedRevenueTotal = useMemo(
    () => artistRows.reduce((sum, row) => sum + row.artistRevenue, 0),
    [artistRows],
  );

  const displayedCommissionTotal = useMemo(
    () => artistRows.reduce((sum, row) => sum + row.labelCommission, 0),
    [artistRows],
  );

  const weightedCommissionRate = displayedRevenueTotal > 0
    ? displayedCommissionTotal / displayedRevenueTotal
    : DEFAULT_COMMISSION_RATE / 100;

  useEffect(() => {
    if (!labelProfileId || typeof window === 'undefined') {
      return;
    }

    const payload: RevenueOpsState = {
      ...getDefaultRevenueOpsState(calculatorCommissionPercent),
      artistCommission: artistCommissionSettings,
      paymentThreshold,
      payoutSchedule,
      calculatorCommissionPercent,
      adminFeePercent,
      payoutMethods,
      payoutRecords,
      autoPayoutMode,
      autoPayoutDay,
      holdSettings,
      taxInfoByArtist,
    };

    window.localStorage.setItem(getRevenueOpsStorageKey(labelProfileId), JSON.stringify(payload));
  }, [
    adminFeePercent,
    artistCommissionSettings,
    autoPayoutDay,
    autoPayoutMode,
    calculatorCommissionPercent,
    holdSettings,
    labelProfileId,
    paymentThreshold,
    payoutMethods,
    payoutRecords,
    payoutSchedule,
    taxInfoByArtist,
  ]);

  const totalArtistRevenue = earningsSummary?.totalArtistEarnings ?? displayedRevenueTotal;
  const totalLabelCommission = totalArtistRevenue * weightedCommissionRate;
  const totalArtistPayout = totalArtistRevenue - totalLabelCommission;
  const labelCommissionPercent = weightedCommissionRate * 100;
  const artistPayoutPercent = 100 - labelCommissionPercent;

  const projection = useMemo(() => {
    const monthlyTrend = earningsSummary?.monthlyTrend || [];
    const currentPoint = monthlyTrend[monthlyTrend.length - 1];
    const trailingPoints = monthlyTrend.slice(Math.max(0, monthlyTrend.length - 4), monthlyTrend.length - 1);
    const trailingAverageStreams = trailingPoints.length > 0
      ? trailingPoints.reduce((sum, point) => sum + point.streams, 0) / trailingPoints.length
      : currentPoint?.streams || 0;
    const revenuePerStream = earningsSummary && earningsSummary.totalArtistStreams > 0
      ? earningsSummary.totalArtistEarnings / earningsSummary.totalArtistStreams
      : 0;
    const streamGrowthRate = trailingAverageStreams > 0 && currentPoint
      ? clamp((currentPoint.streams - trailingAverageStreams) / trailingAverageStreams, -0.25, 0.35)
      : 0;
    const projectedStreams = Math.round((currentPoint?.streams || 0) * (1 + streamGrowthRate));
    const projectedRevenue = projectedStreams * revenuePerStream;

    return {
      currentStreams: currentPoint?.streams || 0,
      currentRevenue: currentPoint?.revenue || 0,
      revenuePerStream,
      streamGrowthRate,
      projectedStreams,
      projectedRevenue,
      projectedCommission: projectedRevenue * weightedCommissionRate,
      projectedPayout: projectedRevenue * (1 - weightedCommissionRate),
    };
  }, [earningsSummary, weightedCommissionRate]);

  const milestoneRows = useMemo(() => {
    const monthlyTrend = earningsSummary?.monthlyTrend || [];
    let runningRevenue = 0;

    return MILESTONE_TARGETS.map((target) => {
      let reachedAt: string | null = null;

      runningRevenue = 0;
      for (const point of monthlyTrend) {
        runningRevenue += point.revenue;
        if (runningRevenue >= target) {
          reachedAt = point.month;
          break;
        }
      }

      return {
        target,
        reachedAt,
        complete: totalArtistRevenue >= target,
        progressPercent: clamp((totalArtistRevenue / target) * 100, 0, 100),
      };
    });
  }, [earningsSummary, totalArtistRevenue]);

  const paymentScheduleRows = useMemo<PaymentScheduleRow[]>(() => {
    const payoutHistory = billingHistory
      .filter(isPayoutHistoryRecord)
      .sort((left, right) => new Date(getBillingPaymentDate(right)).getTime() - new Date(getBillingPaymentDate(left)).getTime());

    const monthlyTrend = [...(earningsSummary?.monthlyTrend || [])]
      .sort((left, right) => right.month.localeCompare(left.month))
      .slice(0, 6);

    return monthlyTrend.map((point, index) => {
      const payout = payoutHistory[index];
      const isCurrentPeriod = index === 0;
      const status = payout?.status === 'completed' ? 'completed' : (isCurrentPeriod ? 'pending' : 'completed');
      const paymentDate = payout ? getBillingPaymentDate(payout) : buildEstimatedSettlementDate(point.month);

      return {
        id: `${point.month}-${index}`,
        paymentDate,
        artistRevenue: point.revenue,
        labelCommission: point.revenue * weightedCommissionRate,
        netPayout: point.revenue * (1 - weightedCommissionRate),
        status,
        periodLabel: formatMonthLabel(point.month),
      };
    });
  }, [billingHistory, earningsSummary, weightedCommissionRate]);

  const payoutTrackingRows = useMemo(() => {
    const completedByArtist = new Map<string, number>();

    for (const payout of payoutRecords) {
      if (payout.status === 'completed') {
        completedByArtist.set(payout.artistId, (completedByArtist.get(payout.artistId) || 0) + payout.netPayout);
      }
    }

    return artistRows.map((artist) => {
      const completed = completedByArtist.get(artist.id) || 0;
      const pendingAmount = Math.max(artist.artistPayout - completed, 0);
      const nextPayoutDate = getNextPayoutDate(payoutSchedule);
      const hold = holdSettings[artist.id];
      const history = payoutRecords.filter((payout) => payout.artistId === artist.id);

      return {
        artist,
        pendingAmount,
        nextPayoutDate,
        hold,
        history,
      };
    });
  }, [artistRows, holdSettings, payoutRecords, payoutSchedule]);

  const bulkPayoutSummary = useMemo(() => {
    const selectedRows = payoutTrackingRows.filter((row) => selectedArtistIds.includes(row.artist.id));
    const eligibleRows = selectedRows.filter((row) => !row.hold?.onHold && row.pendingAmount >= paymentThreshold);

    return {
      selectedRows,
      eligibleRows,
      totalGross: eligibleRows.reduce((sum, row) => sum + row.artist.artistRevenue, 0),
      totalCommission: eligibleRows.reduce((sum, row) => sum + row.artist.labelCommission, 0),
      totalNet: eligibleRows.reduce((sum, row) => sum + row.pendingAmount, 0),
    };
  }, [paymentThreshold, payoutTrackingRows, selectedArtistIds]);

  function handleExportCsv() {
    if (artistRows.length === 0) {
      toast.error('No artist revenue data is available to export.');
      return;
    }

    downloadRevenueReportCsv(artistRows, paymentScheduleRows, totalArtistRevenue, totalLabelCommission, totalArtistPayout);
    toast.success('Artist revenue CSV exported.');
  }

  function handleExportPdf() {
    if (artistRows.length === 0) {
      toast.error('No artist revenue data is available to export.');
      return;
    }

    downloadRevenueReportPdf(
      artistRows,
      paymentScheduleRows,
      totalArtistRevenue,
      totalLabelCommission,
      totalArtistPayout,
      labelName,
    );
    toast.success('Artist revenue PDF exported.');
  }

  function getTrendBadgeClass(trend: 'rising' | 'steady' | 'cooling') {
    if (trend === 'rising') {
      return 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20';
    }

    if (trend === 'cooling') {
      return 'bg-red-500/10 text-red-200 border-red-500/20';
    }

    return 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20';
  }

  function updateArtistCommission(artistId: string, value: number) {
    setArtistCommissionSettings((current) => ({
      ...current,
      [artistId]: clamp(value, 0, 100),
    }));
  }

  function addPayoutMethod() {
    if (!methodForm.accountName.trim() || !methodForm.accountNumber.trim() || !methodForm.bankOrProvider.trim()) {
      toast.error('Complete payout method details before saving.');
      return;
    }

    const nextMethod: PayoutMethod = {
      id: crypto.randomUUID(),
      method: methodForm.method,
      accountName: methodForm.accountName.trim(),
      accountNumber: methodForm.accountNumber.trim(),
      bankOrProvider: methodForm.bankOrProvider.trim(),
      isDefault: payoutMethods.length === 0,
    };

    setPayoutMethods((current) => [...current, nextMethod]);
    setMethodForm({ method: 'bank-transfer', accountName: '', accountNumber: '', bankOrProvider: '' });
    toast.success('Payout method saved.');
  }

  function setDefaultMethod(methodId: string) {
    setPayoutMethods((current) => current.map((method) => ({ ...method, isDefault: method.id === methodId })));
  }

  function removeMethod(methodId: string) {
    setPayoutMethods((current) => {
      const filtered = current.filter((method) => method.id !== methodId);
      if (filtered.length > 0 && !filtered.some((method) => method.isDefault)) {
        filtered[0].isDefault = true;
      }
      return [...filtered];
    });
  }

  function triggerManualPayout(artistId: string) {
    const target = payoutTrackingRows.find((row) => row.artist.id === artistId);
    if (!target) {
      return;
    }

    if (target.hold?.onHold) {
      toast.error(`${target.artist.name} is currently on hold.`);
      return;
    }

    if (target.pendingAmount <= 0) {
      toast.error('No pending payout amount for this artist.');
      return;
    }

    const methodId = payoutMethods.find((method) => method.isDefault)?.id;
    const record: PayoutRecord = {
      id: crypto.randomUUID(),
      payoutDate: new Date().toISOString(),
      artistId: target.artist.id,
      artistName: target.artist.name,
      grossRevenue: target.artist.artistRevenue,
      commission: target.artist.labelCommission,
      netPayout: target.pendingAmount,
      status: 'pending',
      methodId,
    };

    setPayoutRecords((current) => [record, ...current]);
    toast.success(`Manual payout created for ${target.artist.name}.`);
  }

  function triggerBulkPayout() {
    if (bulkPayoutSummary.eligibleRows.length === 0) {
      toast.error('No eligible artists for bulk payout.');
      return;
    }

    const methodId = payoutMethods.find((method) => method.isDefault)?.id;
    const created = bulkPayoutSummary.eligibleRows.map((row) => ({
      id: crypto.randomUUID(),
      payoutDate: new Date().toISOString(),
      artistId: row.artist.id,
      artistName: row.artist.name,
      grossRevenue: row.artist.artistRevenue,
      commission: row.artist.labelCommission,
      netPayout: row.pendingAmount,
      status: 'pending' as const,
      methodId,
    }));

    setPayoutRecords((current) => [...created, ...current]);
    toast.success(`Generated ${created.length} payout request${created.length === 1 ? '' : 's'}.`);
  }

  function markPayoutCompleted(recordId: string) {
    setPayoutRecords((current) => current.map((record) => (
      record.id === recordId ? { ...record, status: 'completed' } : record
    )));
  }

  function toggleHold(artistId: string, artistName: string) {
    const current = holdSettings[artistId];
    if (current?.onHold) {
      setHoldSettings((previous) => ({
        ...previous,
        [artistId]: { onHold: false },
      }));
      toast.success(`${artistName} removed from hold.`);
      return;
    }

    const reason = window.prompt('Enter hold reason', 'Compliance review') || 'Compliance review';
    setHoldSettings((previous) => ({
      ...previous,
      [artistId]: {
        onHold: true,
        reason,
        holdDate: new Date().toISOString(),
      },
    }));
    toast.success(`${artistName} placed on hold.`);
  }

  function uploadTaxForm(artistId: string, formType: TaxFormType, fileName: string) {
    const item: ArtistTaxInfo = {
      formType,
      fileName,
      uploadedAt: new Date().toISOString(),
    };

    setTaxInfoByArtist((current) => ({
      ...current,
      [artistId]: [item, ...(current[artistId] || [])],
    }));
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">SplitShare Revenue Desk</h1>
          <p className="text-[#B3B3B3]">
            Commission math, payout planning, milestone tracking, and accounting exports for {labelName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportCsv} className="border-[#FF6B00]/20 text-white hover:bg-[#0A0A0A]">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPdf} className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#1DB954]/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#1DB954]" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1 text-white">{formatCurrency(totalArtistRevenue)}</div>
          <div className="text-sm text-[#B3B3B3]">Artist Revenue</div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center">
              <Percent className="w-6 h-6 text-[#FF6B00]" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1 text-white">{formatCurrency(totalLabelCommission)}</div>
          <div className="text-sm text-[#B3B3B3]">Label Commission</div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#FFD600]/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#FFD600]" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1 text-white">{formatCurrency(totalArtistPayout)}</div>
          <div className="text-sm text-[#B3B3B3]">Artist Payout</div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#3B82F6]" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1 text-white">{artistRows.length}</div>
          <div className="text-sm text-[#B3B3B3]">Tracked Artists</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Commission Calculator</h2>
              <p className="text-sm text-[#B3B3B3]">Artist revenue vs label commission vs net artist payout.</p>
            </div>
            <Badge className="bg-[#FF6B00]/10 text-[#FFD600] border-[#FF6B00]/20">
              Weighted label rate {labelCommissionPercent.toFixed(1)}%
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                <span>Artist Revenue</span>
                <span>{formatCurrency(totalArtistRevenue)}</span>
              </div>
              <div className="h-3 rounded-full bg-[#0A0A0A] overflow-hidden">
                <Progress value={100} className="h-3 bg-[#0A0A0A] [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#1DB954] [&_[data-slot=progress-indicator]]:to-[#34D399]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                <span>Label Commission</span>
                <span>{formatCurrency(totalLabelCommission)} ({labelCommissionPercent.toFixed(1)}%)</span>
              </div>
              <div className="h-3 rounded-full bg-[#0A0A0A] overflow-hidden">
                <Progress value={labelCommissionPercent} className="h-3 bg-[#0A0A0A] [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#FF6B00] [&_[data-slot=progress-indicator]]:to-[#FFD600]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[#B3B3B3]">
                <span>Artist Payout</span>
                <span>{formatCurrency(totalArtistPayout)} ({artistPayoutPercent.toFixed(1)}%)</span>
              </div>
              <div className="h-3 rounded-full bg-[#0A0A0A] overflow-hidden">
                <Progress value={artistPayoutPercent} className="h-3 bg-[#0A0A0A] [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#3B82F6] [&_[data-slot=progress-indicator]]:to-[#38BDF8]" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Next Month Projection</h2>
            <p className="text-sm text-[#B3B3B3]">Estimated from current monthly streams and trailing stream velocity.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3] mb-2">Current Streams</div>
              <div className="text-2xl font-semibold text-white">{formatCompactNumber(projection.currentStreams)}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3] mb-2">Projected Streams</div>
              <div className="text-2xl font-semibold text-white">{formatCompactNumber(projection.projectedStreams)}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3] mb-2">Projected Revenue</div>
              <div className="text-2xl font-semibold text-white">{formatCurrency(projection.projectedRevenue)}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B3B3B3] mb-2">Projected Label Cut</div>
              <div className="text-2xl font-semibold text-white">{formatCurrency(projection.projectedCommission)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-[#FF6B00]/10 bg-[#120D09] p-4 text-sm text-[#E5E7EB]">
            <div className="flex items-center gap-2 text-[#FFD600] mb-2">
              <ArrowUpRight className="w-4 h-4" />
              Stream velocity {projection.streamGrowthRate >= 0 ? '+' : ''}{(projection.streamGrowthRate * 100).toFixed(1)}%
            </div>
            <div>
              Current month revenue is {formatCurrency(projection.currentRevenue)} at {formatBillingCurrency(projection.revenuePerStream)} per stream.
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Earnings Timeline</h2>
            <p className="text-sm text-[#B3B3B3]">Milestone checkpoints from cumulative label-side artist earnings.</p>
          </div>

          <div className="space-y-4">
            {milestoneRows.map((row) => (
              <div key={row.target} className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="text-white font-medium">{formatCurrency(row.target)} milestone</div>
                    <div className="text-sm text-[#B3B3B3]">
                      {row.reachedAt ? `Reached ${formatMonthLabel(row.reachedAt)}` : 'In progress'}
                    </div>
                  </div>
                  <Badge className={row.complete ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' : 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20'}>
                    {row.complete ? 'Reached' : `${row.progressPercent.toFixed(0)}%`}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-[#161616] overflow-hidden">
                  <Progress value={row.progressPercent} className="h-2 bg-[#161616] [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[#FF6B00] [&_[data-slot=progress-indicator]]:to-[#FFD600]" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Artist Revenue Breakdown</h2>
              <p className="text-sm text-[#B3B3B3]">Saved contract commission rates applied to each artist revenue line.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search artist or email"
                className="pl-10 bg-[#0A0A0A] border-[#FF6B00]/20 text-white placeholder:text-[#B3B3B3]"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-5 text-[#B3B3B3]">Loading revenue distribution...</div>
            ) : errorMessage ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">{errorMessage}</div>
            ) : filteredArtistRows.length === 0 ? (
              <div className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-5 text-[#B3B3B3]">No artists match the current search.</div>
            ) : (
              filteredArtistRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{row.name}</h3>
                        <Badge className={row.status === 'active' ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' : 'bg-[#6B7280]/10 text-[#D1D5DB] border-[#6B7280]/20'}>
                          {row.status}
                        </Badge>
                        <Badge className={row.dataSource === 'live' ? 'bg-[#3B82F6]/10 text-[#93C5FD] border-[#3B82F6]/20' : 'bg-[#6B7280]/10 text-[#D1D5DB] border-[#6B7280]/20'}>
                          {row.dataSource === 'live' ? 'Label-uploaded royalties' : 'No label-uploaded data'}
                        </Badge>
                      </div>
                      <div className="text-sm text-[#B3B3B3]">{row.email}</div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-2xl font-semibold text-[#1DB954]">{formatCurrency(row.artistRevenue)}</div>
                      <div className="text-sm text-[#B3B3B3]">{formatCompactNumber(row.streams)} streams</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Commission Rate</div>
                      <div className="text-lg font-semibold text-white">{row.commissionRate}%</div>
                    </div>
                    <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Label Commission</div>
                      <div className="text-lg font-semibold text-white">{formatCurrency(row.labelCommission)}</div>
                    </div>
                    <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Artist Payout</div>
                      <div className="text-lg font-semibold text-white">{formatCurrency(row.artistPayout)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Top Songs By Streams</h2>
              <p className="text-sm text-[#B3B3B3]">Analytics-backed song performance across streaming platforms.</p>
            </div>
            <Badge className="bg-[#3B82F6]/10 text-[#93C5FD] border-[#3B82F6]/20">
              Top {catalogPerformance.topSongs.length}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                  <TableHead className="text-[#B3B3B3]">Song Name</TableHead>
                  <TableHead className="text-[#B3B3B3]">Platform</TableHead>
                  <TableHead className="text-[#B3B3B3]">Stream Count</TableHead>
                  <TableHead className="text-[#B3B3B3]">Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogPerformance.topSongs.length === 0 ? (
                  <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                    <TableCell colSpan={4} className="py-10 text-center text-[#B3B3B3]">
                      No song analytics are available yet.
                    </TableCell>
                  </TableRow>
                ) : catalogPerformance.topSongs.map((song) => (
                  <TableRow key={`${song.trackId || song.songName}-${song.platform}`} className="border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                    <TableCell className="text-white font-medium">{song.songName}</TableCell>
                    <TableCell>
                      <Badge className="bg-[#FF6B00]/10 text-[#FFD600] border-[#FF6B00]/20">{song.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-white">{formatCompactNumber(song.streams)}</TableCell>
                    <TableCell className="text-white">{formatCurrency(song.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Top Albums / EPs</h2>
              <p className="text-sm text-[#B3B3B3]">Release-level performance from uploaded catalog analytics.</p>
            </div>
            <Badge className="bg-[#FF6B00]/10 text-[#FFD600] border-[#FF6B00]/20">
              Ranked by streams
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                  <TableHead className="text-[#B3B3B3]">Release Name</TableHead>
                  <TableHead className="text-[#B3B3B3]">Stream Count</TableHead>
                  <TableHead className="text-[#B3B3B3]">Release Date</TableHead>
                  <TableHead className="text-[#B3B3B3]">Performance Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogPerformance.topReleases.length === 0 ? (
                  <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                    <TableCell colSpan={4} className="py-10 text-center text-[#B3B3B3]">
                      No album or EP analytics are available yet.
                    </TableCell>
                  </TableRow>
                ) : catalogPerformance.topReleases.map((release) => (
                  <TableRow key={release.releaseId} className="border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                    <TableCell className="text-white">
                      <div className="font-medium">{release.releaseName}</div>
                      <div className="text-xs text-[#B3B3B3] uppercase tracking-[0.16em]">{release.releaseType}</div>
                    </TableCell>
                    <TableCell className="text-white">{formatCompactNumber(release.streams)}</TableCell>
                    <TableCell className="text-white">{new Date(release.releaseDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getTrendBadgeClass(release.trend)}>
                        {release.trend}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Revenue Settings</h2>
            <p className="text-sm text-[#B3B3B3]">Commission by artist, payout threshold, and payout cycle controls.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Payment Threshold (NGN)</span>
              <Input
                type="number"
                min={0}
                value={paymentThreshold}
                onChange={(event) => setPaymentThreshold(Math.max(0, Number(event.target.value) || 0))}
                className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Payout Schedule</span>
              <select
                aria-label="Payout schedule"
                value={payoutSchedule}
                onChange={(event) => setPayoutSchedule(event.target.value as PayoutSchedule)}
                className="w-full h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Default Label Commission %</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={calculatorCommissionPercent}
                onChange={(event) => setCalculatorCommissionPercent(clamp(Number(event.target.value) || 0, 0, 100))}
                className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
              />
            </label>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {artistRows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_140px] items-center gap-3 rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-3 py-2">
                <div>
                  <div className="text-white font-medium">{row.name}</div>
                  <div className="text-xs text-[#B3B3B3]">{row.email}</div>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={artistCommissionSettings[row.id] ?? row.commissionRate}
                  onChange={(event) => updateArtistCommission(row.id, Number(event.target.value) || 0)}
                  className="bg-[#120D09] border-[#FF6B00]/20 text-white"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Revenue Split Calculator</h2>
            <p className="text-sm text-[#B3B3B3]">Label commission, artist payout, and optional admin fee mix.</p>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3]">Admin Fee % (if applicable)</span>
            <Input
              type="number"
              min={0}
              max={30}
              value={adminFeePercent}
              onChange={(event) => setAdminFeePercent(clamp(Number(event.target.value) || 0, 0, 30))}
              className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
            />
          </label>

          <div className="space-y-3">
            <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Label Commission %</div>
              <div className="text-2xl font-semibold text-white">{calculatorCommissionPercent.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Admin Fee %</div>
              <div className="text-2xl font-semibold text-white">{adminFeePercent.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#B3B3B3] mb-1">Artist Payout %</div>
              <div className="text-2xl font-semibold text-white">{Math.max(100 - calculatorCommissionPercent - adminFeePercent, 0).toFixed(1)}%</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Bulk Payout Generator</h2>
            <p className="text-sm text-[#B3B3B3]">Select artists and generate payouts in one action with summary totals.</p>
          </div>
          <Button onClick={triggerBulkPayout} className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white">
            Generate Bulk Payout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-[#B3B3B3] mb-1">Eligible Artists</div>
            <div className="text-2xl font-semibold text-white">{bulkPayoutSummary.eligibleRows.length}</div>
          </div>
          <div className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-[#B3B3B3] mb-1">Gross Revenue</div>
            <div className="text-2xl font-semibold text-white">{formatCurrency(bulkPayoutSummary.totalGross)}</div>
          </div>
          <div className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-[#B3B3B3] mb-1">Net Payout</div>
            <div className="text-2xl font-semibold text-white">{formatCurrency(bulkPayoutSummary.totalNet)}</div>
          </div>
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {payoutTrackingRows.map((row) => (
            <label key={row.artist.id} className="flex items-center justify-between rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-3 py-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedArtistIds.includes(row.artist.id)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedArtistIds((current) => (
                      checked ? [...current, row.artist.id] : current.filter((id) => id !== row.artist.id)
                    ));
                  }}
                />
                <div>
                  <div className="text-white font-medium">{row.artist.name}</div>
                  <div className="text-xs text-[#B3B3B3]">Pending {formatCurrency(row.pendingAmount)}</div>
                </div>
              </div>
              {row.hold?.onHold ? (
                <Badge className="bg-red-500/10 text-red-200 border-red-500/20">On hold</Badge>
              ) : row.pendingAmount >= paymentThreshold ? (
                <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20">Eligible</Badge>
              ) : (
                <Badge className="bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20">Below threshold</Badge>
              )}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Payout Method Management</h2>
            <p className="text-sm text-[#B3B3B3]">Store multiple Bank Transfer, PayPal, Wise, and Check accounts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              aria-label="Payout method type"
              value={methodForm.method}
              onChange={(event) => setMethodForm((current) => ({ ...current, method: event.target.value as PayoutMethodType }))}
              className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
            >
              <option value="bank-transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="wise">Wise</option>
              <option value="check">Check</option>
            </select>
            <Input
              value={methodForm.accountName}
              onChange={(event) => setMethodForm((current) => ({ ...current, accountName: event.target.value }))}
              placeholder="Account name"
              className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
            />
            <Input
              value={methodForm.accountNumber}
              onChange={(event) => setMethodForm((current) => ({ ...current, accountNumber: event.target.value }))}
              placeholder="Account number / handle"
              className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
            />
            <Input
              value={methodForm.bankOrProvider}
              onChange={(event) => setMethodForm((current) => ({ ...current, bankOrProvider: event.target.value }))}
              placeholder="Bank / Provider"
              className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
            />
          </div>

          <Button onClick={addPayoutMethod} variant="outline" className="border-[#FF6B00]/20 text-white hover:bg-[#0A0A0A]">
            Add Payout Method
          </Button>

          <div className="space-y-2">
            {payoutMethods.length === 0 ? (
              <div className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-3 py-3 text-[#B3B3B3]">No payout methods configured yet.</div>
            ) : payoutMethods.map((method) => (
              <div key={method.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] px-3 py-3">
                <div>
                  <div className="text-white font-medium">{method.method}</div>
                  <div className="text-xs text-[#B3B3B3]">{method.accountName} • {method.accountNumber} • {method.bankOrProvider}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDefaultMethod(method.id)} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">Default</Button>
                  <Button size="sm" variant="outline" onClick={() => removeMethod(method.id)} className="border-red-500/30 text-red-200 hover:bg-red-500/10">Remove</Button>
                  {method.isDefault && <Badge className="bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20">Default</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Payout Scheduling</h2>
            <p className="text-sm text-[#B3B3B3]">Configure automatic payouts by threshold or calendar date.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[#B3B3B3]">Auto Mode</span>
              <select
                aria-label="Automatic payout mode"
                value={autoPayoutMode}
                onChange={(event) => setAutoPayoutMode(event.target.value as AutoPayoutMode)}
                className="w-full h-10 rounded-md border border-[#FF6B00]/20 bg-[#0A0A0A] px-3 text-white"
              >
                <option value="threshold">Threshold Based</option>
                <option value="calendar">Calendar Date</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-[#B3B3B3]">Payout Day (Month)</span>
              <Input
                type="number"
                min={1}
                max={28}
                value={autoPayoutDay}
                onChange={(event) => setAutoPayoutDay(clamp(Number(event.target.value) || 1, 1, 28))}
                className="bg-[#0A0A0A] border-[#FF6B00]/20 text-white"
              />
            </label>
          </div>

          <div className="rounded-lg border border-[#FF6B00]/10 bg-[#120D09] p-4 text-sm text-[#E5E7EB]">
            Auto payouts are configured for <span className="text-white font-medium">{autoPayoutMode === 'threshold' ? `threshold ${formatCurrency(paymentThreshold)}` : `day ${autoPayoutDay}`}</span> on a <span className="text-white font-medium">{payoutSchedule}</span> schedule.
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Artist Payout Tracking</h2>
          <p className="text-sm text-[#B3B3B3]">Pending amount, next payout date, holds, tax info, and manual trigger per artist.</p>
        </div>

        <div className="space-y-3">
          {payoutTrackingRows.map((row) => (
            <div key={row.artist.id} className="rounded-lg border border-[#FF6B00]/10 bg-[#0A0A0A] p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{row.artist.name}</div>
                  <div className="text-xs text-[#B3B3B3]">Next payout {row.nextPayoutDate.toLocaleDateString()} • History {row.history.length}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#3B82F6]/10 text-[#93C5FD] border-[#3B82F6]/20">Pending {formatCurrency(row.pendingAmount)}</Badge>
                  {row.hold?.onHold ? <Badge className="bg-red-500/10 text-red-200 border-red-500/20">On hold</Badge> : null}
                  <Button size="sm" variant="outline" onClick={() => triggerManualPayout(row.artist.id)} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">Manual Payout</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleHold(row.artist.id, row.artist.name)} className="border-red-500/30 text-red-200 hover:bg-red-500/10">{row.hold?.onHold ? 'Release Hold' : 'Hold Funds'}</Button>
                </div>
              </div>

              {row.hold?.onHold ? (
                <div className="text-xs text-red-200">Hold reason: {row.hold.reason || 'N/A'} • Hold date: {row.hold.holdDate ? new Date(row.hold.holdDate).toLocaleDateString() : 'N/A'}</div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 items-center">
                <select
                  aria-label="Tax form type"
                  id={`tax-form-type-${row.artist.id}`}
                  defaultValue="W-9"
                  className="h-10 rounded-md border border-[#FF6B00]/20 bg-[#120D09] px-3 text-white"
                >
                  <option value="W-9">W-9</option>
                  <option value="1099">1099</option>
                  <option value="Other">Other</option>
                </select>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    const selectElement = document.getElementById(`tax-form-type-${row.artist.id}`) as HTMLSelectElement | null;
                    const selectedType = (selectElement?.value as TaxFormType) || 'W-9';
                    uploadTaxForm(row.artist.id, selectedType, file.name);
                    toast.success(`Tax file saved for ${row.artist.name}.`);
                    event.target.value = '';
                  }}
                  className="bg-[#120D09] border-[#FF6B00]/20 text-white file:text-white"
                />
              </div>

              {(taxInfoByArtist[row.artist.id] || []).length > 0 ? (
                <div className="space-y-1">
                  {(taxInfoByArtist[row.artist.id] || []).slice(0, 3).map((item, index) => (
                    <div key={`${item.fileName}-${index}`} className="text-xs text-[#B3B3B3]">
                      {item.formType} • {item.fileName} • {new Date(item.uploadedAt).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Payout History</h2>
          <p className="text-sm text-[#B3B3B3]">Payout date, artist, gross revenue, commission, net payout, and status.</p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                <TableHead className="text-[#B3B3B3]">Payout Date</TableHead>
                <TableHead className="text-[#B3B3B3]">Artist Name</TableHead>
                <TableHead className="text-[#B3B3B3]">Gross Revenue</TableHead>
                <TableHead className="text-[#B3B3B3]">Commission</TableHead>
                <TableHead className="text-[#B3B3B3]">Net Payout</TableHead>
                <TableHead className="text-[#B3B3B3]">Status</TableHead>
                <TableHead className="text-[#B3B3B3]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutRecords.length === 0 ? (
                <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                  <TableCell colSpan={7} className="py-10 text-center text-[#B3B3B3]">No payout records yet.</TableCell>
                </TableRow>
              ) : payoutRecords.map((record) => (
                <TableRow key={record.id} className="border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                  <TableCell className="text-white">{new Date(record.payoutDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-white">{record.artistName}</TableCell>
                  <TableCell className="text-white">{formatCurrency(record.grossRevenue)}</TableCell>
                  <TableCell className="text-white">{formatCurrency(record.commission)}</TableCell>
                  <TableCell className="text-white">{formatCurrency(record.netPayout)}</TableCell>
                  <TableCell>
                    <Badge className={record.status === 'completed' ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' : record.status === 'on-hold' ? 'bg-red-500/10 text-red-200 border-red-500/20' : 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20'}>
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.status !== 'completed' ? (
                      <Button size="sm" variant="outline" onClick={() => markPayoutCompleted(record.id)} className="border-[#FF6B00]/20 text-white hover:bg-[#120D09]">Mark Completed</Button>
                    ) : <span className="text-xs text-[#B3B3B3]">Settled</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-6 bg-[#161616] border-[#FF6B00]/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Payment History</h2>
            <p className="text-sm text-[#B3B3B3]">Monthly revenue, commission, and net payout schedule for accounting.</p>
          </div>
          <Badge className="bg-[#FF6B00]/10 text-[#FFD600] border-[#FF6B00]/20 w-fit">
            Last updated {earningsSummary ? new Date(earningsSummary.updatedAt).toLocaleDateString() : 'pending'}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                <TableHead className="text-[#B3B3B3]">Payment Date</TableHead>
                <TableHead className="text-[#B3B3B3]">Period</TableHead>
                <TableHead className="text-[#B3B3B3]">Artist Revenue</TableHead>
                <TableHead className="text-[#B3B3B3]">Label Commission</TableHead>
                <TableHead className="text-[#B3B3B3]">Net Payout</TableHead>
                <TableHead className="text-[#B3B3B3]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentScheduleRows.length === 0 ? (
                <TableRow className="border-[#FF6B00]/10 hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center text-[#B3B3B3]">
                    No payment schedule is available yet.
                  </TableCell>
                </TableRow>
              ) : paymentScheduleRows.map((row) => (
                <TableRow key={row.id} className="border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#B3B3B3]" />
                      {new Date(row.paymentDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-white">{row.periodLabel}</TableCell>
                  <TableCell className="text-white">{formatCurrency(row.artistRevenue)}</TableCell>
                  <TableCell className="text-white">{formatCurrency(row.labelCommission)}</TableCell>
                  <TableCell className="text-white">{formatCurrency(row.netPayout)}</TableCell>
                  <TableCell>
                    <Badge className={row.status === 'completed' ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' : 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-5 bg-[#120D09] border-[#FF6B00]/20 text-sm text-[#E5E7EB]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            Artist rows only include royalties tied to releases uploaded under this label account. Artist-side uploads are excluded.
          </div>
          <div className="text-[#B3B3B3]">
            Export files include both the artist revenue ledger and the payment schedule for accounting and tax review.
          </div>
        </div>
      </Card>
    </div>
  );
}
