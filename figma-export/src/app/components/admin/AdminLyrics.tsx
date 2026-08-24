import { useMemo, useState } from 'react';
import { Clock3, FileText, ListFilter, Search, ShieldCheck, Sparkles, Trash2, UploadCloud } from 'lucide-react';

const initialLyrics = [
  {
    id: 'lyric-101',
    title: 'Song Title',
    artist: 'Tope Banjo',
    album: 'Album Name',
    status: 'Published',
    language: 'English',
    source: 'Artist submission',
    copyright: 'Cleared',
    verified: true,
    updatedAt: '2026-08-12',
  },
  {
    id: 'lyric-102',
    title: 'City Light',
    artist: 'J. Akin',
    album: 'Night Shift',
    status: 'Pending Review',
    language: 'English',
    source: 'Upload',
    copyright: 'Review required',
    verified: false,
    updatedAt: '2026-08-10',
  },
  {
    id: 'lyric-103',
    title: 'Goodness of God',
    artist: 'Ayo Faith',
    album: 'Grace Road',
    status: 'Verified',
    language: 'Yoruba',
    source: 'Admin import',
    copyright: 'Cleared',
    verified: true,
    updatedAt: '2026-08-08',
  },
];

const statusColors: Record<string, string> = {
  Published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Pending Review': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Verified: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Draft: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Unpublished: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function AdminLyrics() {
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredLyrics = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lyrics.filter((item) => {
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesSearch = !query || [item.title, item.artist, item.album, item.language].join(' ').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [lyrics, search, statusFilter]);

  const stats = useMemo(() => ({
    total: lyrics.length,
    published: lyrics.filter((item) => item.status === 'Published').length,
    pending: lyrics.filter((item) => item.status === 'Pending Review').length,
    verified: lyrics.filter((item) => item.status === 'Verified').length,
  }), [lyrics]);

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-4 text-white lg:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[#7B61FF]/10 bg-[#121826] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00E5FF]">Content</p>
            <h1 className="mt-2 text-3xl font-black">Lyrics</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-4 py-2.5 font-semibold text-black transition hover:opacity-90">
            <UploadCloud className="h-4 w-4" />
            Add Lyrics
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total lyrics" value={stats.total.toString()} icon={<FileText className="h-4 w-4" />} />
          <StatCard title="Published" value={stats.published.toString()} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatCard title="Pending review" value={stats.pending.toString()} icon={<Clock3 className="h-4 w-4" />} />
          <StatCard title="Verified" value={stats.verified.toString()} icon={<Sparkles className="h-4 w-4" />} />
        </div>

        <div className="rounded-[1.75rem] border border-[#7B61FF]/10 bg-[#121826] p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2.5">
              <Search className="h-4 w-4 text-[#8FA3BE]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search lyrics, artist, album..."
                className="w-full bg-transparent text-sm text-white placeholder:text-[#7F8AA0] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F172A] px-2.5 py-2">
              <ListFilter className="h-4 w-4 text-[#8FA3BE]" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                <option className="bg-[#121826]">All</option>
                <option className="bg-[#121826]">Published</option>
                <option className="bg-[#121826]">Pending Review</option>
                <option className="bg-[#121826]">Verified</option>
                <option className="bg-[#121826]">Draft</option>
                <option className="bg-[#121826]">Unpublished</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[#A0A7B8]">
                  <th className="px-3 py-3 font-medium">Title</th>
                  <th className="px-3 py-3 font-medium">Artist</th>
                  <th className="px-3 py-3 font-medium">Album</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Language</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Verified</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLyrics.map((item) => (
                  <tr key={item.id} className="border-b border-white/8 last:border-0">
                    <td className="px-3 py-3 font-medium text-white">{item.title}</td>
                    <td className="px-3 py-3 text-[#C9D2E2]">{item.artist}</td>
                    <td className="px-3 py-3 text-[#C9D2E2]">{item.album}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColors[item.status] || 'border-white/10 bg-white/5 text-white'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[#C9D2E2]">{item.language}</td>
                    <td className="px-3 py-3 text-[#C9D2E2]">{item.source}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.verified ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                        {item.verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#E8EDF7] hover:bg-white/10">Edit</button>
                        <button className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/15">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-[#7B61FF]/10 bg-[#121826] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#A0A7B8]">{title}</p>
        <div className="rounded-lg bg-[#7B61FF]/15 p-2 text-[#7B61FF]">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
