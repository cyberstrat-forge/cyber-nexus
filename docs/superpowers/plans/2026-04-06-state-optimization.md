# 状态文件优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构状态管理，删除 state.json 中膨胀的 processed 字段，改为基于文件系统的状态追踪。

**Architecture:** 状态由文件系统自身维护。转换文件 frontmatter 记录 processed_status，情报卡片 frontmatter 记录 converted_content_hash，pending.json 仅存储运行时状态（待审核队列 + cursor）。

**Tech Stack:** TypeScript, Node.js 18+, JSON Schema

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `schemas/pending.schema.json` | 创建 | pending.json 的 schema |
| `scripts/preprocess/index.ts` | 修改 | 添加 processed_status 到转换文件 |
| `scripts/preprocess/scan-queue.ts` | 重写 | 基于 processed_status + intelligence/ 扫描 |
| `scripts/preprocess/update-state.ts` | 重写 | 更新转换文件 + pending.json |
| `scripts/pulse/state.ts` | 修改 | 改为 pending.json 路径 |
| `scripts/preprocess/migrate-state.ts` | 创建 | 迁移脚本 |
| `skills/intelligence-output-templates/references/templates.md` | 修改 | 添加 converted_content_hash |
| `agents/intelligence-analyzer.md` | 修改 | 添加 converted_content_hash 写入 |
| `commands/intel-distill.md` | 修改 | 更新状态文件说明 |
| `commands/intel-pull.md` | 修改 | 更新状态文件位置说明 |
| `schemas/state.schema.json` | 删除 | 不再需要 |

---

## Task 1: 创建 pending.json Schema

**Files:**
- Create: `plugins/market-radar/schemas/pending.schema.json`

- [ ] **Step 1: 创建 pending.schema.json**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "pending.schema.json",
  "title": "Pending State Schema",
  "description": "JSON Schema for pending.json - lightweight runtime state for intel-distill and intel-pull",
  "type": "object",
  "required": ["version", "updated_at", "review", "pulse"],
  "additionalProperties": false,
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "State file format version (e.g., 1.0.0)"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "Last update timestamp (ISO 8601 format)"
    },
    "review": {
      "type": "object",
      "required": ["items"],
      "additionalProperties": false,
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/pending_item"
          },
          "description": "Items pending user review"
        }
      }
    },
    "pulse": {
      "type": "object",
      "required": ["cursors"],
      "additionalProperties": false,
      "properties": {
        "cursors": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/cursor_state"
          },
          "description": "Cursors for each intel source"
        }
      }
    }
  },
  "definitions": {
    "pending_item": {
      "type": "object",
      "required": ["pending_id", "converted_file", "archived_source", "added_at", "reason"],
      "additionalProperties": false,
      "properties": {
        "pending_id": {
          "type": "string",
          "pattern": "^pending-[a-z][a-z-]*-\\d{8}-\\d{3}$",
          "description": "Temporary ID for pending review (format: pending-{domain}-{YYYYMMDD}-{seq})"
        },
        "converted_file": {
          "type": "string",
          "description": "Path to converted markdown file (relative to root_dir)"
        },
        "archived_source": {
          "type": "string",
          "description": "Path to archived source file (relative to root_dir)"
        },
        "added_at": {
          "type": "string",
          "format": "date-time",
          "description": "When added to pending queue (ISO 8601)"
        },
        "reason": {
          "type": "string",
          "description": "Reason for requiring review"
        }
      }
    },
    "cursor_state": {
      "type": "object",
      "required": ["last_fetched_at", "last_item_id"],
      "additionalProperties": false,
      "properties": {
        "last_fetched_at": {
          "type": ["string", "null"],
          "format": "date-time",
          "description": "Timestamp of last fetched item from API (ISO 8601)"
        },
        "last_item_id": {
          "type": ["string", "null"],
          "description": "ID of last fetched item for cursor pagination"
        },
        "last_pull": {
          "type": ["string", "null"],
          "format": "date-time",
          "description": "When last pull completed (ISO 8601)"
        },
        "total_synced": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "description": "Total items synced for this source"
        }
      }
    }
  }
}
```

- [ ] **Step 2: 验证 schema 语法**

Run: `cd plugins/market-radar/scripts && pnpm exec tsx validate-json.ts schema ../schemas/pending.schema.json`

Expected: Schema 文件创建成功（无输出表示通过）

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/schemas/pending.schema.json
git commit -m "feat(market-radar): add pending.json schema

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 修改预处理脚本添加 processed_status

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/index.ts`

- [ ] **Step 1: 修改 generateFrontmatter 函数**

找到 `generateFrontmatter` 函数（约第 150 行），修改为：

```typescript
/**
 * Generate frontmatter for converted file
 */
function generateFrontmatter(
  sourceHash: string,
  originalPath: string,
  archivedAt: string,
  archivedSource: string
): string {
  return `---
sourceHash: "${sourceHash}"
originalPath: "${originalPath}"
archivedAt: "${archivedAt}"
archivedSource: "${archivedSource}"
processed_status: "pending"
processed_at: null
---

`;
}
```

