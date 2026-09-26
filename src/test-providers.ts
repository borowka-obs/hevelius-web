import { provideZonelessChangeDetection } from '@angular/core';

/**
 * Global providers for the test environment (see angular.json `test.options.providersFile`).
 * Mirrors the zoneless setup in `src/main.ts` so specs exercise the same change-detection
 * behavior as the running app instead of falling back to zone.js.
 */
export default [provideZonelessChangeDetection()];
