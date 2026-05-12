import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, HelpCircle, Mail } from 'lucide-react';

interface PaymentFailedProps {
  onRetry: () => void;
  onCancel: () => void;
}

export function PaymentFailed({ onRetry, onCancel }: PaymentFailedProps) {
  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 to-orange-50 min-h-screen flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Failed Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-5xl mb-4">Payment Failed</h1>
          <p className="text-xl text-gray-600">
            We couldn't process your payment. Please try again.
          </p>
        </div>

        {/* Error Details */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">What Happened?</h2>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Transaction Declined</h3>
                  <p className="text-sm text-gray-700">
                    Your payment could not be processed. This could be due to insufficient funds,
                    incorrect card details, or network issues.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-3">Common Reasons:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Insufficient funds in your account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Incorrect card number, expiry date, or CVV</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Card has expired or is blocked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Network or connection issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>International transactions not enabled</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Solutions */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">How to Fix This</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Try Again</h3>
                <p className="text-sm text-gray-600">
                  Double-check your payment details and try processing the payment again
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Use a Different Payment Method</h3>
                <p className="text-sm text-gray-600">
                  Try using a different card or payment method like bank transfer or USSD
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Contact Your Bank</h3>
                <p className="text-sm text-gray-600">
                  Verify your card is active and has sufficient funds for online transactions
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={onRetry} className="flex-1 gap-2">
            <RefreshCw className="w-5 h-5" />
            Try Again
          </Button>
          <Button size="lg" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="#" className="text-purple-600 hover:underline">
              Contact Support
            </a>{' '}
            or call us at +234 800 123 4567
          </p>
        </div>
      </div>
    </section>
  );
}
