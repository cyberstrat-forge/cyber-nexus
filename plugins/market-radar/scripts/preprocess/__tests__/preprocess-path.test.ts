import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { toWikiLink, fromWikiLink } from '../types/frontmatter';

describe('WikiLink Path Format', () => {
  describe('Path without ../ prefix', () => {
    it('should generate WikiLink without ../ prefix for archive path', () => {
      // Simulate path.relative(rootDir, archivePath) result
      const relativePath = 'archive/2026/04/report.pdf';
      const result = toWikiLink(relativePath);

      expect(result).toBe('[[archive/2026/04/report.pdf|report.pdf]]');
      expect(result).not.toContain('../');
    });

    it('should generate WikiLink without ../ prefix for converted path', () => {
      // Simulate path.relative(rootDir, convertedPath) result
      const relativePath = 'converted/2026/04/item_abc123.md';
      const result = toWikiLink(relativePath);

      expect(result).toBe('[[converted/2026/04/item_abc123.md|item_abc123.md]]');
      expect(result).not.toContain('../');
    });

    it('should handle nested inbox path correctly', () => {
      // Before fix: path.relative(sourceDir, archivePath) would produce ../archive/...
      // After fix: path.relative(rootDir, archivePath) produces archive/...
      const relativePath = 'archive/2026/04/nested-file.pdf';
      const result = toWikiLink(relativePath);

      expect(result).not.toContain('../');
      expect(result).toContain('archive/2026/04/');
    });

    it('should handle cyber-pulse self-referencing path', () => {
      // cyber-pulse archived_file points to itself in converted/
      const relativePath = 'converted/2026/04/item_xyz789.md';
      const result = toWikiLink(relativePath);

      expect(result).toBe('[[' + relativePath + '|item_xyz789.md]]');
      expect(result).not.toContain('../');
    });
  });

  describe('Path relative calculation logic', () => {
    it('should produce correct relative path from rootDir to archive', () => {
      const rootDir = '/project';
      const archivePath = '/project/archive/2026/04/report.pdf';

      const relativePath = path.relative(rootDir, archivePath);

      expect(relativePath).toBe('archive/2026/04/report.pdf');
      expect(relativePath).not.toContain('../');
    });

    it('should produce correct relative path from rootDir to converted', () => {
      const rootDir = '/project';
      const convertedPath = '/project/converted/2026/04/item_xxx.md';

      const relativePath = path.relative(rootDir, convertedPath);

      expect(relativePath).toBe('converted/2026/04/item_xxx.md');
      expect(relativePath).not.toContain('../');
    });

    it('should NOT use sourceDir as base (which would produce ../ prefix)', () => {
      // This test demonstrates the WRONG behavior before fix
      const sourceDir = '/project/inbox/subdir';
      const archivePath = '/project/archive/2026/04/report.pdf';

      const wrongRelativePath = path.relative(sourceDir, archivePath);

      // This would have ../ prefix (WRONG behavior)
      expect(wrongRelativePath).toContain('../');

      // Correct behavior uses rootDir
      const rootDir = '/project';
      const correctRelativePath = path.relative(rootDir, archivePath);
      expect(correctRelativePath).not.toContain('../');
    });
  });

  describe('WikiLink parsing for Obsidian compatibility', () => {
    it('should parse WikiLink with alias and return clean path', () => {
      const wikiLink = '[[archive/2026/04/report.pdf|report.pdf]]';
      const result = fromWikiLink(wikiLink);

      expect(result).toBe('archive/2026/04/report.pdf');
      expect(result).not.toContain('../');
    });

    it('should parse WikiLink for converted file', () => {
      const wikiLink = '[[converted/2026/04/item_abc.md|item_abc.md]]';
      const result = fromWikiLink(wikiLink);

      expect(result).toBe('converted/2026/04/item_abc.md');
    });

    it('should reject non-WikiLink format (relative path with ../)', () => {
      // Malformed input should return null
      const malformedPath = '../archive/2026/04/report.pdf';
      const result = fromWikiLink(malformedPath);

      expect(result).toBeNull();
    });
  });
});