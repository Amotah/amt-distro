import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MIN_PAYOUT_AMOUNT, RevenuePayoutDialog } from './RevenuePayoutDialog';
import { getBillingHistory, requestPayout, type BillingHistoryRecord } from '../../utils/payment-api';
import {
  downloadBillingReceiptPdf,
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
  ArrowUpRight,
  ArrowDownRight,
  Music,
  FileText,
  Filter,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data for earnings by month
const earningsMonthlyData = [
  { month: 'Jan', earnings: 45200, streams: 120000, payout: 42000 },
  { month: 'Feb', earnings: 52800, streams: 135000, payout: 48500 },
  { month: 'Mar', earnings: 48900, streams: 128000, payout: 45200 },
  { month: 'Apr', earnings: 61200, streams: 155000, payout: 58300 },
  { month: 'May', earnings: 75600, streams: 185000, payout: 72100 },
  { month: 'Jun', earnings: 82400, streams: 210000, payout: 78900 },
  { month: 'Jul', earnings: 89200, streams: 225000, payout: 85600 },
  { month: 'Aug', earnings: 95100, streams: 242000, payout: 91200 },
  { month: 'Sep', earnings: 87500, streams: 218000, payout: 83800 },
  { month: 'Oct', earnings: 102300, streams: 265000, payout: 98400 },
  { month: 'Nov', earnings: 118700, streams: 295000, payout: 114200 },
  { month: 'Dec', earnings: 134200, streams: 328000, payout: 129500 },
];

// Mock data for earnings by track
const earningsByTrack = [
  {
    id: 1,
    title: 'Summer Vibes',
    album: 'Summer Collection',
    totalEarnings: 142833,
    streams: 125400,
    avgPerStream: 1.14,
    change: '+12.5%',
    trending: 'up',
  },
  {
    id: 2,
    title: 'Electric Hearts',
    album: 'Electric Dreams',
    totalEarnings: 104268,
    streams: 89200,
    avgPerStream: 1.17,
    change: '+8.3%',
    trending: 'up',
  },
  {
    id: 3,
    title: 'Midnight Dreams',
    album: 'Night Sessions',
    totalEarnings: 78945,
    streams: 67800,
    avgPerStream: 1.16,
    change: '-2.1%',
    trending: 'down',
  },
  {
    id: 4,
    title: 'City Lights',
    album: 'Urban Tales',
    totalEarnings: 67234,
    streams: 58900,
    avgPerStream: 1.14,
    change: '+5.2%',
    trending: 'up',
  },
  {
    id: 5,
    title: 'Ocean Waves',
    album: 'Nature Sounds',
    totalEarnings: 54821,
    streams: 48200,
    avgPerStream: 1.14,
    change: '+3.7%',
    trending: 'up',
  },
];

// Mock data for platform earnings
const platformEarnings = [
  { name: 'Spotify', earnings: 456200, percentage: 42, color: '#1DB954' },
  { name: 'Apple Music', earnings: 325100, percentage: 30, color: '#FA243C' },
  { name: 'YouTube Music', earnings: 182400, percentage: 17, color: '#FF0000' },
  { name: 'Others', earnings: 119700, percentage: 11, color: '#9333EA' },
];

const platformColorClassMap: Record<string, string> = {
  Spotify: 'bg-[#1DB954]',
  'Apple Music': 'bg-[#FA243C]',
  'YouTube Music': 'bg-[#FF0000]',
  Others: 'bg-[#9333EA]',
};

export function ArtistEarnings() {
  const [timeRange, setTimeRange] = useState('12months');
  const [isDownloading, setIsDownloading] = useState(false);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [billingRangePreset, setBillingRangePreset] = useState<'all' | '30d' | '90d' | 'thisYear'>('all');
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isPayoutSubmitting, setIsPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState('');

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

  useEffect(() => {
    let active = true;

    async function loadBillingHistory() {
      try {
        const history = await getBillingHistory();
        if (active) {
          setBillingHistory(history);
        }
      } catch {
        if (active) {
          setBillingHistory([]);
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    loadBillingHistory();

    return () => {
      active = false;
    };
  }, []);

  const handleDownloadReport = (format: 'csv' | 'pdf') => {
    setIsDownloading(true);
    
    // Simulate download process
    setTimeout(() => {
      const fileName = `earnings-report-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'csv') {
        // Generate CSV content
        const headers = ['Track', 'Album', 'Total Earnings (₦)', 'Streams', 'Avg per Stream (₦)', 'Change'];
        const rows = earningsByTrack.map(track => [
          track.title,
          track.album,
          track.totalEarnings.toFixed(2),
          track.streams,
          track.avgPerStream.toFixed(2),
          track.change,
        ]);
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(',')),
        ].join('\n');
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // For PDF, show a message (in real implementation, you'd use a library like jsPDF)
        alert('PDF download would be implemented with jsPDF library');
      }
      
      setIsDownloading(false);
    }, 1000);
  };

  const totalEarnings = earningsByTrack.reduce((sum, track) => sum + track.totalEarnings, 0);
  const totalStreams = earningsByTrack.reduce((sum, track) => sum + track.streams, 0);
  const avgEarningsPerStream = totalEarnings / totalStreams;
  const monthlyGrowth = '+18.4%';
  const reservedPayoutTotal = billingHistory
    .filter((payment) => isPayoutHistoryRecord(payment) && payment.status !== 'failed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const availableBalance = Math.max(totalEarnings - reservedPayoutTotal, 0);
  const pendingPayoutTotal = billingHistory
    .filter((payment) => isPayoutHistoryRecord(payment) && payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const filteredBillingHistory = billingHistory.filter((payment) => {
    const rangeStart = getRangeStartDate(billingRangePreset);

    if (!rangeStart) {
      return true;
    }

    return new Date(getBillingPaymentDate(payment)) >= rangeStart;
  });
  const latestBillingPayment = filteredBillingHistory[0];

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
      setBillingHistory((current) => [result.request, ...current]);
      setIsPayoutDialogOpen(false);
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Failed to request payout');
    } finally {
      setIsPayoutSubmitting(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with Download Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
          <p className="text-[#B3B3B3]">Track your revenue and payment details</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsPayoutDialogOpen(true)}
            disabled={availableBalance < MIN_PAYOUT_AMOUNT}
            className="flex items-center gap-2"
            variant="outline"
          >
            <CreditCard className="w-4 h-4" />
            Request Payout
          </Button>
          <Button
            onClick={() => handleDownloadReport('csv')}
            disabled={isDownloading}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
          <Button
            onClick={() => handleDownloadReport('pdf')}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-green-600">{monthlyGrowth}</span>
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">₦{totalEarnings.toLocaleString()}</div>
          <div className="text-sm text-[#B3B3B3]">Total Earnings</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-green-600">+24.2%</span>
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">₦{earningsMonthlyData[earningsMonthlyData.length - 1].earnings.toLocaleString()}</div>
          <div className="text-sm text-[#B3B3B3]">This Month</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">₦{avgEarningsPerStream.toFixed(2)}</div>
          <div className="text-sm text-[#B3B3B3]">Avg per Stream</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Music className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold mb-1">{earningsByTrack.length}</div>
          <div className="text-sm text-[#B3B3B3]">Earning Tracks</div>
        </Card>

        <Card className="p-6 md:col-span-2 lg:col-span-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <div className="text-sm text-[#B3B3B3] mb-1">Available Earnings</div>
                  <div className="text-2xl font-semibold mb-1">₦{availableBalance.toLocaleString()}</div>
                  <div className="text-sm text-[#B3B3B3]">Minimum payout ₦50,000. Requests cannot exceed your available earnings and appear in Payment History immediately.</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#B3B3B3]">
                <span>Pending payouts: ₦{pendingPayoutTotal.toLocaleString()}</span>
                <span>Avg per stream: ₦{avgEarningsPerStream.toFixed(2)}</span>
                <span>
                  Latest activity: {latestBillingPayment ? `${latestBillingPayment.description} · ${new Date(getBillingPaymentDate(latestBillingPayment)).toLocaleDateString()}` : 'No activity yet'}
                </span>
              </div>
              {payoutError ? <p className="text-sm text-red-600">{payoutError}</p> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setIsPayoutDialogOpen(true)} disabled={availableBalance < MIN_PAYOUT_AMOUNT}>
                <CreditCard className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/payment-history">Open Payment History</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Earnings by Month Chart */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Earnings by Month</h3>
            <p className="text-sm text-[#B3B3B3]">Monthly revenue breakdown</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-[#FF6B00]/20 rounded-lg text-sm"
            title="Select earnings time range"
          >
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={earningsMonthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => `₦${value.toLocaleString()}`}
            />
            <Bar dataKey="earnings" fill="#9333EA" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platform Earnings Breakdown */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-xl font-semibold mb-6">Platform Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={platformEarnings}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="earnings"
              >
                {platformEarnings.map((entry) => (
                  <Cell key={`platform-earnings-${entry.name}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `₦${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-6">
            {platformEarnings.map((platform) => (
              <div key={platform.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${platformColorClassMap[platform.name]}`} />
                  <span className="text-sm">{platform.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">₦{platform.earnings.toLocaleString()}</div>
                  <div className="text-xs text-[#B3B3B3]">{platform.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Earnings Trend */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-xl font-semibold mb-6">Earnings Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => `₦${value.toLocaleString()}`}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#9333EA"
                strokeWidth={3}
                dot={{ fill: '#9333EA', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="payout"
                stroke="#1DB954"
                strokeWidth={2}
                dot={{ fill: '#1DB954', r: 3 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-sm text-[#B3B3B3]">Earnings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-sm text-[#B3B3B3]">Payout</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Recent Payment Activity</h3>
            <p className="text-sm text-[#B3B3B3]">Subscription charges and payout requests</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/payment-history">View all payments</Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
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

        {historyLoading ? (
          <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
            Loading payment history...
          </div>
        ) : filteredBillingHistory.length > 0 ? (
          <div className="space-y-3">
            {filteredBillingHistory.slice(0, 4).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-[#FF6B00]/20 p-4 hover:bg-[#0A0A0A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPayoutHistoryRecord(payment) ? 'bg-amber-100' : 'bg-green-100'}`}>
                    {isPayoutHistoryRecord(payment) ? <CreditCard className="w-5 h-5 text-amber-700" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
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
                    <div className={`font-semibold ${isPayoutHistoryRecord(payment) ? 'text-amber-700' : 'text-white'}`}>{formatBillingHistoryAmount(payment)}</div>
                    <div className="text-xs text-[#B3B3B3]">{new Date(getBillingPaymentDate(payment)).toLocaleDateString()}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(payment)}>
                    <Download className="w-4 h-4 mr-1" />
                    {isPayoutHistoryRecord(payment) ? 'Advice' : 'Receipt'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#FF6B00]/20 p-6 text-sm text-[#B3B3B3]">
            No payment activity for this range.
          </div>
        )}
      </Card>

      <RevenuePayoutDialog
        open={isPayoutDialogOpen}
        onOpenChange={setIsPayoutDialogOpen}
        availableBalance={availableBalance}
        isSubmitting={isPayoutSubmitting}
        onSubmit={handleRequestPayout}
      />

      {/* Earnings by Track Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold mb-1">Earnings by Track</h3>
            <p className="text-sm text-[#B3B3B3]">Detailed breakdown by song</p>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#FF6B00]/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Track
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Album
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Total Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Streams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Avg/Stream
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#B3B3B3] uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FF6B00]/10">
              {earningsByTrack.map((track) => (
                <tr key={track.id} className="hover:bg-[#0A0A0A]">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{track.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#B3B3B3]">{track.album}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-green-600">
                      ₦{track.totalEarnings.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">
                      {track.streams.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-white">₦{track.avgPerStream.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        track.trending === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {track.trending === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {track.change}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
