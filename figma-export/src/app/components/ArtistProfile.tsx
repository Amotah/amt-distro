import React, { useState, useEffect } from 'react';
import * as userApi from '../utils/user-api';
import { supabase } from '../../../utils/supabase/client';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { uploadProfileMedia } from '../utils/profile-media-upload';
import { User, Mail, MapPin, Save, AlertCircle, CheckCircle, Link2, ShieldCheck, FileText } from 'lucide-react';
import { getArtistVerificationBadge, getArtistVerificationState } from '../utils/artist-verification';
import { Card } from './ui/card';

// Countries and States data (same as in UserManagement)
const COUNTRIES = [
  'Nigeria',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Ireland',
  'Portugal',
  'Greece',
  'Poland',
  'Czech Republic',
  'Hungary',
  'Slovakia',
  'Slovenia',
  'Croatia',
  'Bosnia and Herzegovina',
  'Serbia',
  'Montenegro',
  'Kosovo',
  'Albania',
  'North Macedonia',
  'Bulgaria',
  'Romania',
  'Moldova',
  'Ukraine',
  'Belarus',
  'Russia',
  'Estonia',
  'Latvia',
  'Lithuania',
  'South Africa',
  'Kenya',
  'Ghana',
  'Egypt',
  'Morocco',
  'Tunisia',
  'Algeria',
  'Libya',
  'Sudan',
  'Ethiopia',
  'Tanzania',
  'Uganda',
  'Rwanda',
  'Burundi',
  'Zimbabwe',
  'Zambia',
  'Malawi',
  'Mozambique',
  'Botswana',
  'Namibia',
  'Angola',
  'Democratic Republic of the Congo',
  'Republic of the Congo',
  'Gabon',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Niger',
  'Mali',
  'Burkina Faso',
  'Senegal',
  'Gambia',
  'Guinea',
  'Sierra Leone',
  'Liberia',
  'Côte d\'Ivoire',
  'Togo',
  'Benin',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Venezuela',
  'Ecuador',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'India',
  'China',
  'Japan',
  'South Korea',
  'Singapore',
  'Malaysia',
  'Thailand',
  'Indonesia',
  'Philippines',
  'Vietnam',
  'Myanmar',
  'Cambodia',
  'Laos',
  'Brunei',
  'East Timor',
  'Papua New Guinea',
  'New Zealand',
  'Fiji',
  'Samoa',
  'Tonga',
  'Vanuatu',
  'Solomon Islands',
  'Kiribati',
  'Tuvalu',
  'Nauru',
  'Marshall Islands',
  'Micronesia',
  'Palau',
  'Other'
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const getStatesForCountry = (country: string): string[] => {
  switch (country) {
    case 'Nigeria':
      return NIGERIAN_STATES;
    case 'United States':
      return US_STATES;
    default:
      return [];
  }
};

interface ArtistProfileProps {
  onClose?: () => void;
}

export function ArtistProfile({ onClose }: ArtistProfileProps) {
  const [profile, setProfile] = useState<userApi.UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingField, setUploadingField] = useState<'profileImage' | 'bannerImage' | 'verificationDocument' | null>(null);
  const [uploadProgress, setUploadProgress] = useState({
    profileImage: 0,
    bannerImage: 0,
    verificationDocument: 0,
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    artistName: '',
    labelName: '',
    profileImage: '',
    bannerImage: '',
    country: '',
    state: '',
    bio: '',
    genres: '',
    spotify: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    verificationRequestNotes: '',
    verificationDocumentUrl: '',
  });

  async function handleImageUpload(
    field: 'profileImage' | 'bannerImage' | 'verificationDocument',
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setUploadingField(field);
      setUploadProgress((current) => ({
        ...current,
        [field]: 0,
      }));

      const result = await uploadProfileMedia(file, (progress) => {
        setUploadProgress((current) => ({
          ...current,
          [field]: progress.progress,
        }));
      });

      const targetField = field === 'verificationDocument' ? 'verificationDocumentUrl' : field;

      setFormData((current) => ({
        ...current,
        [targetField]: result.url,
      }));
      setUploadProgress((current) => ({
        ...current,
        [field]: 100,
      }));
      if (field === 'verificationDocument') {
        setSuccess('Verification document uploaded successfully.');
      } else {
        setSuccess(field === 'profileImage' ? 'Profile picture uploaded successfully.' : 'Cover art uploaded successfully.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploadingField(null);
      event.target.value = '';
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await userApi.getCurrentUserProfile();
      setProfile(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        artistName: data.artistName || '',
        labelName: data.labelName || '',
        profileImage: data.profileImage || '',
        bannerImage: data.bannerImage || '',
        country: data.country || '',
        state: data.state || '',
        bio: data.bio || '',
        genres: (data.genres || []).join(', '),
        spotify: data.socialLinks?.spotify || '',
        instagram: data.socialLinks?.instagram || '',
        tiktok: data.socialLinks?.tiktok || '',
        youtube: data.socialLinks?.youtube || '',
        verificationRequestNotes: data.verification?.requestNotes || '',
        verificationDocumentUrl: data.verification?.idDocumentUrl || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const updates: Partial<userApi.UserProfile> = {};

      if (formData.firstName.trim()) {
        updates.firstName = formData.firstName.trim();
      }
      if (formData.lastName.trim()) {
        updates.lastName = formData.lastName.trim();
      }
      
      if (profile.role === 'artist' && formData.artistName.trim()) {
        updates.artistName = formData.artistName.trim();
      }
      if (profile.role === 'label' && formData.labelName.trim()) {
        updates.labelName = formData.labelName.trim();
      }
      updates.profileImage = formData.profileImage.trim() || undefined;
      updates.bannerImage = formData.bannerImage.trim() || undefined;
      
      if (formData.country) updates.country = formData.country;
      if (formData.state) updates.state = formData.state;
      if (formData.bio) updates.bio = formData.bio;

      if (profile.role === 'artist') {
        const genres = formData.genres
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean);

        updates.genres = genres;
        updates.socialLinks = {
          ...profile.socialLinks,
          spotify: formData.spotify.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          tiktok: formData.tiktok.trim() || undefined,
          youtube: formData.youtube.trim() || undefined,
        };

        updates.verification = {
          ...profile.verification,
          requestNotes: formData.verificationRequestNotes.trim() || undefined,
          idDocumentUrl: formData.verificationDocumentUrl.trim() || undefined,
          requestedAt: (formData.verificationRequestNotes.trim() || formData.verificationDocumentUrl.trim())
            ? profile.verification?.requestedAt || new Date().toISOString()
            : profile.verification?.requestedAt,
        };
      }

      const updated = await userApi.updateUserProfile(updates);
      setProfile(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword() {
    setError('');
    setSuccess('');
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: 'Password@1' });
      if (error) throw error;
      setSuccess('Password reset to Password@1. Please use it to login.');
    } catch (err: any) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-[#FF6B00]/20 bg-[#161616]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-red-200">Failed to load profile</p>
      </div>
    );
  }

  const verificationState = profile.role === 'artist' ? getArtistVerificationState(profile) : null;
  const verificationBadge = verificationState ? getArtistVerificationBadge(verificationState.status) : null;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[#FF6B00]/20 bg-[#161616] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.35)] [&_input]:border-[#FF6B00]/20 [&_input]:bg-[#0A0A0A] [&_input]:text-white [&_input]:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-[#FF6B00]/30 [&_select]:border-[#FF6B00]/20 [&_select]:bg-[#0A0A0A] [&_select]:text-white [&_select]:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-[#FF6B00]/30 [&_textarea]:border-[#FF6B00]/20 [&_textarea]:bg-[#0A0A0A] [&_textarea]:text-white [&_textarea]:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#FF6B00]/30">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="mt-2 text-[#B3B3B3]">Manage your personal and professional information</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-200">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <User className="w-5 h-5" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-[#FF6B00]/20 bg-[#120D09] px-4 py-2 text-[#B3B3B3]"
              />
              <p className="mt-1 text-xs text-[#888]">Email cannot be changed</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="profile-first-name" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  First Name
                </label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label htmlFor="profile-last-name" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Last Name
                </label>
                <input
                  id="profile-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-display-name" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                {profile.role === 'artist' ? 'Artist Name' : 'Label Name'}
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={profile.role === 'artist' ? formData.artistName : formData.labelName}
                onChange={(e) => {
                  if (profile.role === 'artist') {
                    setFormData({ ...formData, artistName: e.target.value });
                  } else {
                    setFormData({ ...formData, labelName: e.target.value });
                  }
                }}
                className="w-full rounded-lg px-4 py-2"
                placeholder={`Enter your ${profile.role === 'artist' ? 'artist' : 'label'} name`}
              />
              <p className="mt-1 text-xs text-[#888]">
                This stays separate from your personal first and last name and is used on the dashboard greeting.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-3 overflow-hidden rounded-2xl border border-[#FF6B00]/15 bg-[#120D09]">
                  <div className="relative h-28 bg-[linear-gradient(135deg,rgba(255,107,0,0.78),rgba(255,214,0,0.24),rgba(10,10,10,0.9))]">
                    {formData.bannerImage ? (
                      <ImageWithFallback
                        src={formData.bannerImage}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="relative px-4 pb-4">
                    <div className="-mt-8 flex items-end gap-3">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-[#161616] bg-[#0A0A0A] text-lg font-semibold text-white shadow-sm">
                        {formData.profileImage ? (
                          <ImageWithFallback
                            src={formData.profileImage}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>
                            {(profile.role === 'artist' ? formData.artistName : formData.labelName)
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join('') || 'AP'}
                          </span>
                        )}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-semibold text-white">
                          {profile.role === 'artist'
                            ? formData.artistName || 'Artist profile'
                            : formData.labelName || 'Label profile'}
                        </p>
                        <p className="text-xs text-[#B3B3B3]">Live dashboard preview</p>
                      </div>
                    </div>
                  </div>
                </div>

                <label htmlFor="profile-image-upload" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Upload Profile Picture
                </label>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  disabled={uploadingField !== null}
                  onChange={(event) => handleImageUpload('profileImage', event)}
                  className="w-full rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6B00]/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#FFD600]"
                />
                <p className="mt-1 text-xs text-[#888]">Upload a square image for the artist or label avatar.</p>
                {uploadProgress.profileImage > 0 && uploadingField === 'profileImage' ? (
                  <p className="mt-1 text-xs text-[#FFD600]">Uploading profile picture: {uploadProgress.profileImage}%</p>
                ) : null}

                <label htmlFor="profile-image-url" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Profile Picture URL
                </label>
                <input
                  id="profile-image-url"
                  type="url"
                  value={formData.profileImage}
                  onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label htmlFor="banner-image-upload" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Upload Cover Art
                </label>
                <input
                  id="banner-image-upload"
                  type="file"
                  accept="image/*"
                  disabled={uploadingField !== null}
                  onChange={(event) => handleImageUpload('bannerImage', event)}
                  className="w-full rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6B00]/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#FFD600]"
                />
                <p className="mt-1 text-xs text-[#888]">Upload a wide cover art image to match the dashboard banner.</p>
                {uploadProgress.bannerImage > 0 && uploadingField === 'bannerImage' ? (
                  <p className="mt-1 text-xs text-[#FFD600]">Uploading cover art: {uploadProgress.bannerImage}%</p>
                ) : null}

                <label htmlFor="banner-image-url" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Banner Image URL
                </label>
                <input
                  id="banner-image-url"
                  type="url"
                  value={formData.bannerImage}
                  onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-bio" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                Bio
              </label>
              <textarea
                id="profile-bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-lg px-4 py-2"
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <p className="mt-1 text-xs text-[#888]">{formData.bio.length}/500 characters</p>
            </div>

            {profile.role === 'artist' ? (
              <div>
                <label htmlFor="profile-genres" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Genres
                </label>
                <input
                  id="profile-genres"
                  type="text"
                  value={formData.genres}
                  onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="Afrobeats, Amapiano, Pop"
                />
                <p className="mt-1 text-xs text-[#888]">Separate genres with commas.</p>
              </div>
            ) : null}
          </div>
        </div>

        {profile.role === 'artist' ? (
          <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <Link2 className="w-5 h-5" />
              Social Links
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="profile-spotify" className="mb-1 block text-sm font-medium text-[#E5E7EB]">Spotify</label>
                <input id="profile-spotify" type="url" value={formData.spotify} onChange={(e) => setFormData({ ...formData, spotify: e.target.value })} className="w-full rounded-lg px-4 py-2" placeholder="https://open.spotify.com/..." />
              </div>
              <div>
                <label htmlFor="profile-instagram" className="mb-1 block text-sm font-medium text-[#E5E7EB]">Instagram</label>
                <input id="profile-instagram" type="url" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} className="w-full rounded-lg px-4 py-2" placeholder="https://instagram.com/..." />
              </div>
              <div>
                <label htmlFor="profile-tiktok" className="mb-1 block text-sm font-medium text-[#E5E7EB]">TikTok</label>
                <input id="profile-tiktok" type="url" value={formData.tiktok} onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })} className="w-full rounded-lg px-4 py-2" placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <label htmlFor="profile-youtube" className="mb-1 block text-sm font-medium text-[#E5E7EB]">YouTube</label>
                <input id="profile-youtube" type="url" value={formData.youtube} onChange={(e) => setFormData({ ...formData, youtube: e.target.value })} className="w-full rounded-lg px-4 py-2" placeholder="https://youtube.com/..." />
              </div>
            </div>
          </div>
        ) : null}

        {profile.role === 'artist' ? (
          <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <ShieldCheck className="w-5 h-5" />
              Verification Request
            </h2>

            <div className="mb-4 rounded-lg border border-[#FF6B00]/15 bg-[#120D09] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#B3B3B3]">Current status</p>
                  <p className="mt-1 font-semibold text-white">{verificationBadge?.label || 'Unverified'}</p>
                </div>
                {verificationBadge ? (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${verificationBadge.className}`}>
                    {verificationBadge.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-[#B3B3B3]">
                Email confirmation, optional ID verification, and profile review are used to approve artist verification.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="verification-request-notes" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Verification Request Notes
                </label>
                <textarea
                  id="verification-request-notes"
                  value={formData.verificationRequestNotes}
                  onChange={(e) => setFormData({ ...formData, verificationRequestNotes: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="Add context for the review team, achievements, official links, or anything that supports verification."
                  rows={4}
                />
              </div>

              <div>
                <label htmlFor="verification-document-upload" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  Optional ID Upload
                </label>
                <input
                  id="verification-document-upload"
                  type="file"
                  accept="image/*"
                  disabled={uploadingField !== null}
                  onChange={(event) => handleImageUpload('verificationDocument', event)}
                  className="w-full rounded-lg border border-[#FF6B00]/20 bg-[#0A0A0A] px-4 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#FF6B00]/12 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#FFD600]"
                />
                <p className="mt-1 text-xs text-[#888]">Optional. Upload an image of an ID document if you want manual identity review.</p>
                {uploadProgress.verificationDocument > 0 && uploadingField === 'verificationDocument' ? (
                  <p className="mt-1 text-xs text-[#FFD600]">Uploading verification document: {uploadProgress.verificationDocument}%</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="verification-document-url" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                  ID Document URL
                </label>
                <input
                  id="verification-document-url"
                  type="url"
                  value={formData.verificationDocumentUrl}
                  onChange={(e) => setFormData({ ...formData, verificationDocumentUrl: e.target.value })}
                  className="w-full rounded-lg px-4 py-2"
                  placeholder="https://..."
                />
              </div>

              <div className="rounded-lg border border-[#FF6B00]/15 bg-[#120D09] p-4 text-sm text-[#B3B3B3]">
                <div className="flex items-center gap-2 font-medium text-white">
                  <FileText className="w-4 h-4" />
                  Verification checklist
                </div>
                <ul className="mt-3 space-y-2">
                  <li>• Email confirmation: {verificationState?.verification.emailConfirmed ? 'complete' : 'pending'}</li>
                  <li>• ID verification: {verificationState?.verification.idVerified ? 'complete' : verificationState?.verification.idVerificationOptional === false ? 'required' : 'optional'}</li>
                  <li>• Profile review: {verificationState?.verification.profileReviewed ? 'complete' : 'pending'}</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* Location Info */}
        <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <MapPin className="w-5 h-5" />
            Location
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="profile-country" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                Country
              </label>
              <select
                id="profile-country"
                title="Country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value, state: '' })
                }
                className="w-full rounded-lg px-4 py-2"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="profile-state" className="mb-1 block text-sm font-medium text-[#E5E7EB]">
                State/Province
              </label>
              <select
                id="profile-state"
                title="State or Province"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={!formData.country || getStatesForCountry(formData.country).length === 0}
                className="w-full rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:bg-[#120D09] disabled:text-[#666]"
              >
                <option value="">
                  {formData.country ? 'Select State/Province' : 'Select Country First'}
                </option>
                {formData.country &&
                  getStatesForCountry(formData.country).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>


        {/* Plan Info */}
        <div className="rounded-lg border border-[#FF6B00]/15 bg-[#0A0A0A] p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#B3B3B3]">Current Plan</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {profile.subscriptionTier === 'free'
                  ? 'Free'
                  : profile.subscriptionTier === 'artist'
                  ? 'Paid Artist'
                  : 'Partner Label'}
              </p>
            </div>
            <button className="rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-6 py-2 text-white transition hover:opacity-95">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving || uploadingField !== null}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-6 py-3 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[#666]"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : uploadingField ? 'Finish Uploading...' : 'Save Changes'}
          </button>

          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#FF6B00]/20 bg-transparent px-6 py-3 text-[#FF6B00] transition hover:bg-[#0A0A0A] disabled:cursor-not-allowed disabled:text-[#666]"
          >
            {isResetting ? 'Resetting...' : 'Reset password to Password@1'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-[#120D09] px-6 py-3 text-white transition hover:bg-[#1A120C]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
