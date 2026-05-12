import { Card } from './ui/card';
import { Button } from './ui/button';
import { XCircle, AlertTriangle, Phone, Mail, MessageCircle } from 'lucide-react';

interface PaymentRejectedProps {
  onRetry: () => void;
  onCancel: () => void;
}

export function PaymentRejected({ onRetry, onCancel }: PaymentRejectedProps) {
  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50 to-yellow-50 min-h-screen flex items-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Rejected Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-5xl mb-4">Payment Rejected</h1>
          <p className="text-xl text-gray-600">
            Your payment was rejected by your bank or card issuer.
          </p>
        </div>

        {/* Rejection Details */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">Why Was It Rejected?</h2>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Transaction Blocked</h3>
                  <p className="text-sm text-gray-700">
                    Your bank or card issuer has blocked this transaction. This is usually a security
                    measure to protect your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-3">Common Reasons for Rejection:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <span>
                    <strong>Security Hold:</strong> Your bank flagged the transaction as potentially
                    fraudulent
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <span>
                    <strong>Card Restrictions:</strong> Online or international transactions are
                    disabled
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <span>
                    <strong>Spending Limit:</strong> Transaction exceeds your daily or monthly limit
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <span>
                    <strong>Card Status:</strong> Card is frozen, suspended, or reported lost/stolen
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <span>
                    <strong>Bank Policy:</strong> Your bank doesn't allow certain types of merchant
                    transactions
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* What to Do */}
        <Card className="p-8 mb-6">
          <h2 className="text-2xl mb-6">What You Should Do</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Contact Your Bank Immediately</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Call your bank's customer service to understand why the transaction was rejected
                  and get it approved
                </p>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium mb-1">What to tell them:</div>
                  <ul className="space-y-1 ml-4">
                    <li>• You're making a legitimate subscription payment</li>
                    <li>• The merchant name is "SoundFlow"</li>
                    <li>• Request to enable online/international transactions</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Check Card Settings</h3>
                <p className="text-sm text-gray-600">
                  Log into your mobile banking app to check if online payments, international
                  transactions, or spending limits need to be adjusted
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Try Alternative Payment Methods</h3>
                <p className="text-sm text-gray-600">
                  While you resolve the issue, consider using bank transfer or USSD as an alternative
                  payment method
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Bank Contact Information */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <h3 className="font-medium mb-3">Need Your Bank's Number?</h3>
          <p className="text-sm text-gray-700 mb-3">
            Most Nigerian banks have a 24/7 customer service hotline. Check the back of your card or
            these common numbers:
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>• GTBank: 0700 CALL GTB</div>
            <div>• Access Bank: 01-2712005</div>
            <div>• UBA: 01-2808822</div>
            <div>• Zenith: 01-2787000</div>
            <div>• First Bank: 01-4485500</div>
            <div>• FCMB: 01-2798800</div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={onRetry} className="flex-1">
            I've Contacted My Bank - Retry Payment
          </Button>
          <Button size="lg" variant="outline" onClick={onCancel} className="flex-1">
            Try Different Method
          </Button>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Still having issues?{' '}
            <a href="#" className="text-purple-600 hover:underline font-medium">
              Chat with our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
