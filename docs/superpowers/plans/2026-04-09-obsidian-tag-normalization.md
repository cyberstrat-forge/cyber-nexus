# Obsidian Tag 规范化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Obsidian tag 规范化功能，确保 intel-pull 生成的 tags 符合 Obsidian 规范。

**Architecture:** 新建独立工具模块 `tag-utils.ts`，提供 `normalizeObsidianTag` 和 `normalizeObsidianTags` 函数，在 `output.ts` 中调用规范化 tags 数组。

**Tech Stack:** TypeScript, Vitest (测试框架), Unicode 正则表达式

---

## 文件结构

| 文件 | 责任 |
|------|------|
| `scripts/utils/tag-utils.ts` | 核心规范化逻辑 |
| `scripts/utils/__tests__/tag-utils.test.ts` | 单元测试 |
| `scripts/pulse/output.ts` | 调用规范化函数 |
| `commands/intel-pull.md` | 文档更新 |
| `CHANGELOG.md` | 版本记录 |

---

## Task 1: 创建 tag-utils.ts 基础结构和测试文件

**Files:**
- Create: `plugins/market-radar/scripts/utils/tag-utils.ts`
- Create: `plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts`

- [ ] **Step 1: 创建 tag-utils.ts 空模块**

```typescript
/**
 * Obsidian tag normalization utilities
 *
 * Provides functions for normalizing tags to conform to Obsidian tag conventions.
 *
 * Obsidian tag rules:
 * - Allowed: letters, digits, _, -, /, Unicode characters
 * - Not allowed: spaces, special symbols (#, ., ,, :, ?, !, @, etc.)
 */

/**
 * Normalize a single tag to Obsidian format
 *
 * Processing rules:
 * 1. `:` → `/` (preserve nesting semantics)
 * 2. Replace disallowed chars with `-`
 * 3. Collapse multiple consecutive `-` to single `-`
 * 4. Remove leading/trailing `-`
 * 5. Return empty string for invalid tags
 *
 * @param tag - Raw tag string
 * @returns Normalized tag, or empty string if invalid
 */
export function normalizeObsidianTag(tag: string): string {
  // Handle null/undefined/empty
  if (!tag || typeof tag !== 'string') {
    return '';
  }

  // Trim whitespace
  let result = tag.trim();
  if (result === '') {
    return '';
  }

  // Step 1: `:` → `/` (preserve nesting semantics)
  result = result.replace(/:/g, '/');

  // Step 2: Allowed chars: letters, digits, _, -, /, Unicode
  // Replace all other chars with `-`
  result = result.replace(/[^\p{L}\p{N}_\-/]/gu, '-');

  // Step 3: Collapse multiple consecutive `-` to single `-`
  result = result.replace(/-+/g, '-');

  // Step 4: Remove leading/trailing `-`
  result = result.replace(/^-+|-+$/g, '');

  return result;
}

/**
 * Normalize an array of tags, filtering out invalid ones
 *
 * @param tags - Array of raw tag strings (may contain null/undefined)
 * @returns Array of normalized tags (empty strings filtered out)
 */
export function normalizeObsidianTags(tags: (string | null | undefined)[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map(tag => normalizeObsidianTag(tag))
    .filter(tag => tag !== '');
}
```

- [ ] **Step 2: 创建测试文件骨架**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // Tests will be added in subsequent tasks
  });

  describe('normalizeObsidianTags', () => {
    // Tests will be added in subsequent tasks
  });
});
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit utils/tag-utils.ts`
Expected: No errors

- [ ] **Step 4: 提交基础结构**

```bash
git add plugins/market-radar/scripts/utils/tag-utils.ts
git add plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts
git commit -m "$(cat <<'EOF'
feat(market-radar): add tag-utils module structure

Add normalizeObsidianTag and normalizeObsidianTags functions
for Obsidian tag normalization.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 编写 normalizeObsidianTag 基本用例测试

