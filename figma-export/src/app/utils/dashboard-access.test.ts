import { describe, expect, it } from 'vitest';
import { getDashboardPathForMode, getEffectiveDashboardMode } from './dashboard-access';

describe('getEffectiveDashboardMode', () => {
  it('returns label mode when role is artist but subscription tier is label', () => {
    expect(getEffectiveDashboardMode({ role: 'artist', subscriptionTier: 'label' })).toBe('label');
  });

  it('returns label mode when role is label', () => {
    expect(getEffectiveDashboardMode({ role: 'label', subscriptionTier: 'artist' })).toBe('label');
  });

  it('returns artist mode for a normal artist account', () => {
    expect(getEffectiveDashboardMode({ role: 'artist', subscriptionTier: 'artist' })).toBe('artist');
  });
});

describe('getDashboardPathForMode', () => {
  it('moves partner label users onto the label dashboard immediately', () => {
    expect(getDashboardPathForMode('label', '/dashboard')).toBe('/label-dashboard');
  });

  it('keeps shared dashboard routes when switching to label mode', () => {
    expect(getDashboardPathForMode('label', '/dashboard/analytics')).toBe('/label-dashboard/analytics');
  });

  it('falls back to label dashboard root for artist-only routes', () => {
    expect(getDashboardPathForMode('label', '/dashboard/artist-profile')).toBe('/label-dashboard');
  });

  it('moves label dashboard users back to artist routes when label access is removed', () => {
    expect(getDashboardPathForMode('artist', '/label-dashboard/settings')).toBe('/dashboard/settings');
  });
});