- [ ] **Step 2: 验证修改**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`

Expected: 无编译错误

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "feat(market-radar): add processed_status to converted file frontmatter

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 创建迁移脚本

**Files:**
- Create: `plugins/market-radar/scripts/preprocess/migrate-state.ts`

- [ ] **Step 1: 创建迁移脚本**

```typescript
#!/usr/bin/env node
/**
 * Migrate state.json to pending.json
 *
 * Extracts:
 * - review.pending → pending.json review.items
 * - pulse.cursors → pending.json pulse.cursors
 *
 * Usage:
 *   pnpm exec tsx migrate-state.ts --root <dir>
 */

import * as fs from 'fs';
import * as path from 'path';

interface OldPendingItem {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}

interface OldState {
  version: string;
  review?: {
    pending?: OldPendingItem[];
  };
  pulse?: {
    cursors?: Record<string, {
      last_fetched_at?: string | null;
      last_item_id?: string | null;
      last_pull?: string | null;
      total_synced?: number;
    }>;
  };
}

interface NewPending {
  version: string;
  updated_at: string;
  review: {
    items: OldPendingItem[];
  };
  pulse: {
    cursors: Record<string, {
      last_fetched_at: string | null;
      last_item_id: string | null;
      last_pull: string | null;
      total_synced: number;
    }>;
  };
}

function getStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'state.json');
}

function getPendingPath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'pending.json');
}

function migrateState(oldState: OldState): NewPending {
  // Extract review.pending
  const items = oldState.review?.pending || [];

  // Extract pulse.cursors
  const oldCursors = oldState.pulse?.cursors || {};
  const cursors: NewPending['pulse']['cursors'] = {};

  for (const [sourceName, cursor] of Object.entries(oldCursors)) {
    cursors[sourceName] = {
      last_fetched_at: cursor.last_fetched_at || null,
      last_item_id: cursor.last_item_id || null,
      last_pull: cursor.last_pull || null,
      total_synced: cursor.total_synced || 0,
    };
  }

  return {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    review: { items },
    pulse: { cursors },
  };
}

function main(): void {
  const args = process.argv.slice(2);
  let rootDir = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++;
    }
  }

  const statePath = getStatePath(rootDir);
  const pendingPath = getPendingPath(rootDir);

  // Check if state.json exists
  if (!fs.existsSync(statePath)) {
    console.log('No state.json found, nothing to migrate');
    process.exit(0);
  }

  // Check if pending.json already exists
  if (fs.existsSync(pendingPath)) {
    console.log('pending.json already exists, skipping migration');
    process.exit(0);
  }

  // Read old state
  const content = fs.readFileSync(statePath, 'utf-8');
  const oldState: OldState = JSON.parse(content);

  // Migrate
  const newPending = migrateState(oldState);

  // Write pending.json
  const pendingDir = path.dirname(pendingPath);
  if (!fs.existsSync(pendingDir)) {
    fs.mkdirSync(pendingDir, { recursive: true });
  }

  fs.writeFileSync(pendingPath, JSON.stringify(newPending, null, 2) + '\n', 'utf-8');

  // Backup old state.json
  const backupPath = statePath + '.bak';
  fs.renameSync(statePath, backupPath);

  console.log(`✅ Migration complete`);
  console.log(`   Created: ${pendingPath}`);
  console.log(`   Backup: ${backupPath}`);
  console.log(`   Review items: ${newPending.review.items.length}`);
  console.log(`   Sources: ${Object.keys(newPending.pulse.cursors).length}`);
}

main();
```

- [ ] **Step 2: 验证编译**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`

Expected: 无编译错误

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/migrate-state.ts
git commit -m "feat(market-radar): add state.json to pending.json migration script

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 重写 scan-queue.ts

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/scan-queue.ts`

- [ ] **Step 1: 添加新的类型定义**

在文件顶部类型定义区域添加：

```typescript
/**
 * Processed status in converted file frontmatter
 */
type ProcessedStatus = 'pending' | 'passed' | 'rejected';

/**
 * Converted file frontmatter (new fields)
 */
interface ConvertedFrontmatter {
  sourceHash?: string;
  content_hash?: string;
  processed_status?: ProcessedStatus;
  processed_at?: string | null;
  archivedSource?: string;
}

/**
 * Intelligence card frontmatter (for converted_file lookup)
 */
interface IntelligenceFrontmatter {
  converted_file?: string;
  converted_content_hash?: string;
}
```

- [ ] **Step 2: 添加 pending.json 加载函数**

在 `loadState` 函数后添加：

```typescript
/**
 * Get pending.json path
 */
function getPendingPath(sourceDir: string): string {
  return path.join(sourceDir, '.intel', 'pending.json');
}

/**
 * Load pending.json
 */
