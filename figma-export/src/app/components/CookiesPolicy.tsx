import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, Cookie, Settings, Eye } from 'lucide-react';

export function CookiesPolicy() {
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
              <Cookie className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl mb-4 text-white font-bold">Cookies Policy</h1>
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
                This Cookies Policy explains how AMT DISTRO ("we," "our," or "us") uses cookies and similar tracking technologies on our website and platform. This policy should be read in conjunction with our Privacy Policy.
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                By using our Services, you consent to the use of cookies as described in this policy. If you do not agree with our use of cookies, you should adjust your browser settings accordingly or refrain from using our Services.
              </p>
            </div>

            {/* What Are Cookies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">2. What Are Cookies?</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                Cookies can be "persistent" (remaining on your device until deleted or expired) or "session" (deleted when you close your browser). They can also be "first-party" (set by us) or "third-party" (set by other services we use).
              </p>
            </div>

            {/* Types of Cookies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">3. Types of Cookies We Use</h2>
              
              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">3.1 Strictly Necessary Cookies</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                These cookies are essential for our website to function properly. They enable core functionality such as:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>User authentication and account access</li>
                <li>Security and fraud prevention</li>
                <li>Session management and login state</li>
                <li>Payment processing and transaction security</li>
                <li>Load balancing and system optimization</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                <strong className="text-white">Duration:</strong> Session or up to 1 year
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Can be disabled:</strong> No (required for site functionality)
              </p>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">3.2 Performance Cookies</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                These cookies collect information about how visitors use our website, helping us improve performance and user experience:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Page load times and site performance metrics</li>
                <li>Error messages and technical issues</li>
                <li>Most visited pages and popular features</li>
                <li>Navigation patterns and user flow</li>
                <li>Device and browser information</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                <strong className="text-white">Duration:</strong> Up to 2 years
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Can be disabled:</strong> Yes (through browser settings)
              </p>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">3.3 Functional Cookies</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                These cookies allow our website to remember choices you make and provide enhanced features:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Language preferences and regional settings</li>
                <li>Display preferences (dark mode, text size, etc.)</li>
                <li>Previously entered information in forms</li>
                <li>Customized dashboard layouts and settings</li>
                <li>Notification preferences</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                <strong className="text-white">Duration:</strong> Up to 1 year
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Can be disabled:</strong> Yes (may affect user experience)
              </p>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">3.4 Analytics Cookies</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We use analytics cookies to understand how users interact with our platform:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Number of visitors and unique users</li>
                <li>Time spent on pages and engagement metrics</li>
                <li>Traffic sources and referral information</li>
                <li>Conversion rates and goal completions</li>
                <li>User demographics and interests (anonymized)</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                <strong className="text-white">Third-party services:</strong> Google Analytics, Mixpanel
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Duration:</strong> Up to 2 years
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Can be disabled:</strong> Yes
              </p>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">3.5 Marketing Cookies</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                These cookies track your browsing activity to deliver relevant advertisements:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Targeted advertising based on interests</li>
                <li>Retargeting and remarketing campaigns</li>
                <li>Ad performance measurement</li>
                <li>Social media integration and sharing</li>
                <li>Affiliate tracking and attribution</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                <strong className="text-white">Third-party services:</strong> Facebook Pixel, Google Ads, LinkedIn Insights
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Duration:</strong> Up to 1 year
              </p>
              <p className="text-[#B3B3B3] leading-relaxed">
                <strong className="text-white">Can be disabled:</strong> Yes
              </p>
            </div>

            {/* Similar Technologies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">4. Similar Technologies</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                In addition to cookies, we use other tracking technologies:
              </p>
              
              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.1 Web Beacons (Pixels)</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Small graphic images embedded in web pages and emails to track:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Email opens and click-through rates</li>
                <li>Page views and user interactions</li>
                <li>Ad impressions and conversions</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.2 Local Storage</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Browser storage that allows us to store data locally on your device for:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Offline functionality and caching</li>
                <li>Application state and user preferences</li>
                <li>Enhanced performance and faster load times</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">4.3 SDKs and APIs</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Software development kits and application interfaces used in mobile apps for:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>App analytics and crash reporting</li>
                <li>Push notifications and messaging</li>
                <li>Social media integration</li>
              </ul>
            </div>

            {/* Third-Party Cookies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">5. Third-Party Cookies</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We work with third-party service providers who may set cookies on our website:
              </p>
              
              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20 mb-4">
                <h4 className="text-white font-semibold mb-2">Google Analytics</h4>
                <p className="text-[#B3B3B3] text-sm">Website analytics and user behavior tracking</p>
                <a href="https://policies.google.com/privacy" className="text-[#FF6B00] text-sm hover:text-[#FFD600] underline">Privacy Policy</a>
              </div>

              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20 mb-4">
                <h4 className="text-white font-semibold mb-2">Facebook/Meta</h4>
                <p className="text-[#B3B3B3] text-sm">Social media integration and advertising</p>
                <a href="https://www.facebook.com/privacy" className="text-[#FF6B00] text-sm hover:text-[#FFD600] underline">Privacy Policy</a>
              </div>

              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20 mb-4">
                <h4 className="text-white font-semibold mb-2">Stripe</h4>
                <p className="text-[#B3B3B3] text-sm">Payment processing and fraud prevention</p>
                <a href="https://stripe.com/privacy" className="text-[#FF6B00] text-sm hover:text-[#FFD600] underline">Privacy Policy</a>
              </div>

              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20">
                <h4 className="text-white font-semibold mb-2">Intercom</h4>
                <p className="text-[#B3B3B3] text-sm">Customer support and messaging</p>
                <a href="https://www.intercom.com/legal/privacy" className="text-[#FF6B00] text-sm hover:text-[#FFD600] underline">Privacy Policy</a>
              </div>
            </div>

            {/* Managing Cookies */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">6. Managing Your Cookie Preferences</h2>
              
              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">6.1 Browser Settings</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Most browsers allow you to control cookies through their settings:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li><strong className="text-white">Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                <li><strong className="text-white">Firefox:</strong> Settings → Privacy & Security → Cookies</li>
                <li><strong className="text-white">Safari:</strong> Preferences → Privacy → Cookies</li>
                <li><strong className="text-white">Edge:</strong> Settings → Privacy → Cookies</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">6.2 Opt-Out Tools</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                You can opt out of specific tracking technologies:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li><strong className="text-white">Google Analytics:</strong> <a href="https://tools.google.com/dlpage/gaoptout" className="text-[#FF6B00] hover:text-[#FFD600] underline">Browser add-on</a></li>
                <li><strong className="text-white">Advertising:</strong> <a href="http://optout.aboutads.info" className="text-[#FF6B00] hover:text-[#FFD600] underline">Digital Advertising Alliance</a></li>
                <li><strong className="text-white">Mobile:</strong> Device settings → Privacy → Advertising</li>
              </ul>

              <h3 className="text-2xl mb-3 text-white font-semibold mt-6">6.3 Do Not Track</h3>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                Some browsers offer a "Do Not Track" (DNT) signal. Currently, there is no industry standard for responding to DNT signals, so our website does not alter its behavior when it receives a DNT request.
              </p>
            </div>

            {/* Impact of Disabling */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">7. Impact of Disabling Cookies</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                If you disable or refuse cookies, some parts of our website may not function properly. You may experience:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Inability to stay logged in to your account</li>
                <li>Loss of personalized settings and preferences</li>
                <li>Reduced website performance and functionality</li>
                <li>Repeated requests for information you've already provided</li>
                <li>Less relevant content and advertisements</li>
              </ul>
            </div>

            {/* Updates to Policy */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">8. Updates to This Policy</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                We may update this Cookies Policy from time to time to reflect changes in technology, legislation, or our practices. We will notify you of significant changes by:
              </p>
              <ul className="list-disc list-inside text-[#B3B3B3] space-y-2 ml-4">
                <li>Posting the updated policy on our website</li>
                <li>Updating the "Last Updated" date at the top of this page</li>
                <li>Displaying a prominent notice on our website</li>
              </ul>
              <p className="text-[#B3B3B3] leading-relaxed mt-4">
                We encourage you to review this policy periodically to stay informed about how we use cookies.
              </p>
            </div>

            {/* Contact Information */}
            <div className="mb-8">
              <h2 className="text-3xl mb-4 text-white font-bold">9. Contact Us</h2>
              <p className="text-[#B3B3B3] leading-relaxed mb-4">
                If you have questions about our use of cookies or this policy, please contact us:
              </p>
              <div className="bg-[#0A0A0A] p-4 rounded-lg border border-[#FF6B00]/20">
                <p className="text-white mb-2"><strong>AMT DISTRO</strong></p>
                <p className="text-[#B3B3B3]">Email: privacy@amtmusik.com</p>
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
