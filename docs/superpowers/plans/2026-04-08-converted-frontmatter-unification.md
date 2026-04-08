# 转换文件 Frontmatter 统一实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一本地文件和 cyber-pulse 文件的转换文件 frontmatter 结构，符合 Obsidian 规范。

**Architecture:** 修改预处理脚本，生成本地文件的统一 frontmatter；在 cyber-pulse 文件处理中添加字段映射；更新 scan-queue.ts 读取逻辑；同步更新命令文档。

**Tech Stack:** TypeScript, Node.js, YAML frontmatter

---

## 文件结构

```
plugins/market-radar/
├── scripts/
│   └── preprocess/
│       ├── index.ts           # 修改：重构 frontmatter 生成逻辑
│       ├── scan-queue.ts      # 修改：更新接口和读取逻辑
│       └── types/
│           └── frontmatter.ts # 新增：统一 frontmatter 类型定义
├── commands/
│   ├── intel-distill.md       # 修改：更新文档
│   └── references/
│       └── intel-pull-guide.md # 修改：更新 frontmatter 示例（严重过时）
```

---

## Task 1: 创建统一 Frontmatter 类型定义

**Files:**
- Create: `plugins/market-radar/scripts/preprocess/types/frontmatter.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
/**
 * Unified frontmatter types for converted files
 *
 * Design goal: Same structure for both local files and cyber-pulse files
 * - Local files: generated fields with null for missing data
 * - cyber-pulse files: inherited fields from intel-pull
 */

/**
 * Item source tracing fields (Group 1)
 */
export interface ItemSourceFields {
  item_id: string;
  item_title: string;
  author: string | null;
  original_url: string | null;
  published_at: string | null;
  fetched_at: string;
  completeness_score: number | null;
}

/**
 * Intelligence source tracing fields (Group 2)
 */
export interface IntelligenceSourceFields {
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  source_tier: string | null;
  source_score: number | null;
}

/**
 * File tracing fields (Group 3)
 */
export interface FileTracingFields {
  archived_file: string;  // WikiLink format: [[path]]
  content_hash: string;   // MD5 of converted body
  source_hash: string;    // MD5 of source file (for deduplication)
  archivedAt: string;
}

/**
 * Processing status fields (Group 4)
 */
export interface ProcessingStatusFields {
  processed_status: 'pending' | 'passed' | 'rejected';
  processed_at: string | null;
}

/**
 * Unified converted file frontmatter
 */
export interface ConvertedFileFrontmatter
  extends ItemSourceFields, IntelligenceSourceFields, FileTracingFields, ProcessingStatusFields {
  // Reserved fields for cyber-pulse files (identification and compatibility)
  source_type?: 'cyber-pulse';
  first_seen_at?: string;
  tags?: string[];
}

/**
 * Generate item_id from content hash
 */
export function generateItemId(contentHash: string): string {
  return `item_${contentHash.slice(0, 8)}`;
}

/**
 * Convert path to WikiLink format
 */
export function toWikiLink(path: string): string {
  return `[[${path}]]`;
}

/**
 * Extract path from WikiLink format
 */
export function fromWikiLink(wikiLink: string): string {
  return wikiLink.replace(/^\[\[/, '').replace(/\]\]$/, '');
}
```

- [ ] **Step 2: 提交类型定义**

```bash
git add plugins/market-radar/scripts/preprocess/types/frontmatter.ts
git commit -m "feat(market-radar): add unified frontmatter types

- Define ConvertedFileFrontmatter interface with 4 groups
- Add helper functions for item_id generation and WikiLink conversion
- Support both local files and cyber-pulse files

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 重构本地文件 Frontmatter 生成

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/index.ts`

- [ ] **Step 1: 导入类型定义**

在文件顶部添加导入（约第 10 行附近）：

```typescript
import {
  ConvertedFileFrontmatter,
  generateItemId,
  toWikiLink,
} from './types/frontmatter';
```

- [ ] **Step 2: 替换 generateFrontmatter 函数**

找到 `generateFrontmatter` 函数（约第 156-172 行），替换为：

