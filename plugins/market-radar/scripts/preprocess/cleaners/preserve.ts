/**
 * Preserve cleaner
 *
 * Executes last to ensure valuable content is not accidentally removed
 */

import { Cleaner } from './types';

export const preserveCleaner: Cleaner = {
  name: 'preserve',
  priority: 400,
  scope: 'common',
  sources: [],

  clean(content: string): string {
    let result = content;

    // Final processing: collapse blank lines (ensure paragraph separation)
    result = result.replace(/\n{3,}/g, '\n\n');

    // Remove trailing blank lines at end of document
    result = result.replace(/\n+$/, '\n');

    // Ensure no blank lines at start of document
    result = result.replace(/^\n+/, '');

    return result;
  },
};