**Files:**
- Modify: `plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts`

- [ ] **Step 1: 编写空格替换测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    it('should replace spaces with hyphens', () => {
      expect(normalizeObsidianTag('threat intelligence')).toBe('threat-intelligence');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(normalizeObsidianTag('threat   intelligence')).toBe('threat-intelligence');
    });
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: 2 tests pass

- [ ] **Step 3: 编写冒号分隔符测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    it('should replace spaces with hyphens', () => {
      expect(normalizeObsidianTag('threat intelligence')).toBe('threat-intelligence');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(normalizeObsidianTag('threat   intelligence')).toBe('threat-intelligence');
    });

    it('should replace colon with slash for nesting', () => {
      expect(normalizeObsidianTag('geo:china')).toBe('geo/china');
    });

    it('should handle multiple colons for deep nesting', () => {
      expect(normalizeObsidianTag('geo:asia:china')).toBe('geo/asia/china');
    });
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: 5 tests pass

- [ ] **Step 5: 编写特殊符号测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    it('should replace spaces with hyphens', () => {
      expect(normalizeObsidianTag('threat intelligence')).toBe('threat-intelligence');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(normalizeObsidianTag('threat   intelligence')).toBe('threat-intelligence');
    });

    it('should replace colon with slash for nesting', () => {
      expect(normalizeObsidianTag('geo:china')).toBe('geo/china');
    });

    it('should handle multiple colons for deep nesting', () => {
      expect(normalizeObsidianTag('geo:asia:china')).toBe('geo/asia/china');
    });

    it('should handle colon with existing slash', () => {
      expect(normalizeObsidianTag('geo:china/beijing')).toBe('geo/china/beijing');
    });

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
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 6: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: 10 tests pass

- [ ] **Step 7: 编写 Unicode/中文保留测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // ... previous tests ...

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
    // Will be added later
  });
});
```

- [ ] **Step 8: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: 13 tests pass

- [ ] **Step 9: 提交基本用例测试**

```bash
git add plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts
git commit -m "$(cat <<'EOF'
test(market-radar): add normalizeObsidianTag basic test cases

- Space replacement
- Colon to slash for nesting
- Special symbol handling
- Unicode/Chinese preservation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 编写 normalizeObsidianTag 边界用例测试

**Files:**
- Modify: `plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts`

- [ ] **Step 1: 编写空值和空白测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // ... previous tests ...

    describe('edge cases', () => {
      it('should return empty string for null', () => {
        expect(normalizeObsidianTag(null as unknown as string)).toBe('');
      });

      it('should return empty string for undefined', () => {
        expect(normalizeObsidianTag(undefined as unknown as string)).toBe('');
      });

      it('should return empty string for empty string', () => {
        expect(normalizeObsidianTag('')).toBe('');
      });

      it('should return empty string for whitespace only', () => {
        expect(normalizeObsidianTag('   ')).toBe('');
      });
    });
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: All tests pass

- [ ] **Step 3: 编写无效 tag 测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // ... previous tests ...

    describe('edge cases', () => {
      // ... previous edge case tests ...

      it('should return empty string for all special chars', () => {
        expect(normalizeObsidianTag('---')).toBe('');
      });

      it('should return empty string for multiple special chars', () => {
        expect(normalizeObsidianTag(':::')).toBe('');
      });
    });
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: All tests pass

