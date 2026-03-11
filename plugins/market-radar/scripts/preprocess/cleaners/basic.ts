/**
 * Basic cleaner
 *
 * Applies to unknown + all specific sources
 * Contains relatively safe rules for common web noise
 */

import { Cleaner } from './types';

export const basicCleaner: Cleaner = {
  name: 'basic',
  priority: 200,
  scope: 'basic',
  sources: [],

  clean(content: string): string {
    let result = content;

    // B1: Collapse 4+ consecutive blank lines to 2
    result = result.replace(/\n{4,}/g, '\n\n\n');

    // B2: Remove copyright statements
    result = result.replace(/Copyright\s*©[^\n]*/gi, '');
    result = result.replace(/©\s*\d{4}[^\n]*/g, '');
    result = result.replace(/All\s*Rights\s*Reserved/gi, '');
    result = result.replace(/版权所有[^\n]*/g, '');

    // B3: Remove ICP registration info
    result = result.replace(/ICP[备案号]*[：:]*\s*\d+[^\n]*/gi, '');

    // B4: Remove share button text
    result = result.replace(/分享到[^\n]*/g, '');
    result = result.replace(/分享\s*$/gm, '');
    result = result.replace(/收藏\s*$/gm, '');
    result = result.replace(/转发[^\n]*/g, '');

    // B5: Remove navigation link lines (3+ short links in one line)
    result = result.replace(
      /^(?:\[[^\]]{1,5}\]\([^)]*\)\s*){3,}$/gm,
      ''
    );

    return result;
  },
};