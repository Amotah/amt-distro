import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  Link,
  Copy,
  Check,
  Upload,
  Music,
  ExternalLink,
  QrCode,
  Download,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Eye,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  generateSlug,
  generateShortId,
  validatePlatformUrl,
  detectDevice,
  detectOS,
  getPreferredPlatform,
  createClickEvent,
  formatNumber,
  type ClickEvent,
} from '../utils/smartLinkAlgorithms';

interface CreateSmartLinkProps {
  onBack: () => void;
}

const streamingPlatforms = [
  { id: 'spotify', name: 'Spotify', required: true },
  { id: 'apple-music', name: 'Apple Music', required: true },
  { id: 'youtube-music', name: 'YouTube Music', required: false },
  { id: 'amazon-music', name: 'Amazon Music', required: false },
  { id: 'deezer', name: 'Deezer', required: false },
  { id: 'tidal', name: 'Tidal', required: false },
  { id: 'soundcloud', name: 'SoundCloud', required: false },
  { id: 'pandora', name: 'Pandora', required: false },
];

export function CreateSmartLink({ onBack }: CreateSmartLinkProps) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview');
  const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    linkTitle: '',
    artistName: '',
    releaseTitle: '',
    customSlug: '',
    coverImage: '',
    enableGeoRouting: true,
    enableDeviceRouting: true,
    platforms: {
      'spotify': '',
      'apple-music': '',
      'youtube-music': '',
      'amazon-music': '',
      'deezer': '',
      'tidal': '',
      'soundcloud': '',
      'pandora': '',
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlatformLinkChange = (platform: string, url: string) => {
    setFormData({
      ...formData,
      platforms: {
        ...formData.platforms,
        [platform]: url,
      },
    });
  };

  const generateSlugAuto = () => {
    const slug = generateSlug(formData.releaseTitle || formData.linkTitle);
    setFormData({ ...formData, customSlug: slug || generateShortId() });
  };

  const generatedLink = `amtdistro.link/${formData.customSlug || 'your-music'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${generatedLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate QR Code
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        `https://${generatedLink}`,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#7C3AED',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
      
      QRCode.toDataURL(`https://${generatedLink}`, {
        width: 512,
        margin: 2,
      }).then(setQrCodeUrl);
    }
  }, [step, generatedLink]);

  const downloadQrCode = () => {
    const link = document.createElement('a');
    link.download = `${formData.customSlug || 'smart-link'}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  // Simulate click tracking
  const handleSimulateClick = () => {
    const device = detectDevice();
    const os = detectOS();
    const preferredPlatform = getPreferredPlatform(formData.platforms, device, os);
    
    const event = createClickEvent(
      formData.customSlug,
      preferredPlatform ? Object.keys(formData.platforms).find(
        k => formData.platforms[k as keyof typeof formData.platforms] === preferredPlatform
      ) : undefined
    );
    
    setClickEvents([...clickEvents, event]);
  };

  // Calculate analytics
  const analytics = {
    totalClicks: clickEvents.length,
    platforms: clickEvents.reduce((acc, e) => {
      if (e.platform) {
        acc[e.platform] = (acc[e.platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    devices: clickEvents.reduce((acc, e) => {
      acc[e.device] = (acc[e.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    countries: clickEvents.reduce((acc, e) => {
      if (e.country) {
        acc[e.country] = (acc[e.country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
  };

  const handleSubmit = () => {
    console.log('Smart link created:', formData);
    setStep(3);
  };

  const validatePlatformLinks = () => {
    let isValid = true;
    Object.entries(formData.platforms).forEach(([platform, url]) => {
      if (url && !validatePlatformUrl(platform, url)) {
        console.warn(`Invalid URL for ${platform}: ${url}`);
        isValid = false;
      }
    });
    return isValid;
  };

  return (
    <section className="py-4 sm:py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Marketing
          </Button>
          <h1 className="text-3xl sm:text-4xl mb-2">Create Smart Link</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Generate a universal link that directs fans to your music on all platforms
          </p>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl mb-6">Basic Information</h2>
            <div className="space-y-6">
              <div>
                <Label htmlFor="linkTitle">Link Title *</Label>
                <Input
                  id="linkTitle"
                  name="linkTitle"
                  type="text"
                  placeholder="e.g., My New Single - All Platforms"
                  value={formData.linkTitle}
                  onChange={handleInputChange}
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="artistName">Artist Name *</Label>
                  <Input
                    id="artistName"
                    name="artistName"
                    type="text"
                    placeholder="Your artist name"
                    value={formData.artistName}
                    onChange={handleInputChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="releaseTitle">Release Title *</Label>
                  <Input
                    id="releaseTitle"
                    name="releaseTitle"
                    type="text"
                    placeholder="Song or album name"
                    value={formData.releaseTitle}
                    onChange={handleInputChange}
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customSlug">Custom Link Slug *</Label>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      amtdistro.link/
                    </span>
                    <Input
                      id="customSlug"
                      name="customSlug"
                      type="text"
                      placeholder="your-music"
                      value={formData.customSlug}
                      onChange={handleInputChange}
                      className="pl-28 sm:pl-32"
                      required
                    />
                  </div>
                  <Button type="button" onClick={generateSlugAuto} variant="outline" className="shrink-0">
                    Generate
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Choose a memorable slug for your link. Use lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              {/* Advanced Options */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Smart Routing Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableDeviceRouting"
                      checked={formData.enableDeviceRouting}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enableDeviceRouting: checked as boolean })
                      }
                    />
                    <Label htmlFor="enableDeviceRouting" className="cursor-pointer text-sm sm:text-base">
                      Enable device-based routing (iOS → Apple Music, Android → YouTube Music)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enableGeoRouting"
                      checked={formData.enableGeoRouting}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, enableGeoRouting: checked as boolean })
                      }
                    />
                    <Label htmlFor="enableGeoRouting" className="cursor-pointer text-sm sm:text-base">
                      Enable geographic routing based on user location
                    </Label>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Link className="w-5 h-5 text-purple-600" />
                  Your Smart Link Preview
                </h3>
                <code className="block bg-white px-3 py-2 rounded text-xs sm:text-sm break-all">
                  https://{generatedLink}
                </code>
              </div>
            </div>

            <Button size="lg" onClick={() => setStep(2)} className="w-full mt-8">
              Continue
            </Button>
          </Card>
        )}

        {/* Step 2: Platform Links */}
        {step === 2 && (
          <Card className="p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl mb-6">Add Platform Links</h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              Add links to your music on different streaming platforms. At minimum, include Spotify and Apple Music.
            </p>
            <div className="space-y-4">
              {streamingPlatforms.map((platform) => (
                <div key={platform.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor={platform.id} className="text-sm sm:text-base">
                      {platform.name}
                      {platform.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {platform.required && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <Input
                    id={platform.id}
                    type="url"
                    placeholder={`https://${platform.id}.com/your-music`}
                    value={formData.platforms[platform.id as keyof typeof formData.platforms]}
                    onChange={(e) => handlePlatformLinkChange(platform.id, e.target.value)}
                    required={platform.required}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Create Smart Link
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-4 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl mb-2">Smart Link Created!</h2>
                <p className="text-gray-600 text-sm sm:text-base">Your universal music link is ready to share</p>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <Label className="mb-2 block">Your Smart Link</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      value={`https://${generatedLink}`}
                      readOnly
                      className="flex-1 bg-white text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCopy} variant="outline" className="flex-1 sm:flex-initial">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="ml-2 sm:hidden">Copy</span>
                      </Button>
                      <Button variant="outline" onClick={() => setShowQrCode(!showQrCode)} className="flex-1 sm:flex-initial">
                        <QrCode className="w-4 h-4" />
                        <span className="ml-2 sm:hidden">QR</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                {showQrCode && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex-shrink-0">
                        <canvas ref={canvasRef} className="border-2 border-purple-200 rounded-lg" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-lg font-medium mb-2">QR Code</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Scan this code to access your smart link instantly
                        </p>
                        <Button onClick={downloadQrCode} variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download QR Code
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card className="p-3 sm:p-4">
                    <div className="text-center">
                      <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-xl sm:text-2xl mb-1">{analytics.totalClicks}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Total Clicks</div>
                    </div>
                  </Card>
                  <Card className="p-3 sm:p-4">
                    <div className="text-center">
                      <Link className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-xl sm:text-2xl mb-1">
                        {Object.values(formData.platforms).filter(Boolean).length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Active Platforms</div>
                    </div>
                  </Card>
                  <Card className="p-3 sm:p-4 col-span-2 sm:col-span-1">
                    <div className="text-center">
                      <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-xl sm:text-2xl mb-1">{Object.keys(analytics.countries).length}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Countries</div>
                    </div>
                  </Card>
                </div>

                {/* Analytics Preview */}
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-medium mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Link Analytics
                  </h3>
                  
                  <Tabs value={activeAnalyticsTab} onValueChange={setActiveAnalyticsTab}>
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                      <TabsTrigger value="devices" className="text-xs sm:text-sm">Devices</TabsTrigger>
                      <TabsTrigger value="platforms" className="text-xs sm:text-sm">Platforms</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3">
                      {Object.entries(analytics.countries).map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{country}</span>
                          </div>
                          <Badge variant="secondary">{count} clicks</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.countries).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
                      )}
                    </TabsContent>

                    <TabsContent value="devices" className="space-y-3">
                      {Object.entries(analytics.devices).map(([device, count]) => (
                        <div key={device} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            {device === 'mobile' ? (
                              <Smartphone className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Monitor className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm capitalize">{device}</span>
                          </div>
                          <Badge variant="secondary">{count} clicks</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.devices).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
                      )}
                    </TabsContent>

                    <TabsContent value="platforms" className="space-y-3">
                      {Object.entries(analytics.platforms).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between py-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-gray-400" />
                            <span className="text-sm capitalize">{platform.replace('-', ' ')}</span>
                          </div>
                          <Badge variant="secondary">{count} clicks</Badge>
                        </div>
                      ))}
                      {Object.keys(analytics.platforms).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No data yet</p>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Test Button */}
                  <Button
                    onClick={handleSimulateClick}
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                  >
                    Simulate Click (Testing)
                  </Button>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">What's Next?</h3>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Share your smart link on social media</li>
                    <li>• Track clicks and conversions in Analytics</li>
                    <li>• Edit platform links anytime from Marketing dashboard</li>
                    <li>• Create QR codes for offline promotion</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Back to Marketing
                </Button>
                <Button
                  onClick={() => {
                    setStep(1);
                    setClickEvents([]);
                    setFormData({
                      linkTitle: '',
                      artistName: '',
                      releaseTitle: '',
                      customSlug: '',
                      coverImage: '',
                      enableGeoRouting: true,
                      enableDeviceRouting: true,
                      platforms: {
                        'spotify': '',
                        'apple-music': '',
                        'youtube-music': '',
                        'amazon-music': '',
                        'deezer': '',
                        'tidal': '',
                        'soundcloud': '',
                        'pandora': '',
                      },
                    });
                  }}
                  className="flex-1"
                >
                  Create Another Link
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}