```typescript
/**
 * Generate frontmatter for local files (unified structure)
 *
 * @param sourceHash - MD5 hash of the source file (for deduplication)
 * @param contentHash - MD5 hash of the converted body content
 * @param filename - Original filename (for item_title)
 * @param archivedPath - Relative path to archived file
 * @param fetchedAt - Processing timestamp
 */
function generateLocalFileFrontmatter(
  sourceHash: string,
  contentHash: string,
  filename: string,
  archivedPath: string,
  fetchedAt: string
): string {
  const itemId = generateItemId(contentHash);
  const itemTitle = path.basename(filename, path.extname(filename));
  const archivedFile = toWikiLink(archivedPath);

  return `---
item_id: "${itemId}"
item_title: "${itemTitle}"
author: null
original_url: null
published_at: null
fetched_at: "${fetchedAt}"
completeness_score: null

source_id: null
source_name: null
source_url: null
source_tier: null
source_score: null

archived_file: "${archivedFile}"
content_hash: "${contentHash}"
source_hash: "${sourceHash}"
archivedAt: "${fetchedAt}"

processed_status: "pending"
processed_at: null
---
`;
}
```

- [ ] **Step 3: 修改 processFile 函数中的 frontmatter 生成**

找到 `processFile` 函数中的 Phase 3 部分（约第 614-639 行），修改为：

```typescript
// Phase 3: Write converted file with frontmatter
// (Write converted file BEFORE archiving source to ensure atomicity)
const now = new Date().toISOString();
const relativeSourcePath = path.relative(sourceDir, sourcePath);
const filename = path.basename(sourcePath, path.extname(sourcePath));
const convertedPath = path.join(convertedDir, `${filename}.md`);

// Calculate content_hash from cleaned content (NEW)
const contentHash = createHash('md5').update(cleanedContent).digest('hex');

try {
  // Ensure converted directory exists
  if (!fs.existsSync(convertedDir)) {
    fs.mkdirSync(convertedDir, { recursive: true });
  }

  // Calculate relative archive path
  const relativeArchivePath = path.relative(sourceDir, archivePath);

  // Generate frontmatter (new unified format)
  const frontmatter = generateLocalFileFrontmatter(
    sourceHash,
    contentHash,
    path.basename(sourcePath),
    relativeArchivePath,
    now
  );

  // Write converted file with frontmatter
  const fullContent = frontmatter + cleanedContent;
  fs.writeFileSync(convertedPath, fullContent, 'utf-8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  // Write error log to inbox
  const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'ARCHIVE_FAILED', `Failed to write converted file: ${message}`);

  return {
    success: false,
    error: { code: 'ARCHIVE_FAILED', message: `Failed to write converted file: ${message}` },
    errorLogPath,
  };
}
```

- [ ] **Step 4: 更新 knownHashes 收集逻辑（字段名改为 snake_case）**

找到收集 `knownHashes` 的代码（约第 346-351 行），修改为：

```typescript
// 修改前
if (frontmatter && frontmatter.sourceHash) {
  knownHashes.set(frontmatter.sourceHash, mdPath);
}

// 修改后：兼容新旧字段名
const sourceHash = frontmatter?.source_hash || frontmatter?.sourceHash;
if (sourceHash) {
  knownHashes.set(sourceHash, mdPath);
}
```

- [ ] **Step 5: 提交本地文件 frontmatter 重构**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "refactor(market-radar): unify local file frontmatter structure

- Replace generateFrontmatter with generateLocalFileFrontmatter
- Add item_id, item_title, fetched_at fields
- Use WikiLink format for archived_file
- Calculate content_hash during processing
- Keep source_hash for deduplication (rename to snake_case)
- Remove originalPath (no longer needed)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 重构 cyber-pulse 文件 Frontmatter 处理

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/index.ts`

- [ ] **Step 1: 在 processCyberPulseFile 函数开头添加所需变量**

找到 `processCyberPulseFile` 函数（约第 372 行），在读取文件内容后（约第 401-413 行），添加路径计算：

```typescript
// Read file content
let content: string;
try {
  content = fs.readFileSync(sourcePath, 'utf-8');
} catch (error) {
  // ... existing error handling
}

// Calculate paths for archived_file WikiLink (NEW)
const filename = path.basename(sourcePath);
const convertedPath = path.join(convertedDir, filename);
const convertedRelativePath = path.relative(sourceDir, convertedPath);
```

- [ ] **Step 2: 修改 frontmatter 更新逻辑**

找到 `processCyberPulseFile` 函数中更新 frontmatter 的代码（约第 426-440 行），替换为：

```typescript
// Calculate content_hash from the markdown body (excluding frontmatter)
// Extract the markdown content after frontmatter
const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
const markdownContent = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
const contentHash = createHash('md5').update(markdownContent).digest('hex');

