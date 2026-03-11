/**
 * PDF report cleaner
 *
 * Applies only to pdf-report source
 */

import { Cleaner } from './types';

export const pdfCleaner: Cleaner = {
  name: 'pdf-report',
  priority: 300,
  scope: 'specific',
  sources: ['pdf-report'],

  clean(content: string): string {
    let result = content;

    // P1: Remove page headers (Gartner format)
    result = result.replace(/Gartner,\s*Inc\.\s*\|\s*G\d{8}/g, '');

    // P2: Remove page footer copyright
    result = result.replace(/©\s*\d{4}[^\n]*All\s*Rights\s*Reserved/gi, '');
    result = result.replace(/Gartner.*and\/or\s+its\s+affiliates/gi, '');

    // P3: Remove standalone page numbers
    result = result.replace(/^\s*\d{1,4}\s*$/gm, '');

    // P4: Remove figure/table source attribution
    result = result.replace(/Source:\s*[^\n]+/g, '');
    result = result.replace(/来源[：:]\s*[^\n]+/g, '');

    // P5: Remove figure number placeholders
    result = result.replace(/^Figure\s+\d+\.\s*$/gm, '');

    return result;
  },
};