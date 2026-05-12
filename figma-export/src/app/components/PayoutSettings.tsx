import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { ArrowLeft, DollarSign, Info, Check } from 'lucide-react';

interface PayoutSettingsProps {
  onBack: () => void;
}

const thresholdOptions = [
  { value: 5000, label: '₦5,000', description: 'Minimum threshold - Get paid faster' },
  { value: 10000, label: '₦10,000', description: 'Recommended for most artists' },
  { value: 20000, label: '₦20,000', description: 'Reduce transaction frequency' },
  { value: 50000, label: '₦50,000', description: 'For high-earning artists' },
  { value: 100000, label: '₦100,000', description: 'Maximum threshold' },
];

export function PayoutSettings({ onBack }: PayoutSettingsProps) {
  const [currentThreshold, setCurrentThreshold] = useState(10000);
  const [selectedThreshold, setSelectedThreshold] = useState(10000);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setCurrentThreshold(selectedThreshold);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onBack();
    }, 2000);
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 text-[#A0A7B8] hover:text-white hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Royalties
          </Button>
          <h1 className="text-4xl mb-2 text-white font-semibold">Minimum Payout Threshold</h1>
          <p className="text-[#A0A7B8]">
            Set the minimum balance required before receiving a payout
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-[#FF6B00]/8 border-[#FF6B00]/25">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-[#FF6B00] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1 text-white">How it works</h3>
              <p className="text-sm text-[#A0A7B8]">
                Royalties accumulate in your account. Once your balance reaches the threshold you set,
                we'll automatically process a payment to your registered bank account. Lower thresholds
                mean more frequent payments but may incur additional transaction fees.
              </p>
            </div>
          </div>
        </Card>

        {/* Current Balance */}
        <Card className="p-6 mb-6 bg-[#161616] border-[#FF6B00]/25">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#A0A7B8] mb-1">Current Balance</div>
              <div className="text-4xl text-white font-semibold">₦12,730</div>
            </div>
            <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-[#A0A7B8]">
              Current threshold: <span className="font-medium text-white">₦{currentThreshold.toLocaleString()}</span>
            </div>
            <div className="text-sm text-[#A0A7B8] mt-1">
              {currentThreshold > 12730 ? (
                <>
                  You need <span className="font-medium text-white">₦{(currentThreshold - 12730).toLocaleString()}</span> more to reach payout
                </>
              ) : (
                <span className="text-[#00FFA3] font-medium">✓ Ready for payout!</span>
              )}
            </div>
          </div>
        </Card>

        {/* Threshold Options */}
        <Card className="p-8 bg-[#161616] border-white/8">
          <h2 className="text-2xl mb-6 text-white font-semibold">Select Your Threshold</h2>
          <div className="space-y-3">
            {thresholdOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setSelectedThreshold(option.value)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedThreshold === option.value
                    ? 'border-[#FF6B00] bg-[#FF6B00]/8'
                    : 'border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-medium text-white">{option.label}</span>
                      {option.value === currentThreshold && (
                        <span className="text-xs bg-white/10 text-[#A0A7B8] px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#A0A7B8]">{option.description}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedThreshold === option.value
                        ? 'border-[#FF6B00] bg-[#FF6B00]'
                        : 'border-white/25'
                    }`}
                  >
                    {selectedThreshold === option.value && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison */}
          <div className="mt-6 p-4 bg-white/4 rounded-lg border border-white/8">
            <h3 className="font-medium mb-3 text-white">Estimated Impact</h3>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-[#A0A7B8] mb-1">Current Setting</div>
                <div className="font-medium text-white">
                  ₦{currentThreshold.toLocaleString()}
                </div>
                <div className="text-xs text-[#A0A7B8] mt-1">
                  ~{Math.ceil(12 / (currentThreshold / 10000))} payouts/year
                </div>
              </div>
              <div>
                <div className="text-[#A0A7B8] mb-1">New Setting</div>
                <div className="font-medium text-[#FF6B00]">
                  ₦{selectedThreshold.toLocaleString()}
                </div>
                <div className="text-xs text-[#A0A7B8] mt-1">
                  ~{Math.ceil(12 / (selectedThreshold / 10000))} payouts/year
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={saved}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={selectedThreshold === currentThreshold || saved}
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card>

        {/* Additional Info */}
        <Card className="p-6 mt-6 bg-[#161616] border-white/8">
          <h3 className="font-medium mb-3 text-white">Good to Know</h3>
          <ul className="space-y-2 text-sm text-[#A0A7B8]">
            <li className="flex gap-2">
              <span className="text-[#FF6B00]">•</span>
              <span>
                Changes to your threshold take effect immediately
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FF6B00]">•</span>
              <span>
                Payments are processed within 3-5 business days after reaching the threshold
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FF6B00]">•</span>
              <span>
                There are no additional fees for changing your threshold
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#FF6B00]">•</span>
              <span>
                You can view all pending and completed payouts in your Royalties dashboard
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
