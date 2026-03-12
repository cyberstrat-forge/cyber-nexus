/**
 * Common cleaner
 *
 * Applies to all sources (including unknown)
 * Contains the safest rules that only remove technical noise
 */

import { Cleaner } from './types';

export const commonCleaner: Cleaner = {
  name: 'common',
  priority: 100,
  scope: 'common',
  sources: [],

  clean(content: string): string {
    let result = content;

    // C1: Remove Unicode zero-width characters
    result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // C2: Remove trailing whitespace on lines
    result = result.replace(/[ \t]+$/gm, '');

    // C3: Remove pure whitespace lines (only spaces/tabs)
    result = result.replace(/^[ \t]+\n/gm, '\n');

    // C4: Normalize line endings to \n
    result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return result;
  },
};
