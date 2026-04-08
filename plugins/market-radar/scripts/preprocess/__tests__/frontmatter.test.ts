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
    it('should convert path to WikiLink format with filename as alias', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/report.pdf|report.pdf]]');
    });

    it('should use custom alias when provided', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = toWikiLink(path, 'My Report');
      expect(result).toBe('[[archive/2026/04/report.pdf|My Report]]');
    });

    it('should handle path with spaces', () => {
      const path = 'archive/2026/04/my report.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/my report.pdf|my report.pdf]]');
    });

    it('should handle path with Chinese characters', () => {
      const path = 'archive/2026/04/报告.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/报告.pdf|报告.pdf]]');
    });

    it('should use filename from nested path as alias', () => {
      const path = 'a/b/c/deep-file.md';
      const result = toWikiLink(path);
      expect(result).toBe('[[a/b/c/deep-file.md|deep-file.md]]');
    });
  });

  describe('fromWikiLink', () => {
    it('should extract path from WikiLink format without alias', () => {
      const wikiLink = '[[archive/2026/04/report.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/report.pdf');
    });

    it('should extract path from WikiLink format with alias', () => {
      const wikiLink = '[[archive/2026/04/report.pdf|My Report]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/report.pdf');
    });

    it('should return null for path without WikiLink format', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = fromWikiLink(path);
      expect(result).toBeNull();
    });

    it('should handle WikiLink with spaces', () => {
      const wikiLink = '[[archive/2026/04/my report.pdf|my report.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/my report.pdf');
    });

    it('should handle WikiLink with Chinese characters', () => {
      const wikiLink = '[[archive/2026/04/报告.pdf|报告.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('archive/2026/04/报告.pdf');
    });

    it('should return null for empty WikiLink', () => {
      const wikiLink = '[[]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBeNull();
    });

    it('should return null for malformed WikiLink (missing start)', () => {
      const wikiLink = 'archive/2026/04/report.pdf]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBeNull();
    });

    it('should return null for malformed WikiLink (missing end)', () => {
      const wikiLink = '[[archive/2026/04/report.pdf';
      const result = fromWikiLink(wikiLink);
      expect(result).toBeNull();
    });

    it('should handle alias with pipe in path', () => {
      // Edge case: if path contains |, this would be ambiguous
      // Current implementation takes everything before first | as path
      const wikiLink = '[[path/with|pipe|alias]]';
      const result = fromWikiLink(wikiLink);
      expect(result).toBe('path/with');
    });
  });
});