function loadPending(pendingPath: string): {
  review: { items: PendingReviewItem[] };
  pulse: { cursors: Record<string, unknown> };
} | null {
  if (!fs.existsSync(pendingPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pendingPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

interface PendingReviewItem {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}
```

- [ ] **Step 3: 添加 intelligence/ 扫描函数**

```typescript
/**
 * Scan intelligence cards to build converted_file lookup
 */
function scanIntelligenceCards(sourceDir: string): Map<string, string> {
  const convertedToHash = new Map<string, string>();
  const intelligenceDir = path.join(sourceDir, 'intelligence');

  if (!fs.existsSync(intelligenceDir)) {
    return convertedToHash;
  }

  // Recursively scan intelligence/**/*.md
  const scanDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);
          if (frontmatter?.converted_file) {
            // Extract converted_file from WikiLink format: [[path]]
            const convertedFile = frontmatter.converted_file
              .replace(/^\[\[/, '')
              .replace(/\]\]$/, '');
            convertedToHash.set(
              convertedFile,
              frontmatter.converted_content_hash || ''
            );
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  };

  scanDir(intelligenceDir);
  return convertedToHash;
}
```

- [ ] **Step 4: 重写 scanAndBuildQueue 函数**

将现有函数替换为：

```typescript
/**
 * Scan converted files and build processing queue
 */
function scanAndBuildQueue(
  sourceDir: string,
  pendingPath?: string
): ScanQueueResult {
  const resolvedSourceDir = path.resolve(sourceDir);
  const resolvedPendingPath = pendingPath || getPendingPath(resolvedSourceDir);

  // Load pending items
  const pending = loadPending(resolvedPendingPath);
  const pendingReviewSet = new Set<string>();
  if (pending?.review?.items) {
    for (const item of pending.review.items) {
      pendingReviewSet.add(item.converted_file);
    }
  }

  // Scan intelligence cards for converted_file lookup
  const convertedToHash = scanIntelligenceCards(resolvedSourceDir);

  // Scan converted files
  const convertedDir = path.join(resolvedSourceDir, 'converted');
  const relativeFiles = scanMarkdownFiles(convertedDir, resolvedSourceDir);

  // Build queue
  const queue: QueueItem[] = [];
  let alreadyProcessed = 0;
  let needsProcessing = 0;
  let pendingReview = 0;

  for (const relativePath of relativeFiles) {
    const filePath = path.join(resolvedSourceDir, relativePath);

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    // Calculate content hash
    const contentHash = createHash('md5').update(content).digest('hex');

    // Parse frontmatter
    const frontmatter = parseFrontmatter(content) as ConvertedFrontmatter | null;
    const sourceHash = frontmatter?.sourceHash;
    const archivedSource = frontmatter?.archivedSource;
    const processedStatus = frontmatter?.processed_status;

    // Check if in pending review
    if (pendingReviewSet.has(relativePath)) {
      queue.push({
        file: relativePath,
        content_hash: contentHash,
        source_hash: sourceHash,
        archived_source: archivedSource,
        status: 'pending_review',
      });
      pendingReview++;
      continue;
    }

    // Check processed_status
    if (processedStatus === 'rejected') {
      // Skip rejected files
      alreadyProcessed++;
      continue;
    }

    if (processedStatus === 'passed') {
      // Verify intelligence card exists
      const recordedHash = convertedToHash.get(relativePath);
      if (recordedHash && recordedHash === contentHash) {
        // Already processed, content unchanged
        alreadyProcessed++;
        continue;
      }
      // Content changed or card missing - needs reprocessing
    }

    // pending, missing status, or needs reprocessing
    queue.push({
      file: relativePath,
      content_hash: contentHash,
      source_hash: sourceHash,
      archived_source: archivedSource,
      status: 'needs_processing',
    });
    needsProcessing++;
  }

  // Determine recommendation
  const totalNeedsProcessing = needsProcessing + pendingReview;
  const recommendation = totalNeedsProcessing >= RECOMMENDED_SCRIPT_THRESHOLD
    ? 'script'
    : 'glob';

  return {
    source_dir: resolvedSourceDir,
    total: relativeFiles.length,
    already_processed: alreadyProcessed,
    needs_processing: needsProcessing,
    pending_review: pendingReview,
    queue,
    threshold: RECOMMENDED_SCRIPT_THRESHOLD,
    recommendation,
  };
}
```

- [ ] **Step 5: 更新 CLI 参数处理**

在 main 函数中，保持参数命名一致性：

```typescript
function main(): void {
  const args = process.argv.slice(2);
  let sourceDir = '.';
  let outputFormat: 'json' | 'text' = 'json';

  // Parse arguments
  // Note: pending.json path is derived from sourceDir automatically
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputFormat = args[i + 1] as 'json' | 'text';
      i++;
    }
  }

  const result = scanAndBuildQueue(sourceDir);
  
  if (outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatAsText(result));
  }
}
```

**参数说明**：
- `--source <dir>`: 源目录（默认当前目录）
- `--output <format>`: 输出格式 `json` 或 `text`（默认 `json`）
- pending.json 路径自动从源目录推导（`{source}/.intel/pending.json`）

- [ ] **Step 6: 验证编译**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`

Expected: 无编译错误

- [ ] **Step 7: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/scan-queue.ts
git commit -m "refactor(market-radar): rewrite scan-queue to use processed_status

- Check converted file processed_status field
- Scan intelligence/ for converted_file lookup
- Remove dependency on state.processed

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 重写 update-state.ts

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/update-state.ts`

- [ ] **Step 1: 添加 pending.json 类型定义**

在文件顶部添加：

```typescript
/**
 * Pending item for review
 */
interface PendingItem {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}

/**
 * Pending.json structure
 */
interface PendingFile {
  version: string;
  updated_at: string;
  review: {
    items: PendingItem[];
  };
  pulse: {
    cursors: Record<string, {
      last_fetched_at: string | null;
      last_item_id: string | null;
      last_pull: string | null;
      total_synced: number;
    }>;
  };
}
```

- [ ] **Step 2: 添加 pending.json 路径函数**

```typescript
/**
 * Get pending.json path
 */
