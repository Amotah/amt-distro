import { Card } from './ui/card';
import { Button } from './ui/button';
import { Check, Download, Music, Calendar } from 'lucide-react';

interface PaymentSuccessProps {
  selectedPlan: {
    name: string;
    price: string;
    period: string;
  };
  onContinue: () => void;
}

export function PaymentSuccess({ selectedPlan, onContinue }: PaymentSuccessProps) {
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-5xl mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-600">
            Welcome to SoundFlow! Your account is now active.
          </p>
        </div>

        {/* Transaction Details */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">Transaction Details</h2>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Transaction ID</span>
              <span className="font-mono font-medium">{transactionId}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-medium text-lg">
                {selectedPlan.price === '₦0'
                  ? '₦0'
                  : `₦${Math.round(parseFloat(selectedPlan.price.replace(/[₦,]/g, '')) * 1.075).toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Billing Cycle</span>
              <span className="font-medium">{selectedPlan.period}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Payment Date</span>
              <span className="font-medium">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-gray-600">Next Billing Date</span>
              <span className="font-medium">
                {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-6 gap-2">
            <Download className="w-5 h-5" />
            Download Receipt
          </Button>
        </Card>

        {/* Next Steps */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">What's Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Upload Your Music</h3>
                <p className="text-sm text-gray-600">
                  Start distributing your music to 150+ streaming platforms worldwide
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Schedule Releases</h3>
                <p className="text-sm text-gray-600">
                  Plan your release strategy and set up pre-save campaigns
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Track Your Success</h3>
                <p className="text-sm text-gray-600">
                  Monitor your streams, earnings, and audience insights in real-time
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Confirmation Email Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            📧 A confirmation email has been sent to your registered email address with your receipt
            and account details.
          </p>
        </div>

        {/* Continue Button */}
        <Button size="lg" onClick={onContinue} className="w-full">
          Go to Dashboard
        </Button>
      </div>
    </section>
  );
}
