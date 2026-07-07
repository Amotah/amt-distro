import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Shield, Lock, Eye } from 'lucide-react';

export function PrivacyPolicy() {
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
              <Shield className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl mb-4 text-white font-bold">Privacy Policy</h1>
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
                At AMT DISTRO ("we," "our," or "us"), we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our music distribution platform and services.
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                By using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Services.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">2. Information We Collect</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We collect several types of information from and about users of our Services:
              </p>
              
              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">2.1 Personal Information</h3>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Name, email address, and phone number</li>
                <li>Date of birth and country of residence</li>
                <li>Payment information and bank account details</li>
                <li>Artist name, stage name, and professional information</li>
                <li>Government-issued ID for verification purposes</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">2.2 Content Information</h3>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Music files, artwork, and metadata you upload</li>
                <li>Release information including titles, genres, and credits</li>
                <li>Lyrics and other content associated with your releases</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">2.3 Usage Information</h3>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Log data and analytics about how you use our Services</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Location data based on IP address</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">2.4 Financial Information</h3>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Streaming and sales data from distribution platforms</li>
                <li>Revenue and royalty information</li>
                <li>Transaction history and payment records</li>
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">3. How We Use Your Information</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Provide, maintain, and improve our Services</li>
                <li>Process your music distribution to streaming platforms</li>
                <li>Calculate and distribute royalty payments</li>
                <li>Communicate with you about your account and releases</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations and enforce our Terms</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </div>

            {/* Information Sharing */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">4. How We Share Your Information</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We may share your information with:
              </p>
              
              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.1 Streaming Platforms</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We share your music, metadata, and artist information with streaming platforms (Spotify, Apple Music, etc.) as necessary to distribute your content.
              </p>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.2 Service Providers</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We work with third-party service providers for:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Payment processing and banking services</li>
                <li>Cloud storage and hosting</li>
                <li>Analytics and performance monitoring</li>
                <li>Email and communication services</li>
                <li>Customer support tools</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.3 Legal Requirements</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We may disclose your information if required by law or to:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Comply with legal obligations or court orders</li>
                <li>Protect our rights, property, or safety</li>
                <li>Prevent fraud or illegal activities</li>
                <li>Enforce our Terms and Conditions</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.4 Business Transfers</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>
            </div>

            {/* Data Security */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">5. Data Security</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and audits</li>
                <li>Employee training on data protection</li>
                <li>Incident response and breach notification procedures</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </div>

            {/* Data Retention */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">6. Data Retention</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Provide our Services and maintain your account</li>
                <li>Comply with legal, tax, and accounting obligations</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Process pending royalty payments</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                After account closure, we may retain certain information for up to 7 years as required by law or for legitimate business purposes.
              </p>
            </div>

            {/* Your Rights */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">7. Your Privacy Rights</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li><strong className="text-white">Access:</strong> Request a copy of your personal information</li>
                <li><strong className="text-white">Correction:</strong> Update or correct inaccurate information</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information</li>
                <li><strong className="text-white">Portability:</strong> Receive your data in a structured format</li>
                <li><strong className="text-white">Objection:</strong> Object to processing of your information</li>
                <li><strong className="text-white">Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                To exercise these rights, contact us at privacy@amtdistro.com.ng. We will respond within 30 days.
              </p>
            </div>

            {/* Cookies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">8. Cookies and Tracking</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Provide personalized content and recommendations</li>
                <li>Measure the effectiveness of marketing campaigns</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                You can control cookies through your browser settings. However, disabling cookies may affect functionality of our Services.
              </p>
            </div>

            {/* International Transfers */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">9. International Data Transfers</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Your information may be transferred to and processed in countries other than Nigeria. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
              </p>
            </div>

            {/* Children's Privacy */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">10. Children's Privacy</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Our Services are not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </div>

            {/* Changes to Policy */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">11. Changes to This Policy</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Posting the new policy on our website</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending email notifications for material changes</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                Your continued use of our Services after changes constitutes acceptance of the updated policy.
              </p>
            </div>

            {/* Contact Information */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">12. Contact Us</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                For questions or concerns about this Privacy Policy or our data practices, contact us at:
              </p>
              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20">
                <p className="text-white mb-2"><strong>Data Protection Officer</strong></p>
                <p className="text-white mb-2"><strong>AMT DISTRO</strong></p>
                <p className="text-[#B3B3B3]">Email: privacy@amtdistro.com.ng</p>
                <p className="text-[#B3B3B3]">Phone: +234 (0) 816 298 8301</p>
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
