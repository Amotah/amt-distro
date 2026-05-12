import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, Mail, Music, User, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createManagedArtistAccount, getLabelArtists, linkArtistAccountToLabel, type UserProfile } from '../../utils/user-api';

interface ArtistFormState {
  firstName: string;
  lastName: string;
  artistName: string;
  email: string;
  defaultPassword: string;
  profileImage: string;
  bannerImage: string;
}

function createInitialState(): ArtistFormState {
  return {
    firstName: '',
    lastName: '',
    artistName: '',
    email: '',
    defaultPassword: 'Password@1',
    profileImage: '',
    bannerImage: '',
  };
}

function validateArtistForm(form: ArtistFormState) {
  if (!form.artistName.trim()) {
    return 'Artist name is required.';
  }

  if (!form.email.trim()) {
    return 'Email address is required.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(form.email.trim())) {
    return 'Enter a valid email address.';
  }

  if (!form.defaultPassword.trim()) {
    return 'Default password is required.';
  }

  const urlFields = [
    { label: 'Profile image URL', value: form.profileImage.trim() },
    { label: 'Banner image URL', value: form.bannerImage.trim() },
  ];

  for (const field of urlFields) {
    if (!field.value) {
      continue;
    }

    try {
      new URL(field.value);
    } catch {
      return `${field.label} must be a valid URL.`;
    }
  }

  return null;
}

function isAuthProvisioningBlocked(message: string) {
  return message.toLowerCase().includes('supabase auth cannot create new accounts right now');
}

