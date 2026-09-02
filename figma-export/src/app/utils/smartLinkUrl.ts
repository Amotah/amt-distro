import { generateSlug } from './smartLinkAlgorithms';

const SMART_LINK_PREFIX = '/s/';
const BLOCKED_PUBLIC_PREFIXES = ['/admin', '/dashboard', '/label-dashboard'];

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) return '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
}

export function normalizeSmartLinkSlug(value: string): string {
  return generateSlug(decodeURIComponent((value || '').trim()));
}

export function buildSmartLinkPath(slug: string): string {
  const safeSlug = normalizeSmartLinkSlug(slug);
  return `${SMART_LINK_PREFIX}${encodeURIComponent(safeSlug)}`;
}

export function buildSmartLinkUrl(slug: string, origin?: string): string {
  const baseOrigin = (origin || (typeof window !== 'undefined' ? window.location.origin : 'https://gwmusic.com.ng')).replace(/\/+$/, '');
  return `${baseOrigin}${buildSmartLinkPath(slug)}`;
}

export function extractSmartLinkSlugFromPathname(pathname: string, knownPublicPaths: string[] = []): string | null {
  const normalizedPath = normalizePath(pathname).toLowerCase();

  if (BLOCKED_PUBLIC_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return null;
  }

  // ONLY treat paths starting with /s/ as smartlinks
  // SmartLinks must use the explicit /s/ prefix namespace
  if (normalizedPath.startsWith(SMART_LINK_PREFIX)) {
    const slugPart = pathname.slice(pathname.toLowerCase().indexOf(SMART_LINK_PREFIX) + SMART_LINK_PREFIX.length);
    const slug = normalizeSmartLinkSlug(slugPart);
    return slug || null;
  }

  // All other paths are NOT smartlinks
  // This prevents accidental misidentification of regular pages as smartlinks
  return null;
}
