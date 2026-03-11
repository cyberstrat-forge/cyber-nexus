/**
 * Content cleaning module
 *
 * Cleans noise tokens from Markdown content using
 * source-aware rule orchestration
 */

import { detectSource, CleanerContext, CleanerResult } from './cleaners/types';
import { CleanerOrchestrator } from './cleaners/index';
import { commonCleaner } from './cleaners/common';
import { basicCleaner } from './cleaners/basic';
import { wechatCleaner } from './cleaners/wechat';
import { pdfCleaner } from './cleaners/pdf';
import { socialCleaner } from './cleaners/social';
import { webCleaner } from './cleaners/web';
import { preserveCleaner } from './cleaners/preserve';

/**
 * Clean Markdown content with source-aware rules
 */
export async function cleanMarkdown(
  content: string,
  filePath: string
): Promise<CleanerResult> {
  // 1. Detect source
  const detection = detectSource(content, filePath);

  // 2. Create context
  const context: CleanerContext = {
    content,
    source: detection.source,
    confidence: detection.confidence,
    filePath,
  };

  // 3. Create orchestrator and register cleaners
  const orchestrator = new CleanerOrchestrator();

  // Register in priority order
  orchestrator.register(commonCleaner);      // 100: common
  orchestrator.register(basicCleaner);       // 200: basic
  orchestrator.register(wechatCleaner);      // 300: wechat
  orchestrator.register(pdfCleaner);         // 300: pdf
  orchestrator.register(socialCleaner);      // 300: social
  orchestrator.register(webCleaner);         // 300: web
  orchestrator.register(preserveCleaner);    // 400: preserve

  // 4. Execute cleaning
  return orchestrator.clean(content, context);
}

/**
 * Calculate compression statistics
 */
export function calculateStats(original: string, cleaned: string): {
  originalSize: number;
  cleanedSize: number;
  compressionRate: number;
} {
  const originalSize = Buffer.byteLength(original, 'utf-8');
  const cleanedSize = Buffer.byteLength(cleanedContent, 'utf-8');
  const compressionRate = originalSize > 0
    ? (originalSize - cleanedSize) / originalSize
    : 0;

  return {
    originalSize,
    cleanedSize,
    compressionRate,
  };
}