import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Youtube, Eye, ThumbsUp, Users, Play, Plus } from 'lucide-react';

export function ArtistYouTubeChannel() {
  const stats = [
    { label: 'Subscribers', value: '12.5K', icon: Users },
    { label: 'Total Views', value: '450K', icon: Eye },
    { label: 'Monthly Views', value: '45K', icon: Play },
    { label: 'Avg. Likes', value: '2.1K', icon: ThumbsUp },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">YouTube Artist Channel</h1>
          <p className="text-[#B3B3B3]">Manage and grow your YouTube presence</p>
        </div>
        <Button className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]">
          <Plus className="w-5 h-5 mr-2" />
          Upload Video
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FF6B00]/12">
                  <Icon className="h-6 w-6 text-[#FF6B00]" />
                </div>
              </div>
              <div className="text-3xl font-semibold mb-1">{stat.value}</div>
              <div className="text-sm text-[#B3B3B3]">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      <Card className="border border-[#FF6B00]/20 bg-gradient-to-br from-[#161616] via-[#1E140D] to-[#2A1808] p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#FF6B00]">
            <Youtube className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold">YouTube Growth Tips</h3>
            <p className="text-[#B3B3B3]">Best practices for growing your channel</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3">Content Strategy</h4>
            <ul className="space-y-2 text-sm text-[#E5E5E5]">
              <li>• Post consistently (2-3 videos per week)</li>
              <li>• Create engaging thumbnails</li>
              <li>• Use YouTube Shorts</li>
              <li>• Engage with comments</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Optimization</h4>
            <ul className="space-y-2 text-sm text-[#E5E5E5]">
              <li>• Optimize video descriptions</li>
              <li>• Add end screens and cards</li>
              <li>• Create playlists</li>
              <li>• Cross-promote on social media</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