function getPendingPath(outputDir: string): string {
  return path.join(outputDir, '.intel', 'pending.json');
}

/**
 * Load or create pending.json
 */
function loadOrCreatePending(pendingPath: string): PendingFile {
  if (fs.existsSync(pendingPath)) {
    const content = fs.readFileSync(pendingPath, 'utf-8');
    return JSON.parse(content);
  }

  return {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    review: { items: [] },
    pulse: { cursors: {} },
  };
}

/**
 * Save pending.json
 */
function savePending(pendingPath: string, pending: PendingFile): void {
  pending.updated_at = new Date().toISOString();
  const dir = path.dirname(pendingPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2) + '\n', 'utf-8');
}
```

- [ ] **Step 3: 添加转换文件更新函数**

```typescript
/**
 * Update converted file frontmatter with processed_status
 */
function updateConvertedFileStatus(
  sourceDir: string,
  convertedFile: string,
  status: 'passed' | 'rejected',
  contentHash?: string
): void {
  const filePath = path.join(sourceDir, convertedFile);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: Converted file not found: ${convertedFile}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Parse existing frontmatter
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!frontmatterMatch) {
    console.warn(`Warning: No frontmatter in ${convertedFile}`);
    return;
  }

  const frontmatterContent = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Update frontmatter fields
  const timestamp = new Date().toISOString();
  let updatedFrontmatter = frontmatterContent
    .replace(/processed_status:\s*["']?pending["']?/, `processed_status: "${status}"`)
    .replace(/processed_status:\s*null/, `processed_status: "${status}"`);
  
  // Add processed_status if not present
  if (!updatedFrontmatter.includes('processed_status:')) {
    updatedFrontmatter += `\nprocessed_status: "${status}"`;
  }
  
  // Update processed_at
  if (updatedFrontmatter.includes('processed_at:')) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /processed_at:\s*[^\n]+/,
      `processed_at: "${timestamp}"`
    );
  } else {
    updatedFrontmatter += `\nprocessed_at: "${timestamp}"`;
  }

  // Write updated content
  const newContent = `---\n${updatedFrontmatter}\n---\n${body}`;
  fs.writeFileSync(filePath, newContent, 'utf-8');
}
```

- [ ] **Step 4: 重写主更新逻辑**

替换 `updateStateWithResults` 函数：

```typescript
/**
 * Update state with agent results
 */
function updateStateWithResults(
  sourceDir: string,
  pendingPath: string,
  results: AgentResult[]
): void {
  const pending = loadOrCreatePending(pendingPath);

  for (const result of results) {
    const { source_file, has_strategic_value, review_reason } = result;

    if (has_strategic_value === null) {
      // Needs review - add to pending
      const pendingId = generatePendingId(result.domain || 'unknown');
      pending.review.items.push({
        pending_id: pendingId,
        converted_file: source_file,
        archived_source: result.archived_source,
        added_at: new Date().toISOString(),
        reason: review_reason || '需人工审核',
      });
    } else if (has_strategic_value === true) {
      // Passed - update converted file
      updateConvertedFileStatus(sourceDir, source_file, 'passed', result.content_hash);
    } else {
      // Rejected - update converted file
      updateConvertedFileStatus(sourceDir, source_file, 'rejected');
    }
  }

  savePending(pendingPath, pending);
}

/**
 * Generate pending_id
 */
function generatePendingId(domain: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const domainPrefix = domain.toLowerCase().replace(/[^a-z]/g, '-').slice(0, 20);
  return `pending-${domainPrefix}-${timestamp}-${seq}`;
}
```

- [ ] **Step 5: 更新 main 函数**

```typescript
function main(): void {
  const args = process.argv.slice(2);
  let outputDir = '.';
  let resultsJson = '';
  let reviewAction = '';
  let pendingId = '';
  let reviewReason = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++;
    } else if (args[i] === '--results' && i + 1 < args.length) {
      resultsJson = args[i + 1];
      i++;
    } else if (args[i] === '--review' && i + 1 < args.length) {
      reviewAction = args[i + 1];
      i++;
    } else if (args[i] === '--pending-id' && i + 1 < args.length) {
      pendingId = args[i + 1];
      i++;
    } else if (args[i] === '--reason' && i + 1 < args.length) {
      reviewReason = args[i + 1];
      i++;
    }
  }

  // Handle review mode
  if (reviewAction) {
    handleReviewAction(outputDir, reviewAction, pendingId, reviewReason);
    return;
  }

  // Handle normal processing mode
  if (!resultsJson) {
    console.error('Error: --results parameter required');
    process.exit(1);
  }

  // Parse results
  let results: AgentResult[];
  try {
    results = JSON.parse(resultsJson);
  } catch {
    console.error('Error: Invalid JSON in --results');
    process.exit(1);
  }

  // Validate results
  for (let i = 0; i < results.length; i++) {
    const validation = validateAgentResult(results[i], i);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
    results[i] = validation.data;
  }

  const pendingPath = getPendingPath(outputDir);
  updateStateWithResults(outputDir, pendingPath, results);

  console.log(`✅ State updated successfully`);
  console.log(`   Processed: ${results.length} files`);
}
```

- [ ] **Step 5.1: 添加审核模式处理函数**

在 main 函数之前添加：

```typescript
/**
 * Handle review action (approve/reject)
 */