- [ ] **Step 5: 编写首尾字符处理测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // ... previous tests ...

    describe('edge cases', () => {
      // ... previous edge case tests ...

      it('should remove leading/trailing hyphens', () => {
        expect(normalizeObsidianTag('-tag-')).toBe('tag');
      });

      it('should collapse consecutive hyphens', () => {
        expect(normalizeObsidianTag('tag--name')).toBe('tag-name');
      });

      it('should remove leading/trailing special chars', () => {
        expect(normalizeObsidianTag('/geo:china/')).toBe('geo/china');
      });

      it('should trim whitespace before processing', () => {
        expect(normalizeObsidianTag('  spaced  ')).toBe('spaced');
      });

      it('should handle multiple colons with edge chars', () => {
        expect(normalizeObsidianTag('::nested::')).toBe('nested');
      });
    });
  });

  describe('normalizeObsidianTags', () => {
    // Will be added later
  });
});
```

- [ ] **Step 6: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: All tests pass

- [ ] **Step 7: 提交边界用例测试**

```bash
git add plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts
git commit -m "$(cat <<'EOF'
test(market-radar): add normalizeObsidianTag edge case tests

- null/undefined handling
- Empty/whitespace strings
- Invalid tags (all special chars)
- Leading/trailing character removal

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 编写 normalizeObsidianTags 数组处理测试

**Files:**
- Modify: `plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts`

- [ ] **Step 1: 编写数组基本测试**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeObsidianTag, normalizeObsidianTags } from '../tag-utils';

