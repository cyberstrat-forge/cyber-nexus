/**
 * Cleaner orchestrator
 *
 * Manages and executes cleaning rules in priority order
 */

import { Cleaner, CleanerContext, CleanerResult, DocumentSource, calculateStats } from './types';

export class CleanerOrchestrator {
  private cleaners: Cleaner[] = [];

  /**
   * Register a cleaner
   */
  register(cleaner: Cleaner): void {
    this.cleaners.push(cleaner);
    this.cleaners.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if a cleaner should be applied to the current source
   */
  private shouldApply(cleaner: Cleaner, source: DocumentSource): boolean {
    switch (cleaner.scope) {
      case 'common':
        // Common rules: apply to all sources
        return true;

      case 'basic':
        // Basic rules: apply to unknown + web sources only
        // These rules target web-specific noise (ICP, share buttons, copyright)
        // that should not be applied to PDF reports, WeChat articles, etc.
        return source === 'unknown' || source === 'web';

      case 'specific':
        // Specific rules: only apply to matching sources
        return cleaner.sources.includes(source);

      default:
        return false;
    }
  }

  /**
   * Execute cleaning
   */
  async clean(
    content: string,
    context: CleanerContext
  ): Promise<CleanerResult> {
    const appliedRules: string[] = [];
    let result = content;

    for (const cleaner of this.cleaners) {
      if (!this.shouldApply(cleaner, context.source)) {
        continue;
      }

      const before = result;
      result = cleaner.clean(result, context);

      if (result !== before) {
        appliedRules.push(cleaner.name);
      }
    }

    return {
      content: result,
      source: context.source,
      appliedRules,
      stats: calculateStats(content, result),
    };
  }
}

// Re-export cleaners
export { commonCleaner } from './common';
export { basicCleaner } from './basic';
export { wechatCleaner } from './wechat';
export { pdfCleaner } from './pdf';
export { socialCleaner } from './social';
export { webCleaner } from './web';
export { preserveCleaner } from './preserve';