// Calculate source_hash from original file content (for deduplication)
const sourceHash = createHash('md5').update(content).digest('hex');

// Build unified frontmatter with field mapping
const updatedFrontmatter: ConvertedFileFrontmatter = {
  // Group 1: Item source tracing (field mapping)
  item_id: frontmatter.item_id as string,
  item_title: (frontmatter.title as string) || '(无标题)',
  author: (frontmatter.author as string) || null,
  original_url: (frontmatter.url as string) || null,
  published_at: (frontmatter.published_at as string) || null,
  fetched_at: frontmatter.first_seen_at as string,
  completeness_score: typeof frontmatter.completeness_score === 'number'
    ? frontmatter.completeness_score
    : null,

  // Group 2: Intelligence source tracing (inherit)
  source_id: (frontmatter.source_id as string) || null,
  source_name: (frontmatter.source_name as string) || null,
  source_url: (frontmatter.source_url as string) || null,
  source_tier: (frontmatter.source_tier as string) || null,
  source_score: typeof frontmatter.source_score === 'number'
    ? frontmatter.source_score
    : null,

  // Group 3: File tracing (generate)
  archived_file: toWikiLink(convertedRelativePath),  // Points to self in converted/
  content_hash: contentHash,
  source_hash: sourceHash,
  archivedAt: frontmatter.first_seen_at as string,

  // Group 4: Processing status (add)
  processed_status: 'pending',
  processed_at: null,

  // Preserve original fields for identification
  source_type: frontmatter.source_type as 'cyber-pulse',
  first_seen_at: frontmatter.first_seen_at as string,
  tags: Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : [],
};
```

- [ ] **Step 3: 添加导入**

确保文件顶部有 `toWikiLink` 的导入（在 Step 1 中已添加）。

- [ ] **Step 4: 提交 cyber-pulse 文件处理重构**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "refactor(market-radar): unify cyber-pulse file frontmatter

- Add field mapping: title -> item_title, url -> original_url
- Map first_seen_at to fetched_at
- Use WikiLink format for archived_file (points to converted/)
- Add processed_status and processed_at fields
- Add source_hash for deduplication
- Preserve source_type for identification

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 更新 scan-queue.ts 读取逻辑

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/scan-queue.ts`

- [ ] **Step 1: 更新 QueueItem 接口**

找到 `QueueItem` 接口（约第 40-46 行），修改为：

```typescript
/**
 * Item in the processing queue
 */
export interface QueueItem {
  file: string;           // Relative path from source_dir
  content_hash: string;   // MD5 hash of file content
  source_hash?: string;   // MD5 hash of original source file
  archived_file?: string; // WikiLink path to archived/converted file
  status: QueueItemStatus;
}
```

- [ ] **Step 2: 更新 ConvertedFrontmatter 接口**

找到 `ConvertedFrontmatter` 接口（约第 79-85 行），修改为：

```typescript
/**
 * Converted file frontmatter (unified format)
 */
interface ConvertedFrontmatter {
  // Group 3: File tracing
  archived_file?: string;
  content_hash?: string;
  source_hash?: string;  // Renamed from sourceHash
  archivedAt?: string;

  // Group 4: Processing status
  processed_status?: ProcessedStatus;
  processed_at?: string | null;

  // Legacy fields (for backward compatibility)
  sourceHash?: string;
  archivedSource?: string;
}
```

- [ ] **Step 3: 更新读取逻辑**

找到读取 frontmatter 的位置（约第 248-257 行），修改为：

```typescript
// 兼容新旧字段名
const sourceHash = frontmatter?.source_hash || frontmatter?.sourceHash;

let archivedFile = frontmatter?.archived_file || frontmatter?.archivedSource;
// Extract path from WikiLink if present
if (archivedFile) {
  archivedFile = archivedFile.replace(/^\[\[/, '').replace(/\]\]$/, '');
}
```

- [ ] **Step 4: 更新 QueueItem 构建**

找到构建 queue item 的位置（约第 263-270 行和第 305-312 行），修改为：

```typescript
queue.push({
  file: relativePath,
  content_hash: contentHash,
  source_hash: sourceHash,
  archived_file: archivedFile,
  status: 'needs_processing',  // or 'pending_review'
});
```

- [ ] **Step 5: 更新文本输出格式**

找到 `formatAsText` 函数中显示 archived_source 的位置，修改为：

