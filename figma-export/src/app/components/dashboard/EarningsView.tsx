import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MIN_PAYOUT_AMOUNT, RevenuePayoutDialog } from './RevenuePayoutDialog';
import {
  getBillingHistory,
  getLabelArtistEarningsSummary,
  getRoyaltyBalance,
  getRoyaltyEarningsSummary,
  requestPayout,
  type BillingHistoryRecord,
  type LabelArtistEarningsSummary,
  type RoyaltyBalance,
  type RoyaltyEarningsStats,
  type RoyaltyMonthlyTrendPoint,
} from '../../utils/payment-api';
import {
  downloadBillingReceiptPdf,
  downloadBillingStatementCsv,
  formatBillingHistoryAmount,
  getBillingCounterpartyDetails,
  getBillingPaymentDate,
  isPayoutHistoryRecord,
} from '../../utils/billing-downloads';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Users,
  Music,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const platformColorClassMap: Record<string, string> = {
  Spotify: 'bg-[#1DB954]',
  'Apple Music': 'bg-[#FA243C]',
  'YouTube Music': 'bg-[#FF0000]',
  'Amazon Music': 'bg-[#FF9900]',
  Others: 'bg-[#9333EA]',
};

function formatMonthLabel(value: string) {
  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getNextPayoutDateLabel() {
  const now = new Date();
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth(), 15);

  if (now.getDate() >= 15) {
    nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
  }

  return nextPayoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getColorClass(platform: string) {
  return platformColorClassMap[platform] || 'bg-[#6366F1]';
}

export function EarningsView() {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const paymentHistoryPath = isLabelDashboard ? '/label-dashboard/payment-history' : '/dashboard/payment-history';
  const [timeRange, setTimeRange] = useState('6months');
  const [paymentHistory, setPaymentHistory] = useState<BillingHistoryRecord[]>([]);
  const [royaltyBalance, setRoyaltyBalance] = useState<RoyaltyBalance | null>(null);
  const [royaltyStats, setRoyaltyStats] = useState<RoyaltyEarningsStats | null>(null);
  const [labelEarningsSummary, setLabelEarningsSummary] = useState<LabelArtistEarningsSummary | null>(null);
  const [labelSummaryLoading, setLabelSummaryLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [billingRangePreset, setBillingRangePreset] = useState<'all' | '30d' | '90d' | 'thisYear'>('all');
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isPayoutSubmitting, setIsPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const totalRevenue = isLabelDashboard ? labelEarningsSummary?.totalArtistEarnings || 0 : royaltyBalance?.totalEarnings || 0;
  const baseAvailableBalance = isLabelDashboard ? labelEarningsSummary?.availableArtistBalance || 0 : royaltyBalance?.availableBalance || 0;

  function getRangeStartDate(preset: 'all' | '30d' | '90d' | 'thisYear') {
    const now = new Date();

    if (preset === 'all') {
      return null;
    }

    if (preset === 'thisYear') {
      return new Date(now.getFullYear(), 0, 1);
    }

    const start = new Date(now);
    start.setDate(start.getDate() - (preset === '30d' ? 30 : 90));
    return start;
  }

  const filteredPaymentHistory = paymentHistory.filter((payment) => {
    const rangeStart = getRangeStartDate(billingRangePreset);

    if (!rangeStart) {
      return true;
    }

    return new Date(getBillingPaymentDate(payment)) >= rangeStart;
  });
  const reservedPayoutTotal = paymentHistory
    .filter((payment) => isPayoutHistoryRecord(payment) && payment.status !== 'failed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const availableBalance = Math.max(baseAvailableBalance - reservedPayoutTotal, 0);
  const pendingPayoutTotal = paymentHistory
    .filter((payment) => isPayoutHistoryRecord(payment) && payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);

  function handleDownloadStatement() {
    downloadBillingStatementCsv(filteredPaymentHistory, `billing-history-${billingRangePreset}.csv`);
  }

  function handleDownloadReceipt(payment: BillingHistoryRecord) {
    downloadBillingReceiptPdf(payment);
  }

  async function handleRequestPayout(input: { amount: number; payoutAccount: { accountName: string; accountNumber: string; bankName: string } }) {
    try {
      setIsPayoutSubmitting(true);
      setPayoutError('');
      const result = await requestPayout({
        amount: input.amount,
        accountName: input.payoutAccount.accountName,
        accountNumber: input.payoutAccount.accountNumber,
        bankName: input.payoutAccount.bankName,
      });
      setPaymentHistory((current) => [result.request, ...current]);
      setIsPayoutDialogOpen(false);
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Failed to request payout');
    } finally {
      setIsPayoutSubmitting(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const [history, summary, balance, royaltySummary] = await Promise.all([
          getBillingHistory(),
          isLabelDashboard ? getLabelArtistEarningsSummary().catch(() => null) : Promise.resolve(null),
          isLabelDashboard ? Promise.resolve(null) : getRoyaltyBalance().catch(() => null),
          isLabelDashboard ? Promise.resolve(null) : getRoyaltyEarningsSummary().catch(() => null),
        ]);
        if (active) {
          setPaymentHistory(history);
          setLabelEarningsSummary(summary);
          setRoyaltyBalance(balance);
          setRoyaltyStats(royaltySummary?.stats || null);
        }
      } catch {
        if (active) {
          setPaymentHistory([]);
          setLabelEarningsSummary(null);
          setRoyaltyBalance(null);
          setRoyaltyStats(null);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  async function refreshLabelSummary() {
    if (!isLabelDashboard) {
      return;
    }

    try {
      setLabelSummaryLoading(true);
      const summary = await getLabelArtistEarningsSummary();
      setLabelEarningsSummary(summary);
    } finally {
      setLabelSummaryLoading(false);
    }
  }

  const activeStats = isLabelDashboard
    ? {
        totalStreams: labelEarningsSummary?.totalArtistStreams || 0,
        totalRevenue: labelEarningsSummary?.totalArtistEarnings || 0,
        platformBreakdown: labelEarningsSummary?.platformBreakdown || {},
        monthlyTrend: labelEarningsSummary?.monthlyTrend || [],
      }
    : royaltyStats || { totalStreams: 0, totalRevenue: 0, platformBreakdown: {}, monthlyTrend: [] };

  const labelThisMonthEstimate = useMemo(() => {
    if (!isLabelDashboard || !labelEarningsSummary) {
      const latestPoint = royaltyStats?.monthlyTrend.at(-1);
      return latestPoint?.revenue || 0;
    }

    const latestPoint = labelEarningsSummary.monthlyTrend.at(-1);
    return latestPoint?.revenue || 0;
  }, [isLabelDashboard, labelEarningsSummary, royaltyStats]);

  const filteredTrend = useMemo(() => {
    const allPoints = activeStats.monthlyTrend.slice();
    if (timeRange === 'all') {
      return allPoints;
    }

    const limit = timeRange === 'year' ? 12 : 6;
    return allPoints.slice(-limit);
  }, [activeStats.monthlyTrend, timeRange]);

  const chartData = useMemo(() => {
    return filteredTrend.map((point: RoyaltyMonthlyTrendPoint) => ({
      ...point,
      label: formatMonthLabel(point.month),
    }));
  }, [filteredTrend]);

  const platformEarnings = useMemo(() => {
    const entries = Object.entries(activeStats.platformBreakdown)
      .map(([platform, values]) => ({
        platform,
        amount: values.revenue,
        streams: values.streams,
      }))
      .sort((left, right) => right.amount - left.amount);

    const totalPlatformRevenue = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return entries.map((entry) => ({
      ...entry,
      percentage: totalPlatformRevenue > 0 ? (entry.amount / totalPlatformRevenue) * 100 : 0,
    }));
  }, [activeStats.platformBreakdown]);

  const summaryMetrics = [
    {
      label: 'Total Earnings',
      value: `₦${totalRevenue.toLocaleString()}`,
      change: isLabelDashboard ? `${labelEarningsSummary?.artistCount || 0} artists` : '+24.8%',
      icon: DollarSign,
      color: 'green',
      description: isLabelDashboard ? 'Live royalty total across managed artists' : 'All time earnings',
    },
    {
      label: 'Current Balance',
      value: `₦${availableBalance.toLocaleString()}`,
      change: 'Available',
      icon: CreditCard,
      color: 'blue',
      description: isLabelDashboard
        ? `₦${(labelEarningsSummary?.pendingArtistBalance || 0).toLocaleString()} pending royalty approval`
        : `₦${(royaltyBalance?.pendingBalance || 0).toLocaleString()} pending royalty approval`,
    },
    {
      label: 'This Month',
      value: `₦${labelThisMonthEstimate.toLocaleString()}`,
      change: isLabelDashboard ? 'Royalty trend' : `${(royaltyStats?.monthlyTrend.at(-1)?.streams || 0).toLocaleString()} streams`,
      icon: TrendingUp,
      color: 'purple',
      description: isLabelDashboard ? 'Latest aggregated royalty month' : 'Latest royalty reporting month',
    },
    {
      label: 'Next Payout',
      value: `₦${availableBalance.toLocaleString()}`,
      change: getNextPayoutDateLabel(),
      icon: Clock,
      color: 'pink',
      description: 'Estimated payout amount on schedule',
    },
    {
      label: 'Total Streams',
      value: activeStats.totalStreams.toLocaleString(),
      change: isLabelDashboard ? `${labelEarningsSummary?.artistCount || 0} artists` : 'Uploaded royalty reports',
      icon: Music,
      color: 'green',
      description: 'Streams tracked from uploaded royalty reports',
    },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="mb-2 text-3xl font-semibold text-white">Earnings & Royalties</h2>
          <p className="text-[#B3B3B3]">Track your revenue and payment history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleDownloadStatement} className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#161616]">
            <Download className="w-4 h-4 mr-2" />
            Download Statement
          </Button>
          <Button size="sm" onClick={() => setIsPayoutDialogOpen(true)} disabled={availableBalance < MIN_PAYOUT_AMOUNT} className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
            <CreditCard className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </div>
      </div>
      {payoutError ? <p className="text-sm text-red-300">{payoutError}</p> : null}

      {isLabelDashboard ? (
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[#FFD9BF]">
                <Users className="h-3.5 w-3.5 text-[#FFD600]" />
                Artist earnings total
              </div>
              <h3 className="mt-4 text-3xl font-semibold text-white">₦{(labelEarningsSummary?.totalArtistEarnings || 0).toLocaleString()}</h3>
              <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
                Live total royalties across your managed artists. This summary is derived from the same royalty balances and earnings records used by the royalties flow.
              </p>
              <div className="mt-3 text-xs text-[#888]">
                {labelEarningsSummary?.updatedAt
                  ? `Updated ${new Date(labelEarningsSummary.updatedAt).toLocaleString()}`
                  : 'No royalty activity recorded yet.'}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={refreshLabelSummary} disabled={labelSummaryLoading} className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
              <RefreshCw className={`mr-2 h-4 w-4 ${labelSummaryLoading ? 'animate-spin' : ''}`} />
              Refresh Totals
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Managed Artists</div>
              <div className="mt-2 text-2xl font-semibold text-white">{labelEarningsSummary?.artistCount || 0}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Available Royalties</div>
              <div className="mt-2 text-2xl font-semibold text-white">₦{(labelEarningsSummary?.availableArtistBalance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Pending Royalties</div>
              <div className="mt-2 text-2xl font-semibold text-white">₦{(labelEarningsSummary?.pendingArtistBalance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#888]">Artist Streams</div>
              <div className="mt-2 text-2xl font-semibold text-white">{(labelEarningsSummary?.totalArtistStreams || 0).toLocaleString()}</div>
            </div>
          </div>
          {labelEarningsSummary && labelEarningsSummary.topArtists.length > 0 ? (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {labelEarningsSummary.topArtists.map((artist) => (
                <div key={artist.artistId} className="rounded-xl border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{artist.artistName}</div>
                      <div className="mt-1 text-xs text-[#B3B3B3]">{artist.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">₦{artist.totalEarnings.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-[#B3B3B3]">{artist.totalStreams.toLocaleString()} streams</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryMetrics.map((metric) => {
          const Icon = metric.icon;
          const iconColors = {
            green: 'text-green-600',
            blue: 'text-blue-600',
            purple: 'text-[#FF6B00]',
            pink: 'text-[#FFD600]',
          };
          const bgColors = {
            green: 'bg-green-500/12',
            blue: 'bg-blue-500/12',
            purple: 'bg-[#FF6B00]/12',
            pink: 'bg-[#FFD600]/12',
          };

          return (
            <Card key={metric.label} className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${bgColors[metric.color as keyof typeof bgColors]} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${iconColors[metric.color as keyof typeof iconColors]}`} />
                </div>
              </div>
              <div className="text-3xl font-semibold mb-1">{metric.value}</div>
              <div className="mb-1 text-sm text-white">{metric.label}</div>
              <div className="text-xs text-[#B3B3B3]">{metric.description}</div>
            </Card>
          );
        })}
      </div>

      {/* Earnings Chart */}
      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-1">Royalty Trend</h3>
            <p className="text-sm text-[#B3B3B3]">Revenue from uploaded royalty reports over time</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white"
            title="Select earnings time range"
          >
            <option value="6months">Last 6 months</option>
            <option value="year">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#B3B3B3" fontSize={12} />
              <YAxis stroke="#B3B3B3" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161616',
                  border: '1px solid rgba(255,107,0,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={(value: number, name: string) => name === 'streams' ? value.toLocaleString() : `₦${value.toLocaleString()}`}
              />
              <Area type="monotone" dataKey="revenue" stroke="#FF6B00" fill="#FF6B00" fillOpacity={0.18} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
            No royalty trend data is available yet. Upload and process royalty reports from admin to populate this chart.
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Platform Earnings */}
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <h3 className="text-xl font-semibold mb-6">Earnings by Platform</h3>
          {platformEarnings.length > 0 ? (
            <div className="space-y-4">
              {platformEarnings.map((platform) => (
                <div key={platform.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(platform.platform)}`} />
                      <span className="font-medium">{platform.platform}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₦{platform.amount.toLocaleString()}</div>
                      <div className="text-xs text-[#B3B3B3]">{platform.streams.toLocaleString()} streams</div>
                    </div>
                  </div>
                    <progress
                      max={100}
                      value={Math.max(platform.percentage, 4)}
                      className={`h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:${isLabelDashboard ? 'bg-[#161616]/10' : 'bg-[#161616]/10'} [&::-webkit-progress-value]:${getColorClass(platform.platform)} [&::-moz-progress-bar]:${getColorClass(platform.platform)}`}
                      title={`${platform.platform} revenue share`}
                    />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
              No platform royalty breakdown is available yet.
            </div>
          )}

          <div className="mt-6 rounded-lg bg-[#FF6B00]/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#FF6B00]" />
              <div>
                <p className="mb-1 text-sm font-medium text-white">
                  100% Royalty Retention
                </p>
                <p className="text-sm text-[#FFD9BF]">
                  You keep all your earnings. No hidden fees or commissions.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment History */}
        <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
          <div className="mb-6 flex flex-col gap-4">
            <h3 className="text-xl font-semibold">Payment History</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant={billingRangePreset === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBillingRangePreset('all')}>
                All
              </Button>
              <Button variant={billingRangePreset === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setBillingRangePreset('30d')}>
                Last 30 Days
              </Button>
              <Button variant={billingRangePreset === '90d' ? 'default' : 'outline'} size="sm" onClick={() => setBillingRangePreset('90d')}>
                Last 90 Days
              </Button>
              <Button variant={billingRangePreset === 'thisYear' ? 'default' : 'outline'} size="sm" onClick={() => setBillingRangePreset('thisYear')}>
                This Year
              </Button>
            </div>
          </div>
          {historyLoading ? (
            <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
              Loading payment history...
            </div>
          ) : filteredPaymentHistory.length > 0 ? (
            <div className="space-y-3">
              {filteredPaymentHistory.slice(0, 6).map((payment) => {
                const paymentDate = getBillingPaymentDate(payment);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-4 transition-colors hover:bg-[#161616]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/12">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">{payment.description}</div>
                        <div className="text-sm text-[#B3B3B3]">
                          {payment.method} · {payment.reference}
                          {getBillingCounterpartyDetails(payment) ? ` · ${getBillingCounterpartyDetails(payment)}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-semibold ${isPayoutHistoryRecord(payment) ? 'text-amber-200' : 'text-white'}`}>{formatBillingHistoryAmount(payment)}</div>
                        <div className="text-xs text-[#B3B3B3]">{new Date(paymentDate).toLocaleDateString()}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(payment)} className="text-[#FF6B00] hover:bg-[#161616] hover:text-[#ff7f26]">
                        <Download className="w-4 h-4 mr-1" />
                        {isPayoutHistoryRecord(payment) ? 'Advice' : 'Receipt'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
              No payment history for this range.
            </div>
          )}
          <Button asChild variant="outline" className="mt-4 w-full border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
            <Link to={paymentHistoryPath}>View All Payments</Link>
          </Button>
        </Card>
      </div>

      <RevenuePayoutDialog
        open={isPayoutDialogOpen}
        onOpenChange={setIsPayoutDialogOpen}
        availableBalance={availableBalance}
        isSubmitting={isPayoutSubmitting}
        onSubmit={handleRequestPayout}
      />

      {/* Payout Information */}
      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF6B00]/12">
            <Calendar className="w-6 h-6 text-[#FF6B00]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Payout Schedule</h3>
            <p className="mb-4 text-[#B3B3B3]">
              Payments are processed monthly on the 15th. Your earnings are calculated based on
              streams from two months prior (industry standard reporting delay).
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3">
                <div className="mb-1 text-sm text-[#B3B3B3]">Minimum Payout</div>
                <div className="text-lg font-semibold">₦50,000</div>
              </div>
              <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3">
                <div className="mb-1 text-sm text-[#B3B3B3]">Processing Time</div>
                <div className="text-lg font-semibold">3-5 days</div>
              </div>
              <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A]/60 p-3">
                <div className="mb-1 text-sm text-[#B3B3B3]">Payment Method</div>
                <div className="text-lg font-semibold">Bank Transfer</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}