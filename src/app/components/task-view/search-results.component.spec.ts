import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchResultsComponent } from './search-results.component';
import { CatalogObject } from '../../services/catalogs.service';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;

  const mockCatalogObject: CatalogObject = {
    object_id: 1,
    name: 'NGC7000',
    ra: 315.7,
    decl: 44.3,
    descr: 'North America Nebula',
    comment: '',
    type: 'Nebula',
    epoch: 'J2000',
    const: 'Cyg',
    magn: 4,
    x: 0,
    y: 0,
    altname: '',
    distance: 0,
    catalog: 'NGC'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
    component.results = [mockCatalogObject];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display catalog objects', () => {
    const resultElement = fixture.nativeElement.querySelector('.search-result-item');
    expect(resultElement.textContent).toContain('NGC7000');
    expect(resultElement.textContent).toContain('NGC');
    expect(resultElement.textContent).toContain('315.7');
    expect(resultElement.textContent).toContain('44.3');
  });

  it('should emit selected object on click', () => {
    const emitSpy = vi.spyOn(component.selected, 'emit');
    const resultElement = fixture.nativeElement.querySelector('.search-result-item');
    resultElement.click();
    expect(emitSpy).toHaveBeenCalledWith(mockCatalogObject);
  });

  it('should emit selected object on enter key', () => {
    const emitSpy = vi.spyOn(component.selected, 'emit');
    const resultElement = fixture.nativeElement.querySelector('.search-result-item');
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    resultElement.dispatchEvent(enterEvent);
    expect(emitSpy).toHaveBeenCalledWith(mockCatalogObject);
  });

  it('should emit selected object on space key and prevent default', () => {
    const emitSpy = vi.spyOn(component.selected, 'emit');
    const resultElement = fixture.nativeElement.querySelector('.search-result-item');
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    const preventDefaultSpy = vi.spyOn(spaceEvent, 'preventDefault');
    resultElement.dispatchEvent(spaceEvent);
    expect(emitSpy).toHaveBeenCalledWith(mockCatalogObject);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    const container = fixture.nativeElement.querySelector('.search-results-container');
    const option = fixture.nativeElement.querySelector('.search-result-item');

    expect(container.getAttribute('role')).toBe('listbox');
    expect(option.getAttribute('role')).toBe('option');
    expect(option.getAttribute('tabindex')).toBe('0');
    expect(option.getAttribute('aria-selected')).toBe('false');
  });
});