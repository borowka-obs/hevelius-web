import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectPublicationsComponent } from './project-publications.component';

describe('ProjectPublicationsComponent', () => {
  let fixture: ComponentFixture<ProjectPublicationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectPublicationsComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectPublicationsComponent);
  });

  it('renders publication icons sorted by platform', async () => {
    fixture.componentRef.setInput(
      'publications',
      'https://facebook.com/p/1 https://www.astrobin.com/x/1'
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a.publication-icon-link') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(2);
    expect(links[0].href).toContain('astrobin');
    expect(links[1].href).toContain('facebook');
    const imgs = fixture.nativeElement.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    expect(imgs[0].src).toContain('astrobin-logo.png');
  });

  it('shows dash when no publications', async () => {
    fixture.componentRef.setInput('publications', null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('—');
  });
});
