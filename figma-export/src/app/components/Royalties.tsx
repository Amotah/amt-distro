import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Music,
  CreditCard,
  Clock,
  CheckCircle,
} from 'lucide-react';

const recentPayments = [
  {
    id: 1,
    period: 'November 2024',
    amount: '₦428,500.00',
    status: 'Paid',
    date: '2024-12-15',
    streams: '125.4K',
  },
  {
    id: 2,
    period: 'October 2024',
    amount: '₦312,800.00',
    status: 'Paid',
    date: '2024-11-15',
    streams: '89.2K',
  },
  {
    id: 3,
    period: 'September 2024',
    amount: '₦276,400.00',
    status: 'Paid',
    date: '2024-10-15',
    streams: '78.5K',
  },
  {
    id: 4,
    period: 'August 2024',
    amount: '₦189,200.00',
    status: 'Paid',
    date: '2024-09-15',
    streams: '54.2K',
  },
];

const upcomingPayments = [
  {
    period: 'December 2024',
    estimatedAmount: '₦512,300.00',
    estimatedDate: '2025-01-15',
    streams: '156.8K',
    status: 'Processing',
  },
];

const revenueByPlatform = [
  { platform: 'Spotify', revenue: '₦342,500.00', percentage: 45, color: 'bg-[#1DB954]' },
  { platform: 'Apple Music', revenue: '₦228,300.00', percentage: 30, color: 'bg-[#FA243C]' },
  { platform: 'YouTube Music', revenue: '₦114,200.00', percentage: 15, color: 'bg-[#FF0000]' },
  { platform: 'Amazon Music', revenue: '₦56,300.00', percentage: 10, color: 'bg-[#00A8E0]' },
];

interface RoyaltiesProps {
  onNavigate: (page: string) => void;
}

export function Royalties({ onNavigate }: RoyaltiesProps) {
  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl mb-2 text-white font-semibold">Royalties</h1>
            <p className="text-[#A0A7B8]">Track your earnings and payment history</p>
          </div>
          <Button variant="outline" className="gap-2 border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/60">
            <Download className="w-5 h-5" />
            Download Statement
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-[#161616] border-white/8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/15 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <Badge className="text-[#00FFA3] bg-[#00FFA3]/15 border-0">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15.2%
              </Badge>
            </div>
            <div className="text-3xl mb-1 text-white font-semibold">₦402,306.20</div>
            <div className="text-[#A0A7B8]">Total Earnings</div>
          </Card>

          <Card className="p-6 bg-[#161616] border-white/8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#1DB954]" />
              </div>
            </div>
            <div className="text-3xl mb-1 text-white font-semibold">₦142,833.50</div>
            <div className="text-[#A0A7B8]">Last Payment</div>
          </Card>

          <Card className="p-6 bg-[#161616] border-white/8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="text-3xl mb-1 text-white font-semibold">₦170,766.30</div>
            <div className="text-[#A0A7B8]">Pending</div>
          </Card>

          <Card className="p-6 bg-[#161616] border-white/8">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-sky-500/15 flex items-center justify-center">
                <Music className="w-6 h-6 text-sky-400" />
              </div>
            </div>
            <div className="text-3xl mb-1 text-white font-semibold">347.2K</div>
            <div className="text-[#A0A7B8]">Total Streams</div>
          </Card>
        </div>

        {/* Upcoming Payment */}
        {upcomingPayments.length > 0 && (
          <Card className="p-6 mb-8 bg-[#161616] border-[#FF6B00]/25">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#FF6B00] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl text-white font-semibold">Next Payment</h3>
                  <Badge className="bg-amber-500/20 text-amber-300 border-0">
                    {upcomingPayments[0].status}
                  </Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-[#A0A7B8] mb-1">Estimated Amount</div>
                    <div className="text-2xl text-white font-semibold">{upcomingPayments[0].estimatedAmount}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#A0A7B8] mb-1">Payment Date</div>
                    <div className="text-lg text-white">
                      {new Date(upcomingPayments[0].estimatedDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#A0A7B8] mb-1">Streams</div>
                    <div className="text-lg text-white">{upcomingPayments[0].streams}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Revenue by Platform */}
        <Card className="p-6 mb-8 bg-[#161616] border-white/8">
          <h2 className="text-2xl mb-6 text-white font-semibold">Revenue by Platform</h2>
          <div className="space-y-6">
            {revenueByPlatform.map((platform, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{platform.platform}</span>
                  <div className="text-right">
                    <div className="font-medium text-white">{platform.revenue}</div>
                    <div className="text-sm text-[#A0A7B8]">{platform.percentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-white/8 rounded-full h-3">
                  <div
                    className={`${platform.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${platform.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-6 bg-[#161616] border-white/8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-white font-semibold">Payment History</h2>
            <Button variant="outline" size="sm" className="border-white/15 text-[#A0A7B8] hover:bg-white/5 hover:text-white">
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-[#A0A7B8] font-medium text-sm">Period</th>
                  <th className="text-left py-3 px-4 text-[#A0A7B8] font-medium text-sm">Amount</th>
                  <th className="text-left py-3 px-4 text-[#A0A7B8] font-medium text-sm">Streams</th>
                  <th className="text-left py-3 px-4 text-[#A0A7B8] font-medium text-sm">Payment Date</th>
                  <th className="text-left py-3 px-4 text-[#A0A7B8] font-medium text-sm">Status</th>
                  <th className="text-right py-3 px-4 text-[#A0A7B8] font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/6 hover:bg-white/3">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#A0A7B8]" />
                        <span className="text-white">{payment.period}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-white">{payment.amount}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#A0A7B8]">{payment.streams}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#A0A7B8]">
                        {new Date(payment.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className="bg-[#00FFA3]/15 text-[#00FFA3] border-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm" className="text-[#A0A7B8] hover:text-white hover:bg-white/5">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Settings */}
        <Card className="p-6 mt-8 bg-[#161616] border-white/8">
          <h2 className="text-2xl mb-6 text-white font-semibold">Payment Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/4 rounded-lg border border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1DB954]/15 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <div className="font-medium text-white">Bank Account</div>
                  <div className="text-sm text-[#A0A7B8]">Manage your payout bank account</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10" onClick={() => onNavigate('bank-settings')}>
                Update
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/4 rounded-lg border border-white/8">
              <div>
                <div className="font-medium mb-1 text-white">Minimum Payout Threshold</div>
                <div className="text-sm text-[#A0A7B8]">
                  You'll receive payment when your balance reaches ₦10,000
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FF6B00]/10" onClick={() => onNavigate('payout-settings')}>
                Change
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}