```typescript
// 修改前
console.log(`  Archived: ${item.archived_source}`);

// 修改后
if (item.archived_file) {
  console.log(`  Archived: ${item.archived_file}`);
}
```

- [ ] **Step 6: 提交 scan-queue 更新**

```bash
git add plugins/market-radar/scripts/preprocess/scan-queue.ts
git commit -m "refactor(market-radar): update scan-queue for unified frontmatter

- Rename archived_source to archived_file in QueueItem
- Update ConvertedFrontmatter interface with new field names
- Add backward compatibility for old field names
- Handle WikiLink format extraction
- Keep source_hash field

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 更新 intel-distill.md 文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

- [ ] **Step 1: 更新转换文件格式说明**

找到转换文件格式说明部分，更新为：

```markdown
### 转换文件格式（v3.1）

转换后的 Markdown 文件包含统一 frontmatter 元数据：

**本地文件**：

```markdown
---
item_id: "item_a1b2c3d4"
item_title: "报告文档"
author: null
original_url: null
published_at: null
fetched_at: "2026-04-08T10:00:00Z"
completeness_score: null

source_id: null
source_name: null
source_url: null
source_tier: null
source_score: null

archived_file: "[[archive/2026/04/report.pdf]]"
content_hash: "def456abc123..."
source_hash: "abc789def456..."
archivedAt: "2026-04-08T10:00:00Z"

processed_status: "pending"
processed_at: null
---
```

**cyber-pulse 文件**：

```markdown
---
item_id: "item_a1b2c3d4"
item_title: "Lazarus Group's New Malware Campaign"
author: "Security Research Team"
original_url: "https://example.com/article"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92

source_id: "src_securityweekly"
source_name: "Security Weekly"
source_url: "https://securityweekly.com"
source_tier: "T1"
source_score: 85

archived_file: "[[converted/2026/04/item_a1b2c3d4.md]]"
content_hash: "def456abc123..."
source_hash: "abc789def456..."
archivedAt: "2026-04-01T10:30:00Z"

processed_status: "pending"
processed_at: null

source_type: "cyber-pulse"
first_seen_at: "2026-04-01T10:30:00Z"
tags: ["APT", "ransomware"]
---
```
```

- [ ] **Step 2: 更新字段说明表**

更新字段说明表：

```markdown
**转换文件 frontmatter 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `item_id` | string | ✅ | 唯一标识（格式：`item_{hash前8位}`） |
| `item_title` | string | ✅ | 文档标题或文件名 |
| `author` | string/null | ❌ | 作者 |
| `original_url` | string/null | ❌ | 原文链接 |
| `published_at` | string/null | ❌ | 原文发布时间（ISO 8601） |
| `fetched_at` | string | ✅ | 采集/处理时间（ISO 8601） |
| `completeness_score` | number/null | ❌ | 完整度 0-1 |
| `source_id` | string/null | ❌ | 情报源 ID |
| `source_name` | string/null | ❌ | 情报源名称 |
| `source_url` | string/null | ❌ | 情报源 URL |
| `source_tier` | string/null | ❌ | 情报源等级 T0-T3 |
| `source_score` | number/null | ❌ | 情报源评分 0-100 |
| `archived_file` | string | ✅ | 归档/转换文件链接（WikiLink 格式） |
| `content_hash` | string | ✅ | 转换文件 body 内容哈希（用于变更检测） |
| `source_hash` | string | ✅ | 源文件内容哈希（用于去重） |
| `archivedAt` | string | ✅ | 归档时间（ISO 8601） |
| `processed_status` | string | ❌ | 处理状态：pending/passed/rejected |
| `processed_at` | string/null | ❌ | 处理完成时间（ISO 8601） |
```

- [ ] **Step 3: 更新 scan-queue 输出格式说明**

更新 scan-queue 输出格式中的字段名：

```markdown
**脚本输出格式**：

