import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  ArrowLeft,
  Calendar,
  Music,
  Link,
  Target,
  Users,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface NewCampaignProps {
  onBack: () => void;
}

const campaignTypes = [
  {
    id: 'pre-save',
    name: 'Pre-Save Campaign',
    description: 'Build hype before your release with pre-save links',
    icon: Calendar,
  },
  {
    id: 'release',
    name: 'Release Campaign',
    description: 'Promote your new music across all platforms',
    icon: Music,
  },
  {
    id: 'smart-link',
    name: 'Smart Link Promotion',
    description: 'Drive traffic to your universal music link',
    icon: Link,
  },
  {
    id: 'playlist',
    name: 'Playlist Pitching',
    description: 'Get your music featured on popular playlists',
    icon: Sparkles,
  },
];

const platforms = [
  'Spotify',
  'Apple Music',
  'YouTube Music',
  'Amazon Music',
  'Deezer',
  'Tidal',
  'Pandora',
  'SoundCloud',
];

export function NewCampaign({ onBack }: NewCampaignProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    campaignType: 'release',
    campaignName: '',
    releaseTitle: '',
    artistName: '',
    startDate: '',
    endDate: '',
    targetPlatforms: ['Spotify', 'Apple Music', 'YouTube Music'],
    budget: '',
    targetAudience: '',
    description: '',
    coverImage: null as File | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlatformToggle = (platform: string) => {
    if (formData.targetPlatforms.includes(platform)) {
      setFormData({
        ...formData,
        targetPlatforms: formData.targetPlatforms.filter((p) => p !== platform),
      });
    } else {
      setFormData({
        ...formData,
        targetPlatforms: [...formData.targetPlatforms, platform],
      });
    }
  };

  const handleSubmit = () => {
    console.log('Campaign created:', formData);
    onBack();
  };

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Marketing
          </Button>
          <h1 className="text-4xl mb-2">Create New Campaign</h1>
          <p className="text-gray-600">Launch a marketing campaign to promote your music</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= num
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {num}
                </div>
                {num < 3 && (
                  <div
                    className={`w-24 h-1 mx-2 ${step > num ? 'bg-purple-600' : 'bg-gray-300'}`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-20 mt-4">
            <span className={`text-sm ${step >= 1 ? 'text-purple-600' : 'text-gray-500'}`}>
              Campaign Type
            </span>
            <span className={`text-sm ${step >= 2 ? 'text-purple-600' : 'text-gray-500'}`}>
              Details
            </span>
            <span className={`text-sm ${step >= 3 ? 'text-purple-600' : 'text-gray-500'}`}>
              Review
            </span>
          </div>
        </div>

        {/* Step 1: Campaign Type */}
        {step === 1 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Choose Campaign Type</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {campaignTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    onClick={() => setFormData({ ...formData, campaignType: type.id })}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.campaignType === type.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          formData.campaignType === type.id
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            formData.campaignType === type.id ? 'text-white' : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-lg mb-1">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button size="lg" onClick={() => setStep(2)} className="w-full">
              Continue
            </Button>
          </Card>
        )}

        {/* Step 2: Campaign Details */}
        {step === 2 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Campaign Details</h2>
            <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  name="campaignName"
                  type="text"
                  placeholder="e.g., Summer Vibes Pre-Save"
                  value={formData.campaignName}
                  onChange={handleInputChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Release Info */}
              <div className="grid md:grid-cols-2 gap-6">
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
              </div>

              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              {/* Target Platforms */}
              <div>
                <Label>Target Platforms *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {platforms.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handlePlatformToggle(platform)}
                    >
                      <Checkbox
                        checked={formData.targetPlatforms.includes(platform)}
                        onCheckedChange={() => handlePlatformToggle(platform)}
                      />
                      <span className="text-sm">{platform}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <Label htmlFor="budget">Campaign Budget (Optional)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  placeholder="₦0"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-1">Enter your marketing budget in Nigerian Naira</p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Campaign Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Describe your campaign goals and strategy..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Review & Launch */}
        {step === 3 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Review Your Campaign</h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Campaign Type</div>
                  <div className="font-medium">
                    {campaignTypes.find((t) => t.id === formData.campaignType)?.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Campaign Name</div>
                  <div className="font-medium">{formData.campaignName}</div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Release Title</div>
                    <div className="font-medium">{formData.releaseTitle}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Artist Name</div>
                    <div className="font-medium">{formData.artistName}</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Start Date</div>
                    <div className="font-medium">
                      {formData.startDate
                        ? new Date(formData.startDate).toLocaleDateString()
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">End Date</div>
                    <div className="font-medium">
                      {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Target Platforms</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.targetPlatforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
                {formData.budget && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Budget</div>
                    <div className="font-medium">₦{formData.budget}</div>
                  </div>
                )}
                {formData.description && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Description</div>
                    <div className="text-sm">{formData.description}</div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">What happens next?</h3>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Your campaign will be created and set to "Active" status</li>
                  <li>• You'll receive a unique campaign tracking link</li>
                  <li>• Analytics will be available in real-time</li>
                  <li>• You can edit or pause the campaign at any time</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Launch Campaign
              </Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
