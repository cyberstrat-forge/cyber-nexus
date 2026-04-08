import { describe, it, expect } from 'vitest';
import {
  generateItemId,
  toWikiLink,
  fromWikiLink,
} from '../types/frontmatter';

describe('frontmatter utilities', () => {
  describe('generateItemId', () => {
    it('should generate item_id from content hash', () => {
      const contentHash = 'a1b2c3d4e5f6g7h8';
      const result = generateItemId(contentHash);
      expect(result).toBe('item_a1b2c3d4');
    });

    it('should handle short hash', () => {
      const contentHash = 'abc';
      const result = generateItemId(contentHash);
      expect(result).toBe('item_abc');
    });

    it('should handle hash with exactly 8 characters', () => {
      const contentHash = '12345678';
      const result = generateItemId(contentHash);
      expect(result).toBe('item_12345678');
    });
  });

  describe('toWikiLink', () => {
    it('should convert path to WikiLink format', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/report.pdf]]');
    });

    it('should handle path with spaces', () => {
      const path = 'archive/2026/04/my report.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/my report.pdf]]');
    });

    it('should handle path with Chinese characters', () => {
      const path = 'archive/2026/04/报告.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/报告.pdf]]');
    });
  });

  describe('fromWikiLink', () => {
    it('should extract path from WikiLink format', () => {
      const wikiLink = '[[archive/2026/04/report.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/report.pdf');
    });

    it('should handle path without WikiLink format', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = fromWikiLink(path);
      expect(result).toBe('archive/2026/04/report.pdf');
    });

    it('should handle WikiLink with spaces', () => {
      const wikiLink = '[[archive/2026/04/my report.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/my report.pdf');
    });

    it('should handle WikiLink with Chinese characters', () => {
      const wikiLink = '[[archive/2026/04/报告.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/报告.pdf');
    });
  });
});