```json
{
  "source_dir": "/path/to/docs",
  "total": 100,
  "already_processed": 85,
  "needs_processing": 10,
  "pending_review": 5,
  "queue": [
    {
      "file": "converted/2026/03/report-2026.md",
      "content_hash": "abc123...",
      "source_hash": "def456...",
      "archived_file": "archive/2026/03/report-2026.pdf",
      "status": "needs_processing"
    }
  ],
  "threshold": 50,
  "recommendation": "script"
}
```
```

- [ ] **Step 4: 提交文档更新**

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "docs(market-radar): update converted file frontmatter documentation

- Document unified frontmatter structure for both file types
- Update field descriptions with new names
- Show WikiLink format in examples
- Update scan-queue output format
- Add source_hash field documentation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 更新 intel-pull-guide.md（严重过时）

**Files:**
- Modify: `plugins/market-radar/commands/references/intel-pull-guide.md`

- [ ] **Step 1: 更新 frontmatter 示例**

找到"文件结构"部分（约第 174-199 行），完全替换为正确格式：

```markdown
### 文件结构

```markdown
---
item_id: "item_a1b2c3d4"
source_type: "cyber-pulse"
first_seen_at: "2026-03-19T14:30:52Z"
title: "安全漏洞分析报告"
url: "https://example.com/article"
author: "Security Team"
tags: ["vulnerability", "CVE"]
published_at: "2026-03-19T14:00:00Z"
completeness_score: 85
source_id: "src_a1b2c3d4"
source_name: "安全客"
source_tier: "T1"
source_score: 85
content_hash: ""
archived_file: ""
---

# 标题

正文内容...
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `item_id` | 唯一标识（格式：`item_{hash前8位}`） |
| `source_type` | 固定值 `cyber-pulse`，用于识别 |
| `first_seen_at` | 首次采集时间（ISO 8601） |
| `title` | 文档标题 |
| `url` | 原文链接 |
| `author` | 作者 |
| `tags` | 标签数组 |
| `published_at` | 原文发布时间 |
| `completeness_score` | 完整度评分 0-100 |
| `source_id` | 情报源 ID |
| `source_name` | 情报源名称 |
| `source_tier` | 情报源等级 T0-T3 |
| `source_score` | 情报源评分 0-100 |
| `content_hash` | 预处理后填充 |
| `archived_file` | 预处理后填充 |
```

- [ ] **Step 2: 提交文档更新**

```bash
git add plugins/market-radar/commands/references/intel-pull-guide.md
git commit -m "docs(market-radar): fix outdated intel-pull-guide frontmatter

- Replace incorrect frontmatter example with actual format
- Use item_id instead of content_id
- Use first_seen_at instead of fetched_at mapping
- Add field description table
- Align with actual pulse/output.ts implementation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 创建测试文件

**Files:**
- Create: `plugins/market-radar/scripts/preprocess/__tests__/frontmatter.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
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
  });

  describe('toWikiLink', () => {
    it('should convert path to WikiLink format', () => {
      const path = 'archive/2026/04/report.pdf';
      const result = toWikiLink(path);
      expect(result).toBe('[[archive/2026/04/report.pdf]]');
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
  });
});
```

- [ ] **Step 2: 安装测试依赖（如需要）**

```bash
cd plugins/market-radar/scripts && pnpm add -D vitest
```

- [ ] **Step 3: 添加测试脚本到 package.json**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: 运行测试**

```bash
cd plugins/market-radar/scripts && pnpm test
```

Expected: All tests pass

- [ ] **Step 5: 提交测试文件**

```bash
git add plugins/market-radar/scripts/preprocess/__tests__/frontmatter.test.ts
git add plugins/market-radar/scripts/package.json
git commit -m "test(market-radar): add frontmatter utility tests

- Test generateItemId function
- Test toWikiLink and fromWikiLink conversion
- Add vitest dependency

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 手动集成测试

**Files:**
- None (manual testing)

- [ ] **Step 1: 测试本地文件预处理**

```bash
# 创建测试文件
echo "Test content for PDF" > /tmp/test-report.txt

# 放入 inbox
mkdir -p inbox
cp /tmp/test-report.txt inbox/

# 运行预处理
cd plugins/market-radar/scripts && pnpm exec tsx preprocess/index.ts --source ../../../inbox --root ../../../

# 检查输出
cat ../../../converted/2026/04/test-report.md
```

验证 frontmatter 包含：
- `item_id` 和 `item_title`
- `archived_file` 为 WikiLink 格式
- `content_hash` 和 `source_hash` 都存在
- 无 `originalPath`

- [ ] **Step 2: 测试 cyber-pulse 文件（如有）**

如果有可用的 cyber-pulse 文件，验证：
- 字段映射正确（title → item_title）
- `archived_file` 指向 converted/ 目录
- `source_type` 保留
- `source_hash` 存在

- [ ] **Step 3: 测试 Obsidian 兼容性**

