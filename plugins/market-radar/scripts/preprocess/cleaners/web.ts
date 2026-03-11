/**
 * Web article cleaner
 *
 * Applies only to web source
 */

import { Cleaner } from './types';

export const webCleaner: Cleaner = {
  name: 'web',
  priority: 300,
  scope: 'specific',
  sources: ['web'],

  clean(content: string): string {
    let result = content;

    // W1: Remove "Related Articles"/"Recommended Reading" section headers
    result = result.replace(/^相关文章\s*$/gm, '');
    result = result.replace(/^推荐阅读\s*$/gm, '');
    result = result.replace(/^Related\s*Articles\s*$/gim, '');

    // W2: Remove "Previous/Next" navigation
    result = result.replace(/^上一篇[：:]?\s*[^\n]*$/gm, '');
    result = result.replace(/^下一篇[：:]?\s*[^\n]*$/gm, '');

    // W3: Remove comment section prompts
    result = result.replace(/^评论\s*$/gm, '');
    result = result.replace(/^发表评论[^\n]*/g, '');

    // Note: Author info is preserved as it may be valuable for attribution

    return result;
  },
};
