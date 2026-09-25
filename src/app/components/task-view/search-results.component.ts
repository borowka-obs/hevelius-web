import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { CatalogObject } from '../../services/catalogs.service';

@Component({
    selector: 'app-search-results',
    templateUrl: './search-results.component.html',
    styleUrls: ['./search-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: []
})
export class SearchResultsComponent {
  @Input() results: CatalogObject[] = [];
  @Output() selected = new EventEmitter<CatalogObject>();

  onSelect(result: CatalogObject) {
    this.selected.emit(result);
  }
}