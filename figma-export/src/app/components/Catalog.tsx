import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Upload,
  Search,
  Filter,
  Music,
  Calendar,
  MoreVertical,
  Plus,
  Play,
  Download,
  Edit,
  Trash2,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const mockReleases = [
  {
    id: 1,
    title: 'Summer Vibes',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZHMlMjBtdXNpY3xlbnwxfHx8fDE3NjYyMjk0NTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'Live',
    type: 'Single',
    streams: '125.4K',
    revenue: '₦142,833.50',
    releaseDate: '2024-06-15',
    platforms: ['Spotify', 'Apple Music', 'YouTube Music'],
  },
  {
    id: 2,
    title: 'Midnight Dreams',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1664607871571-dd32817ea8ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3QlMjBoZWFkcGhvbmVzfGVufDF8fHx8MTc2NjI2MTk0M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'Processing',
    type: 'Album',
    streams: '0',
    revenue: '₦0.00',
    releaseDate: '2024-12-28',
    platforms: ['Spotify', 'Apple Music'],
  },
  {
    id: 3,
    title: 'Electric Hearts',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1637759898746-283c2d6c24c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHByb2R1Y2VyJTIwc3R1ZGlvfGVufDF8fHx8MTc2NjI2MTk0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'Live',
    type: 'EP',
    streams: '89.2K',
    revenue: '₦104,268.80',
    releaseDate: '2024-08-22',
    platforms: ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music'],
  },
  {
    id: 4,
    title: 'Acoustic Sessions',
    artist: 'Your Artist Name',
    coverArt: 'https://images.unsplash.com/photo-1629426958038-a4cb6e3830a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW55bCUyMHJlY29yZHMlMjBtdXNpY3xlbnwxfHx8fDE3NjYyMjk0NTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    status: 'Scheduled',
    type: 'Single',
    streams: '0',
    revenue: '₦0.00',
    releaseDate: '2025-01-15',
    platforms: ['Spotify', 'Apple Music'],
  },
];

interface CatalogProps {
  onNavigateToUpload: () => void;
}

export function Catalog({ onNavigateToUpload }: CatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live':
        return 'bg-green-100 text-green-700';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredReleases = mockReleases.filter((release) => {
    const matchesSearch = release.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && release.status.toLowerCase() === activeTab;
  });

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl mb-2">My Catalog</h1>
            <p className="text-gray-600">Manage all your music releases in one place</p>
          </div>
          <Button size="lg" onClick={onNavigateToUpload} className="gap-2">
            <Upload className="w-5 h-5" />
            Upload New Release
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Total Releases</div>
              <Music className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl">12</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Live</div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>
            <div className="text-3xl">8</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Processing</div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            </div>
            <div className="text-3xl">2</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600">Scheduled</div>
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>
            <div className="text-3xl">2</div>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search releases..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </Button>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Releases</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Releases Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReleases.map((release) => (
            <Card key={release.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative group">
                <ImageWithFallback
                  src={release.coverArt}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                <Badge className={`absolute top-4 left-4 ${getStatusColor(release.status)}`}>
                  {release.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-4 right-4"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Release
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="p-4">
                <h3 className="text-xl mb-1 truncate">{release.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{release.artist}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{release.type}</Badge>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {new Date(release.releaseDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-600">Streams</div>
                    <div className="font-medium">{release.streams}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Revenue</div>
                    <div className="font-medium">{release.revenue}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {release.platforms.slice(0, 3).map((platform, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-gray-100 px-2 py-1 rounded"
                    >
                      {platform}
                    </div>
                  ))}
                  {release.platforms.length > 3 && (
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                      +{release.platforms.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredReleases.length === 0 && (
          <Card className="p-12 text-center">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl mb-2">No releases found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start by uploading your first release'}
            </p>
            {!searchQuery && (
              <Button onClick={onNavigateToUpload} className="gap-2">
                <Plus className="w-5 h-5" />
                Upload Your First Release
              </Button>
            )}
          </Card>
        )}
      </div>
    </section>
  );
}