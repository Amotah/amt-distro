import { useState, useEffect } from 'react';
import { getCurrentUserProfile, getUserStats } from '../utils/user-api';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Upload,
  Music,
  Image as ImageIcon,
  X,
  Check,
  Plus,
  Calendar,
  Globe,
  Info,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import MusicPlatformLogos from './MusicPlatformLogos';

const genres = [
  'Pop',
  'Rock',
  'Hip Hop',
  'Electronic',
  'R&B',
  'Country',
  'Jazz',
  'Classical',
  'Reggae',
  'Latin',
  'Alternative',
  'Indie',
];

const platforms = [
  { id: 'spotify', name: 'Spotify', selected: true },
  { id: 'apple_music', name: 'Apple Music', selected: true },
  { id: 'youtube_music', name: 'YouTube Music', selected: true },
  { id: 'amazon_music', name: 'Amazon Music', selected: true },
  { id: 'deezer', name: 'Deezer', selected: true },
  { id: 'tidal', name: 'TIDAL', selected: true },
  { id: 'soundcloud', name: 'SoundCloud', selected: false },
  { id: 'pandora', name: 'Pandora', selected: false },
];

interface Track {
  id: number;
  name: string;
  file: File | null;
  duration: string;
}

export function UploadPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [uploadBlocked, setUploadBlocked] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const p = await getCurrentUserProfile();
        const s = await getUserStats();
        setProfile(p);
        setStats(s);
      } catch (e) {
        // ignore for now
      }
    }
    fetchUserInfo();
  }, []);
  const [releaseType, setReleaseType] = useState<'single' | 'album' | 'ep'>('single');
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, name: '', file: null, duration: '0:00' },
  ]);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    platforms.map((p) => p.selected)
  );
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleCoverArtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverArt(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTrack = () => {
    setTracks([
      ...tracks,
      { id: tracks.length + 1, name: '', file: null, duration: '0:00' },
    ]);
  };

  const removeTrack = (id: number) => {
    setTracks(tracks.filter((track) => track.id !== id));
  };

  const togglePlatform = (index: number) => {
    const newSelected = [...selectedPlatforms];
    newSelected[index] = !newSelected[index];
    setSelectedPlatforms(newSelected);
  };

  const handleSubmitRelease = () => {
    setIsSubmitted(true);
  };

  const handleNewRelease = () => {
    // Reset form
    setIsSubmitted(false);
    setStep(1);
    setTracks([{ id: 1, name: '', file: null, duration: '0:00' }]);
    setCoverArt(null);
    setCoverPreview('');
    setSelectedGenre('');
    setReleaseType('single');
  };

  return (
    <section id="upload" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Upload restriction message */}
        {uploadBlocked && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
            {upgradeMessage}
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl mb-4">Upload Your Music</h1>
          <p className="text-xl text-gray-600">
            Share your music with millions of listeners worldwide
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Details' },
              { num: 3, label: 'Distribution' },
              { num: 4, label: 'Review' },
            ].map((s, index) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= s.num
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                  </div>
                  <span className="text-sm mt-2">{s.label}</span>
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s.num ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Upload Files */}
        {step === 1 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Upload Your Tracks</h2>

            {/* Release Type */}
            <div className="mb-8">
              <Label className="mb-4 block">Release Type</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(['single', 'ep', 'album'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReleaseType(type)}
                    className={`p-4 border-2 rounded-lg capitalize transition-all ${
                      releaseType === type
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Cover Art Upload */}
            <div className="mb-8">
              <Label className="mb-4 block">Cover Art (Required)</Label>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-600 transition-colors relative overflow-hidden"
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Upload Cover Art</p>
                        <p className="text-sm text-gray-500 mt-1">
                          3000x3000px minimum
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="cover-upload"
                    type="file"
                    title="Upload cover art"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverArtUpload}
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Image Requirements</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Minimum 3000x3000 pixels</li>
                          <li>• Square format (1:1 ratio)</li>
                          <li>• JPG or PNG format</li>
                          <li>• Maximum 10MB file size</li>
                          <li>• RGB color mode</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Track Upload */}
            <div className="mb-8">
              <Label className="mb-4 block">Audio Files</Label>
              <div className="space-y-4">
                {tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-600 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          title={`Track ${index + 1} name`}
                          placeholder={`Track ${index + 1} name`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                          value={track.name}
                          onChange={(e) => {
                            const newTracks = [...tracks];
                            newTracks[index].name = e.target.value;
                            setTracks(newTracks);
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`track-${track.id}`)?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {track.file ? 'Change' : 'Upload'}
                      </Button>
                      {tracks.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrack(track.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <input
                        id={`track-${track.id}`}
                        type="file"
                        title={`Upload audio for track ${index + 1}`}
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const newTracks = [...tracks];
                            newTracks[index].file = file;
                            setTracks(newTracks);
                          }
                        }}
                      />
                    </div>
                    {track.file && (
                      <div className="mt-2 text-sm text-gray-600 ml-14">
                        {track.file.name} • {(track.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    )}
                  </div>
                ))}

                {releaseType !== 'single' && (
                  <Button variant="outline" onClick={addTrack} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Track
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Accepted formats: WAV, FLAC, AIFF (16-bit or 24-bit, 44.1kHz or higher)
              </p>
            </div>

            <Button onClick={() => {
              setStep(2);
            }} size="lg" className="w-full">
              Continue to Details
            </Button>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Release Details</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Release Title *</Label>
                <Input id="title" placeholder="Enter your release title" className="mt-2" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="artist">Primary Artist *</Label>
                  <Input id="artist" placeholder="Artist name" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="featuring">Featuring Artists</Label>
                  <Input id="featuring" placeholder="Optional" className="mt-2" />
                </div>
              </div>

              <div>
                <Label htmlFor="genre">Genre *</Label>
                <select
                  id="genre"
                  title="Genre"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 mt-2"
                >
                  <option value="">Select a genre</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="label">Record Label</Label>
                  <Input
                    id="label"
                    placeholder="Independent (default)"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Primary Language *</Label>
                  <select
                    id="language"
                    title="Primary language"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 mt-2"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Portuguese</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell listeners about your music..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="copyright">Copyright ©</Label>
                  <Input
                    id="copyright"
                    placeholder="2024 Artist Name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="publisher">Publisher ℗</Label>
                  <Input
                    id="publisher"
                    placeholder="2024 Artist Name"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="upc">UPC/EAN Barcode</Label>
                <Input
                  id="upc"
                  placeholder="Leave blank to auto-generate"
                  className="mt-2"
                />
                <p className="text-sm text-gray-600 mt-1">
                  We'll automatically generate one if you don't have it
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue to Distribution
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Distribution */}
        {step === 3 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Distribution Settings</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="release-date">Release Date *</Label>
                <div className="mt-2 relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="release-date"
                    type="date"
                    className="pl-10"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Must be at least 2 weeks from today for pre-release campaigns
                </p>
              </div>

              <div>
                <Label className="mb-4 block">
                  <Globe className="inline w-5 h-5 mr-2" />
                  Select Platforms
                </Label>
                <div className="grid md:grid-cols-2 gap-4">
                  {platforms.map((platform, index) => (
                    <div
                      key={platform.name}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPlatforms[index]
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePlatform(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MusicPlatformLogos platforms={[platform.id]} size={28} hideLabels compact />
                          <span className="font-medium">{platform.name}</span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            selectedPlatforms[index]
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedPlatforms[index] && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900 mb-1">
                      Distribution Information
                    </p>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Your music will appear on selected platforms within 24-48 hours</li>
                      <li>• Pre-save campaigns available for releases 2+ weeks away</li>
                      <li>• You can always add more platforms later</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-4 block">Additional Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="content-id" defaultChecked />
                    <label htmlFor="content-id" className="cursor-pointer">
                      Enable Content ID (YouTube copyright protection)
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="presave" />
                    <label htmlFor="presave" className="cursor-pointer">
                      Enable pre-save campaign
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="tiktok" defaultChecked />
                    <label htmlFor="tiktok" className="cursor-pointer">
                      Make available for TikTok & Instagram Reels
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                Continue to Review
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Review & Submit</h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Release Summary</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Release Type</p>
                      <p className="capitalize">{releaseType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Number of Tracks</p>
                      <p>{tracks.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Selected Platforms</p>
                      <p>{selectedPlatforms.filter(Boolean).length} platforms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cover Art</p>
                      <p>{coverArt ? 'Uploaded ✓' : 'Not uploaded'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4">Terms & Conditions</h3>
                <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-gray-600">
                  <p className="mb-3">
                    By submitting your music, you confirm that:
                  </p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>You own or have the rights to distribute this content</li>
                    <li>The content doesn't infringe on any third-party copyrights</li>
                    <li>All metadata and information provided is accurate</li>
                    <li>You accept our distribution terms and conditions</li>
                    <li>You understand that distribution may take 1-14 business days</li>
                    <li>You retain 100% ownership of your music and royalties</li>
                  </ul>
                </div>
                <div className="flex items-start space-x-3 mt-4">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="cursor-pointer">
                    I have read and agree to the terms and conditions
                  </label>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 mb-1">
                      You're Ready to Go!
                    </p>
                    <p className="text-sm text-green-800">
                      Once submitted, we'll review your release and distribute it to all selected
                      platforms within 1-14 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                Back
              </Button>
              <Button size="lg" className="flex-1" onClick={handleSubmitRelease} disabled={uploadBlocked}>
                Submit Release
              </Button>
            </div>
          </Card>
        )}

        {/* Submission Confirmation */}
        {isSubmitted && (
          <Card className="p-8">
            <h2 className="text-2xl mb-6">Release Submitted</h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Release Summary</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Release Type</p>
                      <p className="capitalize">{releaseType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Number of Tracks</p>
                      <p>{tracks.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Selected Platforms</p>
                      <p>{selectedPlatforms.filter(Boolean).length} platforms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cover Art</p>
                      <p>{coverArt ? 'Uploaded ✓' : 'Not uploaded'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 mb-1">
                      Your Release is on Its Way!
                    </p>
                    <p className="text-sm text-green-800">
                      We've received your release and will distribute it to all selected platforms
                      within 1-14 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button size="lg" className="flex-1" onClick={handleNewRelease}>
                Upload New Release
              </Button>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}