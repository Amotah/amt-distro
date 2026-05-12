import type { ClickEvent } from './smartLinkAlgorithms';

export const SMART_LINKS_STORAGE_KEY = 'amt_smart_links';
export const SMART_LINK_CLICK_EVENTS_STORAGE_KEY = 'amt_smart_link_click_events';

export interface SmartLinkStorageRecord {
  id: string;
  title: string;
  artistName: string;
  releaseTitle: string;
  slug: string;
  platforms: Record<string, string>;
  enableGeoRouting: boolean;
  enableDeviceRouting: boolean;
  clicks: number;
  countries: number;
  createdAt: string;
  status: 'active' | 'draft';
}

export interface SmartLinkClickStorageRecord extends ClickEvent {
  id: string;
  date: string;
  linkSlug?: string;
}

export function loadSmartLinks(): SmartLinkStorageRecord[] {
  try {
    const raw = localStorage.getItem(SMART_LINKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SmartLinkStorageRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSmartLinks(links: SmartLinkStorageRecord[]) {
  localStorage.setItem(SMART_LINKS_STORAGE_KEY, JSON.stringify(links));
}

export function loadSmartLinkClickEvents(): SmartLinkClickStorageRecord[] {
  try {
    const raw = localStorage.getItem(SMART_LINK_CLICK_EVENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SmartLinkClickStorageRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSmartLinkClickEvents(events: SmartLinkClickStorageRecord[]) {
  localStorage.setItem(SMART_LINK_CLICK_EVENTS_STORAGE_KEY, JSON.stringify(events));
}
