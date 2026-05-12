import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Shield, FileText, Scale } from 'lucide-react';

export function TermsConditions() {
  const handleBackToHome = () => {
    window.location.href = '/';
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="text-[#B3B3B3] hover:text-white hover:bg-[#161616] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B00] to-[#FFD600] rounded-lg flex items-center justify-center">
              <Scale className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl mb-4 text-white font-bold">Terms & Conditions</h1>
          <p className="text-xl text-[#B3B3B3]">
            Last Updated: March 28, 2026
          </p>
        </div>

        {/* Content */}
        <Card className="p-8 bg-[#161616] border-[#FF6B00]/20 mb-8">
          <div className="prose prose-invert max-w-none">
            {/* Introduction */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">1. Introduction</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Welcome to AMT DISTRO ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of our music distribution platform, website, and related services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                If you do not agree to these Terms, please do not use our Services. We reserve the right to modify these Terms at any time, and your continued use of the Services following any changes constitutes acceptance of those changes.
              </p>
            </div>

            {/* Acceptance of Terms */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">2. Acceptance of Terms</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                By creating an account or using our Services, you represent that:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>You are at least 18 years old or have parental consent</li>
                <li>You have the legal capacity to enter into binding contracts</li>
                <li>All information you provide is accurate and complete</li>
                <li>You will comply with all applicable laws and regulations</li>
                <li>You own or have the necessary rights to the content you upload</li>
              </ul>
            </div>

            {/* Account Registration */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">3. Account Registration</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                To access certain features of our Services, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or illegal activities.
              </p>
            </div>

            {/* Music Distribution Services */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">4. Music Distribution Services</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                AMT DISTRO provides music distribution services to various digital streaming platforms and stores. You understand and agree that:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Distribution timelines may vary by platform (typically 24-72 hours)</li>
                <li>Platform acceptance is at the sole discretion of each streaming service</li>
                <li>We do not guarantee placement, promotion, or success on any platform</li>
                <li>Royalty payment timelines depend on platform reporting schedules</li>
                <li>You are responsible for ensuring your content meets platform requirements</li>
              </ul>
            </div>

            {/* Content Rights and Ownership */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">5. Content Rights and Ownership</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                You retain 100% ownership of your music and master recordings. By uploading content to our platform, you:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Grant us a non-exclusive license to distribute your music to designated platforms</li>
                <li>Warrant that you own all rights or have obtained necessary permissions</li>
                <li>Represent that your content does not infringe on third-party rights</li>
                <li>Agree to indemnify us against any claims arising from your content</li>
                <li>Acknowledge that you are responsible for obtaining mechanical licenses if required</li>
              </ul>
            </div>

            {/* Pricing and Payments */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">6. Pricing and Payments</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Our pricing structure is as follows:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li><strong className="text-white">Free Artist Plan:</strong> ₦0 - 2 releases per year, 5 platforms, 90% royalty retention</li>
                <li><strong className="text-white">Paid Artist Plan:</strong> ₦25,990/year - Unlimited releases, 150+ platforms, 100% royalty retention</li>
                <li><strong className="text-white">Partner (Label) Plan:</strong> ₦49,990/year - All Artist features plus white-label options and 24/7 support</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                All payments are non-refundable unless otherwise stated. Subscription fees are billed annually and renew automatically unless cancelled before the renewal date.
              </p>
            </div>

            {/* Royalties and Revenue */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">7. Royalties and Revenue</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Royalty payments are subject to the following terms:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Royalties are paid monthly based on platform reporting schedules</li>
                <li>Minimum payout threshold is ₦5,000</li>
                <li>Payment methods include bank transfer and mobile money</li>
                <li>You are responsible for applicable taxes on earnings</li>
                <li>Royalty rates are determined by streaming platforms, not AMT DISTRO</li>
              </ul>
            </div>

            {/* Prohibited Content */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">8. Prohibited Content</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                You agree not to upload or distribute content that:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Infringes on intellectual property rights of others</li>
                <li>Contains illegal, harmful, or offensive material</li>
                <li>Promotes violence, hate speech, or discrimination</li>
                <li>Violates any applicable laws or regulations</li>
                <li>Contains malware, viruses, or malicious code</li>
                <li>Misrepresents your identity or affiliation</li>
              </ul>
            </div>

            {/* Termination */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">9. Termination</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Either party may terminate this agreement:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>You may cancel your account at any time through your account settings</li>
                <li>We may suspend or terminate accounts that violate these Terms</li>
                <li>Upon termination, your content will remain on platforms for 30 days</li>
                <li>You remain responsible for any outstanding fees or obligations</li>
                <li>Certain provisions of these Terms survive termination</li>
              </ul>
            </div>

            {/* Limitation of Liability */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">10. Limitation of Liability</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Our services are provided "as is" without warranties of any kind</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
                <li>We are not responsible for platform decisions or third-party actions</li>
                <li>You use our services at your own risk</li>
              </ul>
            </div>

            {/* Dispute Resolution */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">11. Dispute Resolution</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                In the event of any dispute:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Parties agree to first attempt informal resolution</li>
                <li>If unresolved, disputes will be settled through arbitration in Nigeria</li>
                <li>These Terms are governed by Nigerian law</li>
                <li>Each party bears its own legal costs unless otherwise awarded</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">12. Contact Information</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                For questions about these Terms, please contact us at:
              </p>
              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20">
                <p className="text-white mb-2"><strong>AMT DISTRO</strong></p>
                <p className="text-[#B3B3B3]">Email: legal@amtmusik.com</p>
                <p className="text-[#B3B3B3]">Phone: +234 (0) 800 000 0000</p>
                <p className="text-[#B3B3B3]">Address: Lagos, Nigeria</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer CTA */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleBackToHome}
            className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-white px-12"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </section>
  );
}