export function AddNewArtist() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ArtistFormState>(createInitialState());
  const [existingArtists, setExistingArtists] = useState<UserProfile[]>([]);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkArtistName, setLinkArtistName] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkingArtist, setIsLinkingArtist] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [linkRequestMessage, setLinkRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingArtists() {
      try {
        const artists = await getLabelArtists();
        if (!cancelled) {
          setExistingArtists(artists);
        }
      } catch {
        if (!cancelled) {
          setExistingArtists([]);
        }
      }
    }

    loadExistingArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  const duplicateRosterArtist = useMemo(() => {
    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    return existingArtists.find((artist) => artist.email.trim().toLowerCase() === normalizedEmail) || null;
  }, [existingArtists, form.email]);

  function handleChange(field: keyof ArtistFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'email' && !linkEmail) {
      setLinkEmail(value);
    }

    if (field === 'artistName' && !linkArtistName) {
      setLinkArtistName(value);
    }
  }

  async function handleCreateLinkRequest() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLinkRequestMessage(null);

    const normalizedEmail = linkEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setLinkRequestMessage('Enter the existing artist email you want to link.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setLinkRequestMessage('Enter a valid email address for the existing artist account.');
      return;
    }

    if (duplicateRosterArtist && duplicateRosterArtist.email.trim().toLowerCase() === normalizedEmail) {
      setLinkRequestMessage('This artist is already in your roster. Open Artist Management instead of creating a link request.');
      return;
    }

    try {
      setIsLinkingArtist(true);
      const linkedArtist = await linkArtistAccountToLabel(normalizedEmail);
      const linkedArtistName = linkedArtist.artistName || linkedArtist.firstName || linkedArtist.email;
      setLinkRequestMessage(`${linkedArtistName} has been linked to this label successfully.`);
      setLinkNote('');
      navigate('/label-dashboard/artists', {
        state: {
          linkedArtistName,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link existing artist account.';
      setLinkRequestMessage(message);
    } finally {
      setIsLinkingArtist(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateArtistForm(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (duplicateRosterArtist) {
      const duplicateArtistName = duplicateRosterArtist.artistName || duplicateRosterArtist.firstName || duplicateRosterArtist.email;
      setErrorMessage(`${duplicateArtistName} is already in this label roster. Open Artist Management instead of creating the account again.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const artist = await createManagedArtistAccount({
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        artistName: form.artistName.trim(),
        email: form.email.trim(),
        defaultPassword: form.defaultPassword.trim() || 'Password@1',
        profileImage: form.profileImage.trim() || undefined,
        bannerImage: form.bannerImage.trim() || undefined,
      });

      const createdArtistName = artist.artistName || artist.firstName || 'Artist';
      setSuccessMessage(`${createdArtistName} was added successfully. Share the temporary password directly, and the artist must change it after first login.`);
      setForm(createInitialState());
      navigate('/label-dashboard/artists', {
        state: {
          createdArtistName,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create artist account.';
      setErrorMessage(
        message.includes('already')
          ? 'This email is already tied to an existing artist account. Use the link existing artist flow below instead.'
          : isAuthProvisioningBlocked(message)
            ? 'New artist login accounts cannot be created right now because live Supabase Auth provisioning is failing. Existing artist accounts can still be linked below.'
            : message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#FFD9BF]">
            <UserPlus className="h-3.5 w-3.5 text-[#FFD600]" />
            Artist onboarding
          </div>
          <h1 className="text-3xl font-semibold text-white">Add New Artist</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
            Create a new artist account for your label roster. This creates Supabase Auth immediately and the artist can sign in as a free artist.
          </p>
        </div>
        <Button asChild variant="outline" className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]">
          <Link to="/label-dashboard/artists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Artists
          </Link>
        </Button>
      </div>

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="firstName" className="text-[#B3B3B3]">First Name</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) => handleChange('firstName', event.target.value)}
                  placeholder="Amina"
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="lastName" className="text-[#B3B3B3]">Last Name</Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) => handleChange('lastName', event.target.value)}
                  placeholder="Okafor"
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="artistName" className="text-[#B3B3B3]">Artist Name</Label>
              <div className="relative mt-2">
                <Music className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="artistName"
                  value={form.artistName}
                  onChange={(event) => handleChange('artistName', event.target.value)}
                  placeholder="DJ Vibes"
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-[#B3B3B3]">Email Address</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder="artist@example.com"
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                  required
                />
              </div>
              {duplicateRosterArtist ? (
                <p className="mt-2 text-sm text-[#FFD9BF]">
                  This email already belongs to {duplicateRosterArtist.artistName || duplicateRosterArtist.firstName || 'an artist'} in your roster.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <Label htmlFor="defaultPassword" className="text-[#B3B3B3]">Default Password</Label>
            <Input
              id="defaultPassword"
              type="text"
              value={form.defaultPassword}
              onChange={(event) => handleChange('defaultPassword', event.target.value)}
              placeholder="Password@1"
              className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
              required
            />
            <p className="mt-2 text-sm text-[#B3B3B3]">
              This password is used for the artist&apos;s temporary login. Share it directly with the artist. They will be forced to change it after first login.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="profileImage" className="text-[#B3B3B3]">Profile Image URL</Label>
              <div className="relative mt-2">
                <ImagePlus className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="profileImage"
                  value={form.profileImage}
                  onChange={(event) => handleChange('profileImage', event.target.value)}
                  placeholder="https://..."
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bannerImage" className="text-[#B3B3B3]">Banner Image URL</Label>
              <div className="relative mt-2">
                <ImagePlus className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B3B3B3]" />
                <Input
                  id="bannerImage"
                  value={form.bannerImage}
                  onChange={(event) => handleChange('bannerImage', event.target.value)}
                  placeholder="https://..."
                  className="border-[#FF6B00]/20 bg-[#0A0A0A] pl-10 text-white placeholder:text-[#666]"
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div>{errorMessage}</div>
              {isAuthProvisioningBlocked(errorMessage) ? (
                <div className="mt-2 text-xs text-red-100/90">
                  Live status: artist roster records are fine, but Supabase Auth is currently rejecting all new account provisioning in this project.
                </div>
              ) : null}
              {duplicateRosterArtist ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]"
                    onClick={() => navigate(`/label-dashboard/artists/${duplicateRosterArtist.id}`)}
                  >
                    Open Artist Management
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]"
                    onClick={() => navigate('/label-dashboard/artists')}
                  >
                    View All Artists
                  </Button>
                </div>
              ) : null}
              {isAuthProvisioningBlocked(errorMessage) ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]"
                    onClick={handleCreateLinkRequest}
                    disabled={isLinkingArtist}
                  >
                    {isLinkingArtist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Try Link Existing Account
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-xl border border-[#1DB954]/30 bg-[#1DB954]/10 px-4 py-3 text-sm text-[#B8FFD0]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#1DB954] text-[#08120B] hover:bg-[#35d76d]"
                  onClick={() => navigate('/label-dashboard/artists')}
                >
                  View All Artists
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-[#FF6B00]/10 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]"
              onClick={() => navigate('/label-dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create Artist
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-[#FF6B00]/20 bg-[#161616] p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B00]/20 bg-[#FF6B00]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#FFD9BF]">
              <Mail className="h-3.5 w-3.5 text-[#FFD600]" />
              Existing account fallback
            </div>
            <h2 className="text-2xl font-semibold text-white">Link Existing Artist Account</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
              Use this flow when the artist already has an account and should be attached to this label immediately by email.
            </p>
          </div>

          {duplicateRosterArtist ? (
            <Button
              type="button"
              variant="outline"
              className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]"
              onClick={() => navigate(`/label-dashboard/artists/${duplicateRosterArtist.id}`)}
            >
              Open Existing Artist
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="linkEmail" className="text-[#B3B3B3]">Existing Account Email</Label>
            <Input
              id="linkEmail"
              type="email"
              value={linkEmail}
              onChange={(event) => setLinkEmail(event.target.value)}
              placeholder="existing-artist@example.com"
              className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
            />
          </div>
          <div>
            <Label htmlFor="linkArtistName" className="text-[#B3B3B3]">Artist Name</Label>
            <Input
              id="linkArtistName"
              value={linkArtistName}
              onChange={(event) => setLinkArtistName(event.target.value)}
              placeholder="DJ Vibes"
              className="mt-2 border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
            />
          </div>
        </div>

        <div className="mt-6">
          <Label htmlFor="linkNote" className="text-[#B3B3B3]">Internal Note</Label>
          <Textarea
            id="linkNote"
            value={linkNote}
            onChange={(event) => setLinkNote(event.target.value)}
            placeholder="Reason for linking, manager contact, or follow-up details"
            className="mt-2 min-h-28 border-[#FF6B00]/20 bg-[#0A0A0A] text-white placeholder:text-[#666]"
          />
        </div>

        {linkRequestMessage ? (
          <div className={`mt-6 rounded-xl px-4 py-3 text-sm ${linkRequestMessage.includes('successfully') ? 'border border-[#1DB954]/30 bg-[#1DB954]/10 text-[#B8FFD0]' : 'border border-[#FF6B00]/20 bg-[#FF6B00]/10 text-[#FFD9BF]'}`}>
            {linkRequestMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-[#FF6B00]/10 pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-[#FF6B00]/20 bg-transparent text-[#FF6B00] hover:bg-[#0A0A0A]"
            onClick={() => {
              setLinkEmail(form.email);
              setLinkArtistName(form.artistName);
            }}
          >
            Use Create Form Values
          </Button>
          <Button type="button" className="bg-[#FF6B00] text-white hover:bg-[#ff7f26]" onClick={handleCreateLinkRequest} disabled={isLinkingArtist}>
            {isLinkingArtist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Link Existing Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
