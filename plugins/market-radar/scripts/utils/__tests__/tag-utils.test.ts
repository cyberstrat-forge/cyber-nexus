import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils.js';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // 空格替换测试
    it('should replace spaces with hyphens', () => {
      expect(normalizeObsidianTag('threat intelligence')).toBe('threat-intelligence');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(normalizeObsidianTag('threat   intelligence')).toBe('threat-intelligence');
    });

    // 冒号分隔符测试
    it('should replace colon with slash for nesting', () => {
      expect(normalizeObsidianTag('geo:china')).toBe('geo/china');
    });

    it('should handle multiple colons for deep nesting', () => {
      expect(normalizeObsidianTag('geo:asia:china')).toBe('geo/asia/china');
    });

    it('should handle colon with existing slash', () => {
      expect(normalizeObsidianTag('geo:china/beijing')).toBe('geo/china/beijing');
    });

    // 特殊符号测试
    it('should replace special symbols with hyphen', () => {
      expect(normalizeObsidianTag('C++')).toBe('C');
    });

    it('should remove hash prefix', () => {
      expect(normalizeObsidianTag('#security')).toBe('security');
    });

    it('should replace comma with hyphen', () => {
      expect(normalizeObsidianTag('AI, ML')).toBe('AI-ML');
    });

    it('should replace dot with hyphen', () => {
      expect(normalizeObsidianTag('tag.name')).toBe('tag-name');
    });

    it('should collapse multiple special chars to single hyphen', () => {
      expect(normalizeObsidianTag('AI,,  ML')).toBe('AI-ML');
    });

    // Unicode/中文保留测试
    it('should preserve Chinese characters', () => {
      expect(normalizeObsidianTag('威胁情报')).toBe('威胁情报');
    });

    it('should preserve mixed Chinese and ASCII', () => {
      expect(normalizeObsidianTag('威胁 intelligence')).toBe('威胁-intelligence');
    });

    it('should preserve Japanese characters', () => {
      expect(normalizeObsidianTag('セキュリティ')).toBe('セキュリティ');
    });
  });

  describe('normalizeObsidianTags', () => {
    // Tests will be added in subsequent tasks
    it('placeholder', () => {
      // Placeholder test to avoid empty suite error
      expect(true).toBe(true);
    });
  });
});