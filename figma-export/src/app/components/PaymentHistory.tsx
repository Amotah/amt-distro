import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { getBillingHistory, type BillingHistoryRecord } from '../utils/payment-api';
import { DisputeForm } from './DisputeForm';
import {
  downloadBillingReceiptPdf,
  downloadBillingStatementPdf,
  downloadBillingStatementCsv,
  formatBillingCurrency,
  formatBillingHistoryAmount,
  getBillingPaymentDate,
  getBillingPlanLabel,
  isPayoutHistoryRecord,
} from '../utils/billing-downloads';
import {
  ArrowLeft,
  Search,
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  AlertTriangle,
} from 'lucide-react';

interface PaymentHistoryProps {
  onBack: () => void;
}

function formatPaymentPeriod(payment: BillingHistoryRecord) {
  return new Date(getBillingPaymentDate(payment)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getPaymentStatusLabel(payment: BillingHistoryRecord) {
  if (payment.status === 'pending') {
    return 'Pending';
  }

  return payment.status === 'completed'
    ? (isPayoutHistoryRecord(payment) ? 'Requested' : 'Paid')
    : 'Failed';
}

function getPaymentStatusClassName(payment: BillingHistoryRecord) {
  if (payment.status === 'pending') {
    return 'bg-amber-100 text-amber-700';
  }

  return payment.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';
}

export function PaymentHistory({ onBack }: PaymentHistoryProps) {
  const location = useLocation();
  const isLabelDashboard = location.pathname.startsWith('/label-dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'all' | '30d' | '90d' | 'thisYear' | 'custom'>('all');
  const [allPayments, setAllPayments] = useState<BillingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputePayment, setDisputePayment] = useState<BillingHistoryRecord | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPayments() {
      try {
        const history = await getBillingHistory();
        if (active) {
          setAllPayments(history);
        }
      } catch {
        if (active) {
          setAllPayments([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(allPayments.map((payment) => String(new Date(getBillingPaymentDate(payment)).getFullYear()))));
    return years.sort((left, right) => Number(right) - Number(left));
  }, [allPayments]);

  const filteredPayments = allPayments.filter((payment) => {
    const paymentDate = getBillingPaymentDate(payment);
    const paymentDateValue = new Date(paymentDate);
    const paymentYear = String(new Date(paymentDate).getFullYear());
    const paymentPeriod = formatPaymentPeriod(payment);
    const matchesSearch =
      paymentPeriod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || paymentYear === selectedYear;
    const matchesStartDate = !startDate || paymentDateValue >= new Date(`${startDate}T00:00:00`);
    const matchesEndDate = !endDate || paymentDateValue <= new Date(`${endDate}T23:59:59`);
    return matchesSearch && matchesYear && matchesStartDate && matchesEndDate;
  });

  const completedSubscriptions = filteredPayments.filter((payment) => !isPayoutHistoryRecord(payment) && payment.status === 'completed');
  const payoutRequests = filteredPayments.filter((payment) => isPayoutHistoryRecord(payment) && payment.status !== 'failed');
  const totalSubscriptionCharges = completedSubscriptions.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPayoutRequests = payoutRequests.reduce((sum, payment) => sum + payment.amount, 0);
  const latestActivity = filteredPayments[0];

  const handleDownloadStatement = () => {
    const yearLabel = selectedYear === 'all' ? 'all' : selectedYear;
    const rangeSuffix = startDate || endDate ? `-${startDate || 'start'}-to-${endDate || 'end'}` : '';
    downloadBillingStatementCsv(filteredPayments, `billing-statement-${yearLabel}${rangeSuffix}.csv`);
  };

  const handleDownloadPdfStatement = () => {
    const yearLabel = selectedYear === 'all' ? 'all' : selectedYear;
    const rangeSuffix = startDate || endDate ? `-${startDate || 'start'}-to-${endDate || 'end'}` : '';
    downloadBillingStatementPdf(filteredPayments, `billing-statement-${yearLabel}${rangeSuffix}.pdf`);
  };

  const handleDownloadReceipt = (payment: BillingHistoryRecord) => {
    downloadBillingReceiptPdf(payment);
  };

  const hasDateRange = Boolean(startDate || endDate);

  const applyPresetRange = (preset: 'all' | '30d' | '90d' | 'thisYear') => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setSelectedPreset('all');
      return;
    }

    if (preset === 'thisYear') {
      const yearStart = `${now.getFullYear()}-01-01`;
      setStartDate(yearStart);
      setEndDate(today);
      setSelectedPreset('thisYear');
      return;
    }

    const days = preset === '30d' ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(today);
    setSelectedPreset(preset);
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedPreset('all');
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedPreset('custom');
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedPreset('custom');
  };

  const pageClassName = 'min-h-screen bg-[#0A0A0A] px-4 py-8 sm:px-6 lg:px-8';
  const summaryCardClassName = 'border-[#FF6B00]/20 bg-[#161616] p-6 text-white';
  const filterCardClassName = 'mb-6 border-[#FF6B00]/20 bg-[#161616] p-6 text-white';
  const tableCardClassName = 'overflow-hidden border-[#FF6B00]/20 bg-[#161616] text-white';

  function getStatusBadgeClassName(payment: BillingHistoryRecord) {
    if (payment.status === 'pending') {
      return 'bg-amber-500/15 text-amber-100 border border-amber-500/30';
    }

    return payment.status === 'completed'
      ? 'bg-green-500/15 text-green-100 border border-green-500/30'
      : 'bg-red-500/15 text-red-100 border border-red-500/30';
  }

  // A payment is disputable if it failed (debit without value) or completed (possible duplicate)
  function isDisputable(payment: BillingHistoryRecord) {
    return !isPayoutHistoryRecord(payment) && (payment.status === 'failed' || payment.status === 'completed');
  }

  return (
    <>
    {disputePayment && (
      <DisputeForm
        payment={disputePayment}
        onClose={() => setDisputePayment(null)}
        onSuccess={() => setDisputePayment(null)}
      />
    )}
    <section className={pageClassName}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 text-[#B3B3B3] hover:bg-[#161616] hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Earnings
          </Button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl mb-2 text-white">Payment History</h1>
              <p className="text-[#B3B3B3]">View your subscription charges, payout requests, and download statements</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownloadStatement} className="gap-2 border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#161616]" variant="outline">
                <Download className="w-5 h-5" />
                Download CSV Statement
              </Button>
              <Button onClick={handleDownloadPdfStatement} className="gap-2 bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
                <FileText className="w-5 h-5" />
                Download PDF Statement
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className={summaryCardClassName}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#B3B3B3]">Subscription Charges</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl mb-1">₦{totalSubscriptionCharges.toLocaleString()}</div>
            <div className="text-sm text-[#B3B3B3]">{completedSubscriptions.length} completed subscription payments</div>
          </Card>

          <Card className={summaryCardClassName}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#B3B3B3]">Payout Requests</div>
              <Calendar className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div className="text-3xl mb-1">₦{totalPayoutRequests.toLocaleString()}</div>
            <div className="text-sm text-[#B3B3B3]">{payoutRequests.length} payout requests</div>
          </Card>

          <Card className={summaryCardClassName}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#B3B3B3]">Last Activity</div>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl mb-1">
              {latestActivity ? formatBillingHistoryAmount(latestActivity) : '₦0'}
            </div>
            <div className="text-sm text-[#B3B3B3]">
              {latestActivity
                ? `${getBillingPlanLabel(latestActivity)} · ${new Date(getBillingPaymentDate(latestActivity)).toLocaleDateString()}`
                : 'N/A'}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className={filterCardClassName}>
          <div className="flex flex-col gap-4 xl:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
              <Input
                type="text"
                placeholder="Search by period, description, or reference..."
                className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
              <div className="flex flex-wrap gap-2">
                <Button variant={selectedPreset === 'all' ? 'default' : 'outline'} size="sm" onClick={() => applyPresetRange('all')} className={selectedPreset !== 'all' ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]'}>
                  All
                </Button>
                <Button variant={selectedPreset === '30d' ? 'default' : 'outline'} size="sm" onClick={() => applyPresetRange('30d')} className={selectedPreset !== '30d' ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]'}>
                  Last 30 Days
                </Button>
                <Button variant={selectedPreset === '90d' ? 'default' : 'outline'} size="sm" onClick={() => applyPresetRange('90d')} className={selectedPreset !== '90d' ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]'}>
                  Last 90 Days
                </Button>
                <Button variant={selectedPreset === 'thisYear' ? 'default' : 'outline'} size="sm" onClick={() => applyPresetRange('thisYear')} className={selectedPreset !== 'thisYear' ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : 'bg-[#FF6B00] text-white hover:bg-[#ff7f26]'}>
                  This Year
                </Button>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
                title="Filter payment history by year"
              >
                <option value="all">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                aria-label="Filter payments from date"
                title="Filter payments from date"
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white md:w-auto"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                aria-label="Filter payments to date"
                title="Filter payments to date"
                className="border-[#FF6B00]/20 bg-[#0A0A0A] text-white md:w-auto"
              />
              <Button variant="outline" className="gap-2 border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]" onClick={clearDateFilters} disabled={!hasDateRange}>
                <Filter className="w-5 h-5" />
                Clear Dates
              </Button>
            </div>
          </div>
        </Card>

        {/* Payment Table */}
        <Card className={tableCardClassName}>
          {loading ? (
            <div className="py-12 text-center text-[#B3B3B3]">Loading payment history...</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#FF6B00]/15 bg-[#0A0A0A]">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Period</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Reference</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Amount</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Type</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Payment Date</th>
                  <th className="text-left py-4 px-6 font-medium text-[#B3B3B3]">Status</th>
                  <th className="text-right py-4 px-6 font-medium text-[#B3B3B3]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#FF6B00]/10 hover:bg-[#0A0A0A]">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#666]" />
                        <div>
                          <div className="font-medium text-white">{formatPaymentPeriod(payment)}</div>
                          <div className="text-xs text-[#888]">{payment.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="rounded bg-[#0A0A0A] px-2 py-1 text-xs text-[#FFD9BF]">
                        {payment.reference}
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-medium text-lg ${isPayoutHistoryRecord(payment) ? 'text-amber-200' : 'text-white'}`}>{formatBillingHistoryAmount(payment)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#B3B3B3]">{getBillingPlanLabel(payment)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[#B3B3B3]">
                        {new Date(getBillingPaymentDate(payment)).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getStatusBadgeClassName(payment)}>
                        {payment.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        {getPaymentStatusLabel(payment)}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment)}
                          className="text-[#FF6B00] hover:bg-[#0A0A0A] hover:text-[#ff7f26]"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {isPayoutHistoryRecord(payment) ? 'Advice' : 'Receipt'}
                        </Button>
                        {isDisputable(payment) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDisputePayment(payment)}
                            className="text-red-400 hover:bg-[#0A0A0A] hover:text-red-300"
                            title="Dispute this transaction"
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Dispute
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {!loading && filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-[#666]" />
              <h3 className="text-xl mb-2 text-white">No payments found</h3>
              <p className="text-[#B3B3B3]">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : selectedYear === 'all'
                    ? 'No payment activity recorded yet'
                    : `No payment activity recorded for ${selectedYear}`}
              </p>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className={`text-sm ${isLabelDashboard ? 'text-[#B3B3B3]' : 'text-gray-600'}`}>
              Showing {filteredPayments.length} of {allPayments.length} payment entries
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00]' : ''}>
                Previous
              </Button>
              <Button variant="outline" size="sm" className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]' : ''}>
                1
              </Button>
              <Button variant="outline" size="sm" disabled className={isLabelDashboard ? 'border-[#FF6B00]/20 bg-transparent text-[#FF6B00]' : ''}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  );
}
