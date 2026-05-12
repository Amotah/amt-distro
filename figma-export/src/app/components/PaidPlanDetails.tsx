import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Music,
  Check,
  ArrowLeft,
  ArrowRight,
  Globe,
  TrendingUp,
  Shield,
  BarChart3,
  Megaphone,
  Headphones,
  Zap,
  Star,
} from 'lucide-react';

export function PaidPlanDetails() {
  const selectPlan = (planId: 'artist' | 'super_artist') => {
    window.sessionStorage.setItem('amtdistro-public-selected-plan', planId);
    window.location.href = '/get-started';
  };

  const handleBackToPlans = () => {
    window.location.href = '/get-started';
  };

  return (
    <section id="paid-plan-details" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToPlans}
            className="text-[#B3B3B3] hover:text-white hover:bg-[#161616] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Plans
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl mb-4 text-white font-bold">Artist Plans</h1>
          <p className="text-xl text-[#B3B3B3] mb-12">
            Choose the plan that fits your music distribution needs
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Go-Artist Plan */}
            <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#161616] p-8">
              <div className="text-lg font-semibold text-white mb-2">Go-Artist</div>
              <div className="text-sm text-[#B3B3B3] mb-4">For independent artists getting their music out</div>
              <div className="mt-6 text-5xl font-bold text-[#FFD600]">₦15,000</div>
              <div className="mt-2 text-sm text-[#B3B3B3]">per release</div>
              <Button onClick={() => selectPlan('artist')} className="mt-6 w-full bg-[#FF6B00] text-white hover:bg-[#ff7c21]">Choose Go-Artist</Button>
              <div className="mt-6 space-y-3 text-left text-sm">
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>150+ platforms</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Basic analytics</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Keep 100% royalties</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>ISRC & UPC codes included</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Dedicated support</span>
                </div>
              </div>
            </div>

            {/* Super Artist Plan */}
            <div className="rounded-2xl border border-[#FFD600]/30 bg-[#161616] p-8 shadow-[0_20px_40px_rgba(255,214,0,0.08)]">
              <div className="inline-block px-3 py-1 bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white text-xs rounded-full font-bold mb-3">
                RECOMMENDED
              </div>
              <div className="text-lg font-semibold text-white mb-2">Super Artist</div>
              <div className="text-sm text-[#B3B3B3] mb-4">For artists ready to grow their audience</div>
              <div className="mt-6 text-5xl font-bold text-[#FFD600]">₦25,000</div>
              <div className="mt-2 text-sm text-[#B3B3B3]">per release</div>
              <Button onClick={() => selectPlan('super_artist')} className="mt-6 w-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white hover:opacity-90">Choose Super Artist</Button>
              <div className="mt-6 space-y-3 text-left text-sm">
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>All Go-Artist features</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>YouTube Content ID & OAC setup</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Set exact release times</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Social media promotion</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2 text-[#B3B3B3]">
                  <Check className="w-5 h-5 text-[#1DB954]" />
                  <span>Free Pre-Save Smartlinks</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Compare Artist Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#FF6B00]/20">
                  <th className="text-left py-4 text-white font-semibold">Feature</th>
                  <th className="text-center py-4 text-[#FFD600] font-bold">Go-Artist<br/><span className="text-xs font-normal">₦15,000</span></th>
                  <th className="text-center py-4 text-[#FFD600] font-bold">Super Artist<br/><span className="text-xs font-normal">₦25,000</span></th>
                </tr>
              </thead>
              <tbody className="text-[#B3B3B3]">
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Distribution Platforms</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ 150+</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ 150+</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Analytics</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ Basic</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ Advanced</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Keep 100% Royalties</td>
                  <td className="text-center py-4 text-[#1DB954]">✓</td>
                  <td className="text-center py-4 text-[#1DB954]">✓</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">ISRC & UPC Codes</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ Included</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ Included</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">YouTube Content ID Setup</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954]">✓</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Exact Release Time Control</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954]">✓</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Social Media Promotion</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954]">✓</td>
                </tr>
                <tr className="border-b border-[#FF6B00]/10">
                  <td className="py-4">Pre-Save Smartlinks</td>
                  <td className="text-center py-4">—</td>
                  <td className="text-center py-4 text-[#1DB954]">✓ Free</td>
                </tr>
                <tr>
                  <td className="py-4">Support Priority</td>
                  <td className="text-center py-4 text-[#B3B3B3]">Standard</td>
                  <td className="text-center py-4 text-[#1DB954]">Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Why Choose Artist Plans */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Why Artists Choose Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Global Reach</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Distribute to 150+ platforms including Spotify, Apple Music, YouTube Music, TikTok, and more
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-[#FFD600]/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-[#FFD600]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Real-Time Analytics</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Track streams, revenue, and listener demographics across all platforms
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1DB954]/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#1DB954]" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Keep Everything</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Retain 100% ownership and royalties from your music
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Fast Distribution</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Get your music live on platforms in 24-48 hours
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Marketing Tools</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Super Artist includes social media promotion and pre-save smartlinks
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-semibold mb-1">Expert Support</div>
                  <div className="text-[#B3B3B3] text-sm">
                    Get help from our dedicated support team whenever you need it
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Perfect For Section */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-12">
          <h2 className="text-3xl mb-6 text-white font-bold">Which Plan is Right for You?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-lg bg-[#0A0A0A] p-6 border-l-4 border-[#FF6B00]">
              <div className="text-lg font-semibold text-white mb-3">Choose Go-Artist (₦15,000) If You:</div>
              <ul className="space-y-2 text-[#B3B3B3] text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Are just starting your music journey</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Want to test the distribution platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Need basic analytics and support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Have an occasional release</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-[#0A0A0A] p-6 border-l-4 border-[#FFD600]">
              <div className="text-lg font-semibold text-white mb-3">Choose Super Artist (₦25,000) If You:</div>
              <ul className="space-y-2 text-[#B3B3B3] text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Release music regularly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Want advanced analytics and insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Need YouTube Content ID and monetization setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FFD600] mt-1">→</span>
                  <span>Want professional promotion and smartlinks</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="p-8 bg-gradient-to-br from-[#161616] to-[#0A0A0A] border-2 border-[#FF6B00] max-w-2xl mx-auto">
            <h2 className="text-3xl mb-4 text-white font-bold">Ready to Distribute Your Music?</h2>
            <p className="text-xl text-[#B3B3B3] mb-6">
              Choose your plan and get your music on 150+ platforms today
            </p>
            <Button
              size="lg"
              onClick={() => selectPlan('super_artist')}
              className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white px-12 text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