1. 在 Obsidian 中打开转换文件
2. 点击 `archived_file` 链接验证可跳转
3. 检查属性面板显示所有字段

- [ ] **Step 4: 测试去重机制**

1. 预处理一个文件
2. 再次放入相同内容的不同文件
3. 验证第二次处理时被正确识别为重复

---

## Task 9: 更新 CHANGELOG 和版本号

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`
- Modify: `plugins/market-radar/CHANGELOG.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 更新插件版本**

在 `plugins/market-radar/.claude-plugin/plugin.json` 中：

```json
{
  "name": "market-radar",
  "version": "1.9.4",
  ...
}
```

- [ ] **Step 2: 更新插件 CHANGELOG**

在 `plugins/market-radar/CHANGELOG.md` 顶部添加：

```markdown
## [1.9.4] - 2026-04-08

### 变更

- **转换文件 Frontmatter 统一**：本地文件和 cyber-pulse 文件使用相同字段结构
  - 新增 `item_id`、`item_title`、`fetched_at` 字段
  - `archived_file` 使用 WikiLink 格式，支持 Obsidian 跳转
  - 移除 `originalPath`（不再需要）
  - 字段名统一为 snake_case（`sourceHash` → `source_hash`）

### 修复

- **cyber-pulse 文件字段映射**：`title` → `item_title`，`url` → `original_url`
- **intel-pull-guide.md 文档**：修复严重过时的 frontmatter 示例
```

- [ ] **Step 3: 更新仓库 CHANGELOG**

在 `CHANGELOG.md` 顶部添加：

```markdown
---

## [1.0.36] - 2026-04-08

### 插件更新

#### market-radar v1.9.4

**变更**
- 转换文件 Frontmatter 统一：本地文件和 cyber-pulse 文件使用相同字段结构
- archived_file 使用 WikiLink 格式，支持 Obsidian 跳转

**修复**
- cyber-pulse 文件字段映射问题
- intel-pull-guide.md 文档过时问题

---
```

- [ ] **Step 4: 提交版本更新**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json
git add plugins/market-radar/CHANGELOG.md
git add CHANGELOG.md
git commit -m "chore(market-radar): release v1.9.4

- Unified converted file frontmatter structure
- WikiLink format for archived_file
- Field mapping for cyber-pulse files

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 更新 Agent 文档中的示例

**Files:**
- Modify: `plugins/market-radar/agents/intelligence-analyzer.md`

- [ ] **Step 1: 修正 cyber-pulse 文件的 archived_file 示例**

找到第 102 行附近的示例，修正 archived_file 的路径：

```markdown
# 修改前（错误）
archived_file: "[[archive/2026/04/20260401-item_a1b2c3d4.md]]"

# 修改后（正确 - cyber-pulse 文件指向自身）
archived_file: "[[converted/2026/04/item_a1b2c3d4.md]]"
```

同时更新第 331 行附近的示例。

- [ ] **Step 2: 添加说明区分本地文件和 cyber-pulse 文件**

在"步骤 1.2：元数据继承逻辑"部分添加说明：

```markdown
**archived_file 字段的差异**：

| 文件类型 | archived_file 指向 |
|---------|-------------------|
| 本地文件 | `[[archive/YYYY/MM/...]]` - 归档的源文件 |
| cyber-pulse 文件 | `[[converted/YYYY/MM/...]]` - 自身（无源文件归档） |
```

- [ ] **Step 3: 提交文档修正**

```bash
git add plugins/market-radar/agents/intelligence-analyzer.md
git commit -m "docs(market-radar): fix archived_file example for cyber-pulse files

- Correct archived_file path for cyber-pulse files (points to converted/, not archive/)
- Add clarification about archived_file differences between file types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 验证清单

实现完成后，验证以下内容：

- [ ] 本地文件转换后 frontmatter 包含所有必需字段
- [ ] `archived_file` 为 WikiLink 格式，Obsidian 可跳转
- [ ] cyber-pulse 文件保留 `source_type` 字段，识别正确
- [ ] cyber-pulse 文件 `archived_file` 指向 converted/ 目录
- [ ] cyber-pulse 文件字段映射正确
- [ ] `content_hash` 和 `source_hash` 都存在
- [ ] scan-queue.ts 正确读取新格式（兼容旧格式）
- [ ] 去重机制正常工作
- [ ] 测试全部通过
- [ ] 文档更新完整（包括 Agent 示例修正）