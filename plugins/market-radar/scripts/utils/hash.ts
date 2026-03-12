/**
 * Shared hash utilities
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

/**
 * Calculate MD5 hash of file content
 *
 * @param filePath - Path to the file
 * @param encoding - Encoding to use ('buffer' for binary, 'utf-8' for text)
 * @returns MD5 hash as hex string
 */
export function calculateHash(
  filePath: string,
  encoding: 'buffer' | 'utf-8' = 'buffer'
): string {
  const content = encoding === 'utf-8'
    ? readFileSync(filePath, 'utf-8')
    : readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}