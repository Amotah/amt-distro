import { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Globe, Instagram, Youtube, Save, Loader2, Check,
  AlertCircle, Camera, X, Plus, ExternalLink, Twitter,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getCurrentUserProfile, updateUserProfile, type UserProfile } from '../../utils/user-api';
import { supabase } from '../../../../utils/supabase/client';
import { uploadProfileMedia } from '../../utils/profile-media-upload';

const GENRES = [
  'Afrobeats', 'Afropop', 'Amapiano', 'R&B', 'Hip-Hop', 'Rap', 'Pop', 'Electronic',
  'Dance', 'Soul', 'Gospel', 'Highlife', 'Fuji', 'Juju', 'Reggae', 'Dancehall',
  'Trap', 'House', 'Techno', 'Jazz', 'Classical', 'Country', 'Rock', 'Alternative',
];

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United States', 'United Kingdom',
  'Canada', 'Australia', 'Germany', 'France', 'Brazil', 'Jamaica', 'Tanzania', 'Uganda',
  'Ethiopia', 'Egypt', 'Senegal', 'Ivory Coast', 'Cameroon', 'Zimbabwe',
];

export function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', artistName: '', labelName: '',
    bio: '', country: '', website: '',
    social: { twitter: '', instagram: '', tiktok: '', youtube: '' },
    genres: [] as string[],
    visibility: { publicProfile: true, bioVisible: true, followersVisible: true },
  });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [genreOpen, setGenreOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      setProfile(p);
      setForm({
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        artistName: p.artistName ?? '',
        labelName: p.labelName ?? '',
        bio: p.bio ?? '',
        country: p.country ?? '',
        website: p.socialLinks?.website ?? '',
        social: {
          twitter: p.socialLinks?.twitter ?? '',
          instagram: p.socialLinks?.instagram ?? '',
          tiktok: p.socialLinks?.tiktok ?? '',
          youtube: p.socialLinks?.youtube ?? '',
        },
        genres: p.genres ?? [],
        visibility: { publicProfile: true, bioVisible: true, followersVisible: true },
      });
      setAvatarPreview(p.profileImage ?? null);
    }).catch(() => setError('Failed to load profile.')).finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const setSocial = (key: string, value: string) => {
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
    setDirty(true);
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const url = await uploadProfileMedia(file, 'profile-images');
      await updateUserProfile({ profileImage: url });
      setAvatarPreview(url);
      setDirty(false);
    } catch {
      setError('Failed to upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await updateUserProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        artistName: form.artistName || undefined,
        labelName: form.labelName || undefined,
        bio: form.bio,
        country: form.country,
        genres: form.genres,
        socialLinks: {
          twitter: form.social.twitter || undefined,
          instagram: form.social.instagram || undefined,
          tiktok: form.social.tiktok || undefined,
          youtube: form.social.youtube || undefined,
          website: form.website || undefined,
        },
      });
      setSaved(true); setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGenre = (g: string) => {
    const next = form.genres.includes(g)
      ? form.genres.filter((x) => x !== g)
      : [...form.genres, g];
    set('genres', next);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
    </div>
  );

  const isLabel = profile?.role === 'partner';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Profile Settings</h2>
        <p className="text-sm text-[#555] mt-0.5">Update your public profile and personal details</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-start gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B00]/30 to-[#FFD600]/20 border border-white/10 overflow-hidden flex items-center justify-center">
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              : <User className="w-8 h-8 text-[#555]" />}
          </div>
          {avatarUploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Profile Picture</p>
          <p className="text-xs text-[#555] mb-3">JPG, PNG or WebP. Max 5 MB.</p>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Upload profile picture" onChange={handleAvatarPick} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}
              className="h-8 border-white/10 text-[#B3B3B3] hover:bg-[#1a1a1a] text-xs">
              <Camera className="w-3.5 h-3.5 mr-1.5" /> Change Photo
            </Button>
            {avatarPreview && (
              <Button size="sm" variant="outline" onClick={async () => {
                await updateUserProfile({ profileImage: '' });
                setAvatarPreview(null);
              }} className="h-8 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
                <X className="w-3.5 h-3.5 mr-1.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">First Name</Label>
          <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
            className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">Last Name</Label>
          <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
            className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
        </div>

        {/* Email — display only */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" />
            <Input value={profile?.email ?? ''} disabled
              className="h-10 pl-9 bg-[#0d0d0d] border-white/5 text-[#555] cursor-not-allowed" />
          </div>
          <p className="text-[10px] text-[#444]">Email changes require identity verification — contact support.</p>
        </div>

        {isLabel ? (
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-[#B3B3B3] text-sm">Label Name</Label>
            <Input value={form.labelName} onChange={(e) => set('labelName', e.target.value)}
              placeholder="Your label name" className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
          </div>
        ) : (
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-[#B3B3B3] text-sm">Stage / Artist Name</Label>
            <Input value={form.artistName} onChange={(e) => set('artistName', e.target.value)}
              placeholder="Your artist name" className="h-10 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
          </div>
        )}

        <div className="sm:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[#B3B3B3] text-sm">Bio</Label>
            <span className={`text-[11px] ${form.bio.length > 480 ? 'text-red-400' : 'text-[#555]'}`}>{form.bio.length}/500</span>
          </div>
          <textarea
            value={form.bio}
            maxLength={500}
            rows={4}
            onChange={(e) => set('bio', e.target.value)}
            placeholder="Tell your fans about yourself…"
            className="w-full rounded-lg bg-[#111] border border-white/10 text-white placeholder:text-[#333] focus:outline-none focus:border-[#FF6B00]/60 px-3 py-2.5 text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">Country</Label>
          <select
            title="Country"
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
            className="w-full h-10 rounded-lg bg-[#111] border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#FF6B00]/60"
          >
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[#B3B3B3] text-sm">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" />
            <Input value={form.website} onChange={(e) => set('website', e.target.value)}
              placeholder="https://yoursite.com"
              className="h-10 pl-9 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60" />
          </div>
        </div>
      </div>

      {/* Genres */}
      <div className="space-y-2">
        <Label className="text-[#B3B3B3] text-sm">Genres</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.genres.map((g) => (
            <span key={g} className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF6B00] text-xs px-2.5 py-1">
              {g}
              <button type="button" title={`Remove ${g}`} onClick={() => toggleGenre(g)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => setGenreOpen(!genreOpen)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 text-[#555] hover:border-[#FF6B00]/40 hover:text-[#B3B3B3] text-xs px-2.5 py-1 transition-colors">
            <Plus className="w-3 h-3" /> Add genre
          </button>
        </div>
        {genreOpen && (
          <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#111] border border-white/10">
            {GENRES.filter((g) => !form.genres.includes(g)).map((g) => (
              <button key={g} type="button" onClick={() => { toggleGenre(g); }}
                className="rounded-full border border-white/10 text-[#B3B3B3] hover:bg-[#FF6B00]/15 hover:border-[#FF6B00]/40 hover:text-[#FF6B00] text-xs px-2.5 py-1 transition-colors">
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <Label className="text-[#B3B3B3] text-sm">Social Links</Label>
        {[
          { key: 'twitter', Icon: Twitter, placeholder: 'https://x.com/yourhandle', label: 'X / Twitter' },
          { key: 'instagram', Icon: Instagram, placeholder: 'https://instagram.com/you', label: 'Instagram' },
          { key: 'youtube', Icon: Youtube, placeholder: 'https://youtube.com/@channel', label: 'YouTube' },
          { key: 'tiktok', Icon: ExternalLink, placeholder: 'https://tiktok.com/@you', label: 'TikTok' },
        ].map(({ key, Icon, placeholder, label }) => (
          <div key={key} className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#333]" />
            <Input
              value={(form.social as Record<string,string>)[key]}
              onChange={(e) => setSocial(key, e.target.value)}
              placeholder={`${label} — ${placeholder}`}
              className="h-10 pl-9 bg-[#111] border-white/10 text-white placeholder:text-[#333] focus:border-[#FF6B00]/60"
            />
          </div>
        ))}
      </div>

      {/* Visibility toggles */}
      <div className="rounded-xl border border-white/8 bg-[#111] p-4 space-y-3">
        <p className="text-sm font-semibold text-white mb-1">Profile Visibility</p>
        {[
          { key: 'publicProfile', label: 'Public profile', desc: 'Allow others to find you in search' },
          { key: 'bioVisible', label: 'Bio visible', desc: 'Show your bio on your public profile' },
          { key: 'followersVisible', label: 'Follower count visible', desc: 'Display follower count publicly' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{label}</p>
              <p className="text-xs text-[#555]">{desc}</p>
            </div>
            <button
              type="button"
              title={`Toggle ${label}`}
              onClick={() => {
                setForm((f) => ({ ...f, visibility: { ...f.visibility, [key]: !f.visibility[key as keyof typeof f.visibility] } }));
                setDirty(true);
              }}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${(form.visibility as Record<string,boolean>)[key] ? 'bg-[#FF6B00]' : 'bg-[#2a2a2a]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${(form.visibility as Record<string,boolean>)[key] ? 'translate-x-4.5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={!dirty || saving}
          className="h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#FFD600] text-white font-semibold px-6 disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
}
