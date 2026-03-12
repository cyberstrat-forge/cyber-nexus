/**
 * Social media cleaner
 *
 * Applies only to social source (Twitter/X)
 */

import { Cleaner } from './types';

export const socialCleaner: Cleaner = {
  name: 'social',
  priority: 300,
  scope: 'specific',
  sources: ['social'],

  clean(content: string): string {
    let result = content;

    // S1: Remove profile images (preserve alt text)
    result = result.replace(
      /!\[([^\]]*)\]\([^)]*pbs\.twimg\.com\/profile_images[^)]*\)/g,
      (match, alt) => alt || ''
    );

    // S2: Remove platform UI text
    result = result.replace(/^Post your reply\s*$/gm, '');
    result = result.replace(/^Reply\s*$/gm, '');
    result = result.replace(/^Retweet\s*$/gm, '');
    result = result.replace(/^Quote\s*Tweet\s*$/gm, '');

    // S3: Remove @handle (only standalone lines)
    result = result.replace(/^@\w{1,15}\s*$/gm, '');

    // S4: Remove timestamp format
    result = result.replace(/^\d+[hm]$/gm, '');  // "2h", "15m" etc.

    return result;
  },
};
