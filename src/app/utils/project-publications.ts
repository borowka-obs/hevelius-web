/** Known publication hosts; add entries here and matching `{id}-logo.png` under assets/publications/. */
export const PUBLICATION_PLATFORMS = [
  { id: 'astrobin', label: 'AstroBin', hostPatterns: ['astrobin.com'] },
  { id: 'astropolis', label: 'Astropolis', hostPatterns: ['astropolis.pl', 'astropolis.org'] },
  { id: 'facebook', label: 'Facebook', hostPatterns: ['facebook.com', 'fb.com', 'fb.me'] },
  { id: 'flickr', label: 'Flickr', hostPatterns: ['flickr.com'] },
  { id: 'x', label: 'X', hostPatterns: ['x.com', 'twitter.com'] },
  { id: 'borowka', label: 'Borowka', hostPatterns: ['borowka.space'] }
] as const;

export type PublicationPlatformId = (typeof PUBLICATION_PLATFORMS)[number]['id'] | 'generic';

export interface PublicationLink {
  url: string;
  platformId: PublicationPlatformId;
  platformLabel: string;
  sortKey: string;
}

export function parsePublicationUrls(publications: string | null | undefined): string[] {
  if (publications == null || String(publications).trim() === '') {
    return [];
  }
  return String(publications)
    .split(/\s+/)
    .map(u => u.trim())
    .filter(Boolean);
}

export function detectPublicationPlatform(url: string): PublicationPlatformId {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 'generic';
  }
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }
  for (const p of PUBLICATION_PLATFORMS) {
    if (p.hostPatterns.some(h => host === h || host.endsWith('.' + h))) {
      return p.id;
    }
  }
  return 'generic';
}

export function publicationPlatformLabel(platformId: PublicationPlatformId): string {
  if (platformId === 'generic') {
    return 'Link';
  }
  return PUBLICATION_PLATFORMS.find(p => p.id === platformId)?.label ?? 'Link';
}

export function publicationLogoPath(platformId: PublicationPlatformId): string {
  return `assets/publications/${platformId}-logo.png`;
}

/** URLs sorted by platform id (alphabetically), then URL within the same platform. */
export function sortedPublicationLinks(publications: string | null | undefined): PublicationLink[] {
  const urls = parsePublicationUrls(publications);
  const links: PublicationLink[] = urls.map(url => {
    const platformId = detectPublicationPlatform(url);
    return {
      url,
      platformId,
      platformLabel: publicationPlatformLabel(platformId),
      sortKey: `${platformId}\0${url.toLowerCase()}`
    };
  });
  links.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return links;
}
