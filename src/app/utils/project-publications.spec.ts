import {
  detectPublicationPlatform,
  parsePublicationUrls,
  publicationLogoPath,
  sortedPublicationLinks
} from './project-publications';

describe('project-publications', () => {
  it('parsePublicationUrls splits on whitespace', () => {
    expect(parsePublicationUrls('https://a.com/x  https://b.com/y')).toEqual([
      'https://a.com/x',
      'https://b.com/y'
    ]);
    expect(parsePublicationUrls(null)).toEqual([]);
  });

  it('detectPublicationPlatform maps known hosts', () => {
    expect(detectPublicationPlatform('https://www.astrobin.com/full/1/')).toBe('astrobin');
    expect(detectPublicationPlatform('https://facebook.com/groups/x')).toBe('facebook');
    expect(detectPublicationPlatform('https://www.flickr.com/photos/x')).toBe('flickr');
    expect(detectPublicationPlatform('https://astropolis.pl/viewtopic.php?t=1')).toBe('astropolis');
    expect(detectPublicationPlatform('https://x.com/user/status/1')).toBe('x');
    expect(detectPublicationPlatform('https://twitter.com/user/status/1')).toBe('x');
    expect(detectPublicationPlatform('https://example.org/p')).toBe('generic');
  });

  it('sortedPublicationLinks orders by platform id then URL', () => {
    const links = sortedPublicationLinks(
      'https://facebook.com/p/1 https://www.astrobin.com/x/2'
    );
    expect(links.map(l => l.platformId)).toEqual(['astrobin', 'facebook']);
    expect(links[0].url).toContain('astrobin');
  });

  it('publicationLogoPath uses platform id file name', () => {
    expect(publicationLogoPath('flickr')).toBe('assets/publications/flickr-logo.png');
    expect(publicationLogoPath('generic')).toBe('assets/publications/generic-logo.png');
  });
});