describe('tag-utils', () => {
  describe('normalizeObsidianTag', () => {
    // ... all previous tests ...
  });

  describe('normalizeObsidianTags', () => {
    it('should normalize array of tags', () => {
      expect(normalizeObsidianTags(['threat intelligence', 'geo:china'])).toEqual(['threat-intelligence', 'geo/china']);
    });

    it('should return empty array for empty input', () => {
      expect(normalizeObsidianTags([])).toEqual([]);
    });

    it('should filter out empty strings', () => {
      expect(normalizeObsidianTags(['valid', ''])).toEqual(['valid']);
    });

    it('should filter out null values', () => {
      expect(normalizeObsidianTags(['valid', null])).toEqual(['valid']);
    });

    it('should filter out undefined values', () => {
      expect(normalizeObsidianTags(['valid', undefined])).toEqual(['valid']);
    });

    it('should filter out invalid tags', () => {
      expect(normalizeObsidianTags(['valid', '---'])).toEqual(['valid']);
    });

    it('should handle mixed valid/invalid tags', () => {
      expect(normalizeObsidianTags(['', null, 'valid', '---', 'geo:china'])).toEqual(['valid', 'geo/china']);
    });

    it('should return empty array when all tags are invalid', () => {
      expect(normalizeObsidianTags(['---', '', null])).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(normalizeObsidianTags(null as unknown as string[])).toEqual([]);
      expect(normalizeObsidianTags(undefined as unknown as string[])).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run utils/__tests__/tag-utils.test.ts`
Expected: All tests pass

- [ ] **Step 3: 提交数组处理测试**

```bash
git add plugins/market-radar/scripts/utils/__tests__/tag-utils.test.ts
git commit -m "$(cat <<'EOF'
test(market-radar): add normalizeObsidianTags array tests

- Basic array normalization
- Empty array handling
- null/undefined filtering
- Mixed valid/invalid tag filtering

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 集成到 output.ts

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/output.ts`

- [ ] **Step 1: 添加导入语句**

在 `output.ts` 第 14 行后添加一行：

```typescript
import { normalizeObsidianTags } from '../utils/tag-utils.js';
```

修改后导入部分应为：

```typescript
import { promises as fs } from 'fs';
import * as path from 'path';
import { PulseContent } from './types.js';
import { normalizeObsidianTags } from '../utils/tag-utils.js';
```

- [ ] **Step 2: 修改 generateFrontmatter 函数**

修改 `output.ts:115-117` 的 tags 处理逻辑：

```typescript
// Before (lines 115-118)
  if (content.tags && content.tags.length > 0) {
    const escapedTags = content.tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
    lines.push(`tags: [${escapedTags}]`);
  }

// After
  if (content.tags && content.tags.length > 0) {
    const normalizedTags = normalizeObsidianTags(content.tags);
    if (normalizedTags.length > 0) {
      const escapedTags = normalizedTags.map(t => `"${escapeYamlString(t)}"`).join(', ');
      lines.push(`tags: [${escapedTags}]`);
    }
  }
```

- [ ] **Step 3: 验证 TypeScript 编译通过**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: 提交集成修改**

```bash
git add plugins/market-radar/scripts/pulse/output.ts
git commit -m "$(cat <<'EOF'
feat(market-radar): integrate tag normalization in intel-pull

Apply normalizeObsidianTags to tags field in generateFrontmatter.
Invalid tags are filtered, remaining tags conform to Obsidian format.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 更新命令文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-pull.md`

- [ ] **Step 1: 更新 Frontmatter 示例**

找到约第 488 行的 tags 示例，更新为：

```markdown
tags: ["APT", "威胁情报", "geo/china"]
```

- [ ] **Step 2: 更新字段说明表**

找到约第 528 行的 tags 字段说明，更新为：

```markdown
| `tags` | array | ❌ | 标签列表（自动规范化为 Obsidian 格式） |
```

- [ ] **Step 3: 添加 Tag 规范化说明段落**

在"输出文件格式"部分的 frontmatter 字段说明表后，添加新段落：

```markdown
### Tag 规范化

`tags` 字段会自动规范化以符合 Obsidian 标签规范：

- 空格 → 连字符 `-`
- 冒号 `:` → 正斜杠 `/`（保持嵌套语义）
- 特殊符号 → 连字符 `-`
- 保留中文/Unicode 字符
- 无效 tag（如 `---`）会被过滤

| 原始 tag | 规范化后 |
|----------|---------|
| `"threat intelligence"` | `"threat-intelligence"` |
| `"geo:china"` | `"geo/china"` |
| `"C++"` | `"C-"` |
```

- [ ] **Step 4: 提交文档更新**

```bash
git add plugins/market-radar/commands/intel-pull.md
git commit -m "$(cat <<'EOF'
docs(market-radar): document tag normalization in intel-pull

- Update frontmatter example with normalized tags
- Add note about automatic normalization
- Add Tag normalization section with examples

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 更新 CHANGELOG

**Files:**
- Modify: `plugins/market-radar/CHANGELOG.md`

- [ ] **Step 1: 添加版本更新记录**

在 CHANGELOG.md 顶部添加新版本记录：

```markdown
## [1.9.7] - 2026-04-09

### 新增

- **Obsidian tag 规范化**：intel-pull 生成的 tags 自动规范化
  - 空格 → 连字符 `-`
  - 冒号 `:` → 正斜杠 `/`（保持嵌套语义）
  - 特殊符号 → 连字符 `-`
  - 保留中文/Unicode 字符
  - 无效 tag 自动过滤

### 变更

- `tags` 字段写入前调用 `normalizeObsidianTags()` 处理

### 测试

- 新增 `tag-utils.test.ts`，覆盖基本用例和边界用例（23 个测试用例）
```

- [ ] **Step 2: 提交 CHANGELOG 更新**

```bash
git add plugins/market-radar/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs(market-radar): update CHANGELOG for v1.9.7

Add tag normalization feature documentation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 更新版本号并验证

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`

- [ ] **Step 1: 更新版本号**

在 `plugin.json` 中更新版本号：

```json
{
  "version": "1.9.7",
  ...
}
```

- [ ] **Step 2: 运行完整测试套件**

Run: `cd plugins/market-radar/scripts && pnpm exec vitest run`
Expected: All tests pass

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: 提交版本更新**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json
git commit -m "$(cat <<'EOF'
chore(market-radar): bump version to v1.9.7

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 验收清单

- [ ] 所有测试通过
- [ ] TypeScript 编译无错误
- [ ] `normalizeObsidianTag` 函数正确处理基本用例
- [ ] `normalizeObsidianTag` 函数正确处理边界用例
- [ ] `normalizeObsidianTags` 函数正确处理数组
- [ ] `output.ts` 正确集成规范化函数
- [ ] 命令文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新