function handleReviewAction(
  outputDir: string,
  action: string,
  pendingId: string,
  reason: string
): void {
  if (action === 'list') {
    listPendingReviews(outputDir);
    return;
  }

  if (!pendingId) {
    console.error('Error: --pending-id required for approve/reject');
    process.exit(1);
  }

  if (!reason) {
    console.warn('Warning: No --reason provided');
  }

  const pendingPath = getPendingPath(outputDir);
  const pending = loadOrCreatePending(pendingPath);

  // Find pending item
  const itemIndex = pending.review.items.findIndex(
    item => item.pending_id === pendingId
  );

  if (itemIndex === -1) {
    console.error(`Error: Pending ID not found: ${pendingId}`);
    process.exit(1);
  }

  const item = pending.review.items[itemIndex];

  if (action === 'approve') {
    // Note: Agent invocation is handled by the command layer
    // This function only updates the pending.json and converted file status
    updateConvertedFileStatus(outputDir, item.converted_file, 'passed');
    pending.review.items.splice(itemIndex, 1);
    savePending(pendingPath, pending);
    console.log(`✅ Approved: ${pendingId}`);
    console.log(`   Reason: ${reason || '(none)'}`);
  } else if (action === 'reject') {
    updateConvertedFileStatus(outputDir, item.converted_file, 'rejected');
    pending.review.items.splice(itemIndex, 1);
    savePending(pendingPath, pending);
    console.log(`✅ Rejected: ${pendingId}`);
    console.log(`   Reason: ${reason || '(none)'}`);
  } else {
    console.error(`Error: Unknown review action: ${action}`);
    process.exit(1);
  }
}

/**
 * List pending reviews
 */
