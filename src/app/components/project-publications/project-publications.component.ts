import { Component, HostListener, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  PublicationLink,
  publicationLogoPath,
  sortedPublicationLinks
} from '../../utils/project-publications';

@Component({
  selector: 'app-project-publications',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    @if (links().length) {
      <span class="publication-icons">
        @for (link of links(); track link.url) {
          <a
            [href]="link.url"
            target="_blank"
            rel="noopener noreferrer"
            [matTooltip]="link.platformLabel + ': ' + link.url"
            class="publication-icon-link"
            (click)="$event.stopPropagation()">
            <img [src]="logoPath(link)" [alt]="link.platformLabel" width="20" height="20" />
          </a>
        }
      </span>
    } @else {
      <span class="publication-empty">—</span>
    }
  `,
  styles: [
    `
      .publication-icons {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
      }
      .publication-icon-link {
        display: inline-flex;
        line-height: 0;
      }
      .publication-icon-link img {
        width: 20px;
        height: 20px;
        object-fit: contain;
        border-radius: 2px;
      }
      .publication-empty {
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class ProjectPublicationsComponent {
  publications = input<string | null | undefined>(null);

  links = computed(() => sortedPublicationLinks(this.publications()));

  @HostListener('click', ['$event'])
  stopClickPropagation(event: Event): void {
    event.stopPropagation();
  }

  logoPath(link: PublicationLink): string {
    return publicationLogoPath(link.platformId);
  }
}