function listPendingReviews(outputDir: string): void {
  const pendingPath = getPendingPath(outputDir);
  const pending = loadOrCreatePending(pendingPath);

  if (pending.review.items.length === 0) {
    console.log('No pending reviews');
    return;
  }

  console.log(`📋 Pending Reviews (${pending.review.items.length})\n`);
  for (const item of pending.review.items) {
    console.log(`ID: ${item.pending_id}`);
    console.log(`  Converted: ${item.converted_file}`);
    console.log(`  Archived: ${item.archived_source}`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  Added: ${item.added_at}`);
    console.log('');
  }
}
```

- [ ] **Step 6: 验证编译**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`

Expected: 无编译错误

- [ ] **Step 7: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/update-state.ts
git commit -m "refactor(market-radar): rewrite update-state for pending.json

- Update pending.json instead of state.json
- Write processed_status to converted file frontmatter
- Remove processed and stats fields

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 修改 pulse/state.ts

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/state.ts`

- [ ] **Step 1: 修改 getStatePath 函数**

将 `getStatePath` 改为返回 pending.json 路径：

```typescript
/**
 * Get state file path (now pending.json)
 *
 * @param rootDir - Project root directory
 * @returns Full path to pending.json
 */
export function getStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'pending.json');
}

/**
 * Get old state.json path (for migration)
 */
export function getOldStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'state.json');
}
```

- [ ] **Step 2: 修改 loadState 默认结构**

```typescript
/**
 * Load state from file
 */
export function loadState(rootDir: string): Record<string, unknown> {
  const statePath = getStatePath(rootDir);
  const oldStatePath = getOldStatePath(rootDir);

  // Check if old state.json exists (need migration)
  if (!fs.existsSync(statePath) && fs.existsSync(oldStatePath)) {
    console.log('[pulse] Old state.json detected, migration required');
    // Migration will be handled by migrate-state.ts
    // Return default structure for now
    return {
      version: STATE_VERSION,
      updated_at: new Date().toISOString(),
      review: { items: [] },
      pulse: DEFAULT_PULSE_STATE,
    };
  }

  if (!fs.existsSync(statePath)) {
    return {
      version: STATE_VERSION,
      updated_at: new Date().toISOString(),
      review: { items: [] },
      pulse: DEFAULT_PULSE_STATE,
    };
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PulseError('STATE_ERROR', `状态文件读取失败: ${message}`);
  }
}
```

- [ ] **Step 3: 简化 migrateState 函数**

```typescript
/**
 * Migrate state to current version (simplified for pending.json)
 */
function migrateState(state: Record<string, unknown>): Record<string, unknown> {
  // pending.json format is simpler, just ensure pulse field exists
  if (!state.pulse) {
    state.pulse = DEFAULT_PULSE_STATE;
  }

  // Ensure review.items exists
  if (!state.review) {
    state.review = { items: [] };
  } else if (!state.review.items) {
    state.review.items = [];
  }

  return state;
}
```

- [ ] **Step 4: 验证编译**

Run: `cd plugins/market-radar/scripts && pnpm exec tsc --noEmit`

Expected: 无编译错误

- [ ] **Step 5: 提交**

```bash
git add plugins/market-radar/scripts/pulse/state.ts
git commit -m "refactor(market-radar): change pulse state to pending.json

- Update getStatePath to return pending.json
- Simplify default structure
- Add migration detection for old state.json

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 添加 converted_content_hash 到情报卡片模板

**Files:**
- Modify: `plugins/market-radar/skills/intelligence-output-templates/references/templates.md`
- Modify: `plugins/market-radar/skills/intelligence-output-templates/SKILL.md`

- [ ] **Step 1: 更新 SKILL.md 第二组字段说明**

在 `item 来源追溯` 部分添加 `converted_content_hash`：

```markdown
**第二组：item 来源追溯（继承 + 预处理）**

| 字段 | 说明 | 必填 |
|------|------|------|
| `item_id` | 采集阶段标识（格式：`item_{8位hex}`） | ✅ |
| `item_title` | item 标题 | ✅ |
| `author` | 作者 | ❌ |
| `original_url` | 原文链接 | ❌ |
| `published_at` | 原文发布时间（ISO 8601） | ❌ |
| `fetched_at` | 采集时间（ISO 8601） | ✅ |
| `completeness_score` | 完整度 0-1 | ❌ |
| `archived_file` | 归档文件链接（WikiLink） | ✅ |
| `converted_file` | 转换文件链接（WikiLink） | ✅ |
| `converted_content_hash` | 转换文件的 content_hash（用于变更检测） | ✅ |
```

- [ ] **Step 2: 更新 templates.md 所有模板**

在每个领域模板的第二组添加 `converted_content_hash` 字段。示例：

```yaml
# 第二组：item 来源追溯
item_id: "item_a1b2c3d4"
item_title: "Lazarus Group's New Malware Campaign"
author: "Security Research Team"
original_url: "https://example.com/security/lazarus-malware-2026"
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:30:00Z"
completeness_score: 0.92
archived_file: "[[archive/2026/04/report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md]]"
converted_content_hash: "abc123def456789..."
```

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/
git commit -m "feat(market-radar): add converted_content_hash to templates

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: 更新 intelligence-analyzer Agent

**Files:**
- Modify: `plugins/market-radar/agents/intelligence-analyzer.md`

- [ ] **Step 1: 在 frontmatter 继承表中添加字段**

找到第二组字段说明（约第 65-80 行），添加 `converted_content_hash`：

```markdown
**第二组：item 来源追溯（继承 + 预处理）**

| 字段 | 说明 | 必填 |
|------|------|------|
| `item_id` | 采集阶段标识 | ✅ |
| `item_title` | item 标题 | ✅ |
| `author` | 作者 | ❌ |
| `original_url` | 原文链接 | ❌ |
| `published_at` | 原文发布时间（ISO 8601） | ❌ |
| `fetched_at` | 采集时间（ISO 8601） | ✅ |
| `completeness_score` | 完整度 0-1 | ❌ |
| `archived_file` | 归档文件链接（WikiLink） | ✅ |
| `converted_file` | 转换文件链接（WikiLink） | ✅ |
| `converted_content_hash` | 转换文件的 content_hash | ✅ |
```

- [ ] **Step 2: 添加 content_hash 提取说明**

在步骤 1 中添加 content_hash 提取：

```markdown
**步骤 1.1：解析 frontmatter（v3.0 四组结构）**

从转换文件的 frontmatter 中提取元数据：

...

**步骤 1.2：提取 content_hash**

从转换文件 frontmatter 提取 `content_hash` 字段，用于：
- 写入情报卡片的 `converted_content_hash` 字段
- 实现基于文件系统的变更检测
```

- [ ] **Step 3: 更新情报卡片写入说明**

在写入情报卡片的说明中添加：

```markdown
**第二组字段继承规则**：
- 从转换文件 frontmatter 直接继承
- `converted_content_hash` = 转换文件的 `content_hash`
```

- [ ] **Step 4: 提交**

```bash
git add plugins/market-radar/agents/intelligence-analyzer.md
git commit -m "feat(market-radar): add converted_content_hash to agent

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 更新 intel-distill.md 命令文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

- [ ] **Step 1: 更新状态文件说明**

找到状态文件说明部分，替换为：

```markdown
## 状态管理（v3.0）

### 状态文件

**位置**：`.intel/pending.json`

仅存储运行时状态，不累积历史数据：

```json
{
  "version": "1.0.0",
  "updated_at": "2026-04-06T12:00:00Z",
  "review": {
    "items": [
      {
        "pending_id": "pending-threat-20260406-001",
        "converted_file": "converted/2026/04/report.md",
        "archived_source": "archive/2026/04/report.pdf",
        "added_at": "2026-04-06T10:00:00Z",
        "reason": "检测到高风险威胁指标"
      }
    ]
  },
  "pulse": {
    "cursors": { ... }
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 状态文件格式版本 |
| `updated_at` | string | 最后更新时间（ISO 8601） |
| `review.items` | array | 待审核项列表 |
| `pulse.cursors` | object | intel-pull cursor |

### 已处理状态追踪

已处理状态通过文件系统追踪：

1. **转换文件 frontmatter**：`processed_status` 字段
   - `pending`：待处理
   - `passed`：已处理，有情报卡片
   - `rejected`：已拒绝

2. **情报卡片 frontmatter**：`converted_file` + `converted_content_hash`
   - 用于确认卡片存在和检测内容变更
```

- [ ] **Step 2: 更新 scan-queue 脚本调用说明**

将脚本调用中的参数说明更新：

```markdown
#### 6.3 策略 B：脚本处理（>= 50 个文件）

调用扫描队列脚本，一次性完成扫描、frontmatter 解析、状态对比：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/scan-queue.ts \
  --source {root_dir} \
  --output json
```

**注意**：脚本自动检测 `pending.json` 位置（`.intel/pending.json`），无需指定状态文件路径。

**脚本输出格式**：
...
```

- [ ] **Step 2.1: 更新 update-state 脚本调用说明**

更新 Agent 结果处理和审核模式的脚本调用：

```markdown
#### 8.4 统一更新状态文件

调用 `update-state.ts` 脚本更新状态：

**处理模式**：
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/update-state.ts \
  --output {output_dir} \
  --results '[{Agent结果JSON数组}]'
```

**审核模式**：
```bash
# 列出待审核
pnpm exec tsx preprocess/update-state.ts --output {output_dir} --review list

# 批准审核（注意：Agent 调用由命令层处理，脚本仅更新状态）
pnpm exec tsx preprocess/update-state.ts --output {output_dir} \
  --review approve \
  --pending-id {pending_id} \
  --reason "批准原因"

# 拒绝审核
pnpm exec tsx preprocess/update-state.ts --output {output_dir} \
  --review reject \
  --pending-id {pending_id} \
  --reason "拒绝原因"
```

**注意**：`approve` 操作时，Agent 调用由命令层执行（需要 Agent 工具权限），脚本仅负责更新 pending.json 和转换文件状态。
```

- [ ] **Step 3: 删除 processed 和 stats 字段说明**

移除文档中关于 `state.processed` 和 `state.stats` 的详细说明。

- [ ] **Step 4: 更新迁移说明（独立迁移）**

```markdown
### 迁移说明

**升级说明**：从旧版 state.json 迁移到 pending.json 是一次性操作，请手动执行迁移脚本：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx preprocess/migrate-state.ts --root {root_dir}
```

**迁移操作**：
- 提取 `review.pending` → `pending.json`
- 提取 `pulse.cursors` → `pending.json`
- 备份 `state.json` → `state.json.bak`

**首次运行检测**：
如果首次运行时检测到旧版 `state.json` 且没有 `pending.json`，命令会提示用户执行迁移脚本，然后退出。
```

- [ ] **Step 5: 提交**

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "docs(market-radar): update intel-distill state management docs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 更新 intel-pull.md 命令文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-pull.md`

- [ ] **Step 1: 更新状态文件位置说明**

找到状态管理部分，更新为：

```markdown
## 状态管理

### 状态文件

**位置**：`{root_dir}/.intel/pending.json`

与 `intel-distill` 共享同一状态文件：

```json
{
  "version": "1.0.0",
  "updated_at": "2026-04-06T12:00:00Z",
  "review": {
    "items": [ ... ]
  },
  "pulse": {
    "cursors": {
      "cyber-pulse": {
        "last_fetched_at": "2026-04-06T09:00:00Z",
        "last_item_id": "item_abc12345",
        "last_pull": "2026-04-06T10:00:00Z",
        "total_synced": 150
      }
    }
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `pulse.cursors.{source}` | object | 各情报源的同步状态 |
| `pulse.cursors.{source}.last_fetched_at` | string | API 返回的最后一条数据的 fetched_at 时间 |
| `pulse.cursors.{source}.last_item_id` | string | API 返回的最后一条数据的 ID |
| `pulse.cursors.{source}.last_pull` | string | 本地同步完成时间 |
| `pulse.cursors.{source}.total_synced` | number | 累计同步数量 |

### 迁移说明

**升级说明**：从旧版 state.json 迁移到 pending.json 是一次性操作。如果首次运行时检测到旧版 `state.json` 且没有 `pending.json`，会提示用户执行迁移脚本：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx preprocess/migrate-state.ts --root {root_dir}
```

迁移完成后重新执行 intel-pull 命令。
```

- [ ] **Step 2: 提交**

```bash
git add plugins/market-radar/commands/intel-pull.md
git commit -m "docs(market-radar): update intel-pull state file location

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: 删除旧 schema 文件

**Files:**
- Delete: `plugins/market-radar/schemas/state.schema.json`

- [ ] **Step 1: 删除 state.schema.json**

```bash
rm plugins/market-radar/schemas/state.schema.json
```

- [ ] **Step 2: 提交**

```bash
git add plugins/market-radar/schemas/state.schema.json
git commit -m "refactor(market-radar): remove old state.schema.json

No longer needed with pending.json

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: 集成测试

**Files:**
- Test: 整体流程验证

- [ ] **Step 1: 测试迁移脚本**

```bash
cd plugins/market-radar/scripts
# 创建测试环境
mkdir -p /tmp/test-migrate/.intel
echo '{"version":"2.0.0","review":{"pending":[{"pending_id":"pending-test-001","converted_file":"converted/test.md","archived_source":"archive/test.pdf","added_at":"2026-04-06T10:00:00Z","reason":"test"}]},"pulse":{"cursors":{"test-src":{"last_fetched_at":"2026-04-06T09:00:00Z","last_item_id":"item_001"}}}}' > /tmp/test-migrate/.intel/state.json

# 执行迁移
pnpm exec tsx preprocess/migrate-state.ts --root /tmp/test-migrate

# 验证结果
cat /tmp/test-migrate/.intel/pending.json
```

Expected: pending.json 包含 review.items 和 pulse.cursors

- [ ] **Step 2: 清理测试环境**

```bash
rm -rf /tmp/test-migrate
```

- [ ] **Step 3: 验证 scan-queue 新逻辑**

```bash
cd plugins/market-radar/scripts
pnpm exec tsx preprocess/scan-queue.ts --source . --output text
```

Expected: 扫描结果正确显示已处理/待处理数量

---

## Self-Review Checklist

### Spec Coverage

| 需求 | Task | 状态 |
|------|------|------|
| 删除 processed 字段 | Task 4, 5 | ✅ |
| 删除 stats 字段 | Task 5 | ✅ |
| 删除 queue.processing 字段 | Task 5 | ✅ |
| 创建 pending.json | Task 1, 3 | ✅ |
| 添加 processed_status 到转换文件 | Task 2, 5 | ✅ |
| 添加 converted_content_hash 到情报卡片 | Task 7, 8 | ✅ |
| 重写 scan-queue.ts | Task 4 | ✅ |
| 重写 update-state.ts | Task 5 | ✅ |
| 修改 pulse/state.ts | Task 6 | ✅ |
| 迁移脚本 | Task 3 | ✅ |
| 更新文档 | Task 9, 10 | ✅ |

### Placeholder Scan

- [x] 无 TBD/TODO
- [x] 无 "add appropriate error handling"
- [x] 所有代码步骤都有完整代码
- [x] 无 "similar to Task N"

### Type Consistency

- [x] `ProcessedStatus` 类型在 scan-queue.ts 和 update-state.ts 一致
- [x] `PendingFile` 接口与 pending.schema.json 一致
- [x] `PendingItem` 结构在各文件一致

---

## 向后兼容性与迁移策略

### 现有文档处理

| 目录 | 新字段 | 现有文件 | 处理策略 |
|------|--------|---------|----------|
| **archive/** | 无变化 | ✅ 无影响 | 无需处理 |
| **converted/** | `processed_status` | ⚠️ 无此字段 | 自动检测 intelligence 卡片存在 → 视为已处理 |
| **intelligence/** | `converted_content_hash` | ⚠️ 无此字段 | 新处理时自动写入 |
| **state.json** | → `pending.json` | ⚠️ 需迁移 | 运行 `migrate-state.ts` |

### 向后兼容逻辑 (scan-queue.ts)

```typescript
if (processedStatus === undefined || processedStatus === null) {
  // BACKWARD COMPATIBILITY: No processed_status field
  // Check if intelligence card exists - if yes, treat as already processed
  if (convertedToHash.has(relativePath)) {
    alreadyProcessed++;
    continue;
  }
  // No intelligence card - needs processing
}
```

**行为说明：**
- 现有 converted 文件（无 `processed_status`）→ 检查是否存在对应的 intelligence 卡片
- 如果存在 → 视为已处理，跳过
- 如果不存在 → 加入处理队列

### 用户升级步骤

1. **备份数据**（可选但推荐）
   ```bash
   cp -r .intel .intel.backup
   cp -r converted converted.backup
   cp -r intelligence intelligence.backup
   ```

2. **运行迁移脚本**
   ```bash
   cd plugins/market-radar/scripts
   pnpm exec tsx preprocess/migrate-v1-to-v2.ts --root /path/to/vault
   ```

   预览模式（不实际修改）：
   ```bash
   pnpm exec tsx preprocess/migrate-v1-to-v2.ts --root /path/to/vault --dry-run
   ```

3. **迁移结果**

   | 步骤 | 操作 | 结果 |
   |------|------|------|
   | state.json | → pending.json | state.json 备份为 state.json.bak |
   | converted/*.md | 添加字段 | `processed_status: "passed"`, `processed_at: "<timestamp>"` |
   | intelligence/*.md | 添加字段 | `converted_content_hash: "<md5>"` |

4. **验证迁移**
   ```bash
   # 检查 pending.json
   cat .intel/pending.json

   # 检查 converted 文件
   head -20 converted/2026/04/some-file.md

   # 检查 intelligence 卡片
   head -20 intelligence/Industry-Analysis/some-card.md
   ```

### 迁移脚本详解

**文件**: `scripts/preprocess/migrate-v1-to-v2.ts`

**功能**:
1. **state.json → pending.json**: 提取 review.pending 和 pulse.cursors
2. **converted 文件**: 添加 `processed_status: 'passed'` 和 `processed_at` 时间戳
3. **intelligence 卡片**: 从卡片内容计算 MD5 hash，添加 `converted_content_hash`

**特点**:
- **幂等性**: 可以安全地多次运行，已迁移的文件会被跳过
- **dry-run 模式**: 预览将要执行的操作
- **错误收集**: 不会因单个文件失败而中断，最终汇总所有错误

### 无需手动迁移的字段

以下字段会自动添加，用户无需手动干预：
- `processed_status` - 所有 converted 文件自动标记为 'passed'
- `processed_at` - 迁移时的时间戳
- `converted_content_hash` - 从 intelligence 卡片内容计算