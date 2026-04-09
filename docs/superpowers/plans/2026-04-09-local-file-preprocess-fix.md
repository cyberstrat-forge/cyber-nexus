# 本地文件预处理路径修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复本地文件预处理的路径计算和去重机制问题，确保 WikiLink 可在 Obsidian 中跳转。

**Architecture:** 修改 `getArchivePath()`、`processFile()`、`processCyberPulseFile()` 和 `batchProcess()` 四个函数，统一路径基准为 `rootDir`，移除冗余的去重代码。

**Tech Stack:** TypeScript, Node.js, Vitest

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `scripts/preprocess/index.ts` | 核心预处理逻辑，修改函数签名和路径计算 |
| `scripts/preprocess/__tests__/preprocess.test.ts` | 新增测试文件，验证路径和去重修复 |

---

## Task 1: 为 `getArchivePath()` 编写测试

**Files:**
- Create: `scripts/preprocess/__tests__/preprocess.test.ts`

- [ ] **Step 1: 创建测试文件并编写 `getArchivePath` 测试**

```typescript
// scripts/preprocess/__tests__/preprocess.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';

// 注意：getArchivePath 是私有函数，需要导出或使用 rewire
// 这里假设我们将它导出用于测试

describe('getArchivePath', () => {
  it('should normalize filename with Unicode punctuation', () => {
    const sourcePath = '/project/inbox/Buyers\u2019 Guide.pdf'; // U+2019 RIGHT SINGLE QUOTATION MARK
    const archiveDir = '/project/archive/2026/04';
    
    // 导入 getArchivePath 函数
    // const { getArchivePath } = await import('../index');
    // const result = getArchivePath(sourcePath, archiveDir);
    
    // 期望结果：文件名被规范化
    // expect(result).toBe('/project/archive/2026/04/Buyers\' Guide.pdf');
  });

  it('should normalize filename with fullwidth characters', () => {
    const sourcePath = '/project/inbox/\u62A5\u544A\uFF1A2024.pdf'; // 报告：2024.pdf (fullwidth colon)
    const archiveDir = '/project/archive/2026/04';
    
    // const result = getArchivePath(sourcePath, archiveDir);
    // 期望：全角冒号转换为半角冒号
    // expect(result).toBe('/project/archive/2026/04/\u62A5\u544A:2024.pdf');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd plugins/market-radar && pnpm exec vitest run scripts/preprocess/__tests__/preprocess.test.ts`

Expected: FAIL - 测试未通过（函数未导出或行为不正确）

- [ ] **Step 3: 跳过测试（函数私有），直接修改实现**

由于 `getArchivePath` 是私有函数，无法直接测试。改为在集成测试中验证。删除此测试文件，稍后创建集成测试。

```bash
rm scripts/preprocess/__tests__/preprocess.test.ts
```

- [ ] **Step 4: 直接修改 `getArchivePath()` 实现**

修改 `scripts/preprocess/index.ts` 第 364-367 行：

```typescript
// 修改前
function getArchivePath(sourcePath: string, archiveDir: string): string {
  const filename = path.basename(sourcePath);
  return path.join(archiveDir, filename);
}

// 修改后
function getArchivePath(sourcePath: string, archiveDir: string): string {
  const rawFilename = path.basename(sourcePath);
  const filename = normalizeFilename(rawFilename);  // 应用规范化
  return path.join(archiveDir, filename);
}
```

- [ ] **Step 5: 验证 TypeScript 编译通过**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "fix(preprocess): apply normalizeFilename to archive filenames"
```

---

## Task 2: 重构 `processFile()` 函数签名

**Files:**
- Modify: `scripts/preprocess/index.ts:655-170`

- [ ] **Step 1: 修改 `processFile()` 函数签名**

修改 `scripts/preprocess/index.ts` 第 655-662 行：

```typescript
// 修改前
async function processFile(
  sourcePath: string,
  archiveDir: string,
  convertedDir: string,
  sourceDir: string,
  _currentVersion: string,
  knownHashes: Map<string, string>,
  _dateRef: Date
): Promise<PreprocessResult>

// 修改后
async function processFile(
  sourcePath: string,
  archiveDir: string,
  convertedDir: string,
  rootDir: string
): Promise<PreprocessResult>
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 有错误（调用方参数不匹配），继续下一步

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "refactor(preprocess): simplify processFile signature"
```

---

## Task 3: 简化 `processFile()` 内部的去重逻辑

**Files:**
- Modify: `scripts/preprocess/index.ts:655-680`

- [ ] **Step 1: 修改 `processFile()` 函数内部逻辑**

定位到 `processFile()` 函数内部（约第 665-680 行），找到：

```typescript
// Calculate source hash for deduplication
const sourceHash = calculateHash(sourcePath);

// Get archive path
const archivePath = getArchivePath(sourcePath, archiveDir);

// Check for duplicate based on existing converted files with frontmatter
// (knownHashes now collects from converted files, not .meta files)
if (knownHashes.has(sourceHash)) {
  return {
    success: true,
    isDuplicate: true,
    archivedPath: knownHashes.get(sourceHash),
  };
}
```

修改为：

```typescript
// Get archive path
const archivePath = getArchivePath(sourcePath, archiveDir);

// Calculate source hash for frontmatter (deduplication is done by caller)
const sourceHash = calculateHash(sourcePath);
```

**说明**：
- 保留 `sourceHash` 计算（用于 frontmatter）
- 移除去重检查（由 `batchProcess` 统一处理）
- 移除 `knownHashes` 参数后，函数不再需要这个去重检查

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 可能有错误（`knownHashes` 未定义的引用），继续下一步

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "refactor(preprocess): remove redundant dedup check from processFile"
```

---

## Task 4: 修改 `processFile()` 内部路径计算和错误日志

**Files:**
- Modify: `scripts/preprocess/index.ts:695, 726-750`

- [ ] **Step 1: 修改所有 `writeErrorLog` 调用**

在 `processFile()` 函数内找到所有 `writeErrorLog` 调用，将第二个参数从 `sourceDir` 改为 `path.dirname(sourcePath)`：

```typescript
// 修改前
writeErrorLog(sourcePath, sourceDir, code, message);

// 修改后
writeErrorLog(sourcePath, path.dirname(sourcePath), code, message);
```

使用 grep 查找所有位置：

```bash
cd plugins/market-radar && grep -n "writeErrorLog(sourcePath, sourceDir" scripts/preprocess/index.ts
```

逐个修改。

- [ ] **Step 2: 修改 `relativeArchivePath` 计算**

找到计算 `relativeArchivePath` 的代码（约第 740 行）：

```typescript
// 修改前
const relativeArchivePath = path.relative(sourceDir, archivePath);

// 修改后
const relativeArchivePath = path.relative(rootDir, archivePath);
```

- [ ] **Step 3: 规范化传给 `generateLocalFileFrontmatter` 的文件名**

找到调用 `generateLocalFileFrontmatter` 的位置（约第 742-748 行），修改为：

```typescript
// 修改前
const frontmatter = generateLocalFileFrontmatter(
  sourceHash,
  contentHash,
  path.basename(sourcePath),
  relativeArchivePath,
  now
);

// 修改后
const rawFilename = path.basename(sourcePath);
const normalizedFilename = normalizeFilename(rawFilename);

const frontmatter = generateLocalFileFrontmatter(
  sourceHash,
  contentHash,
  normalizedFilename,  // 使用规范化后的文件名
  relativeArchivePath,
  now
);
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 有错误（`batchProcess` 调用参数不匹配），继续下一步

- [ ] **Step 5: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "fix(preprocess): use rootDir for path calculation in processFile"
```

---

## Task 5: 重构 `processCyberPulseFile()` 函数签名

**Files:**
- Modify: `scripts/preprocess/index.ts:446-451`

- [ ] **Step 1: 修改 `processCyberPulseFile()` 函数签名**

修改第 446-451 行：

```typescript
// 修改前
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  sourceDir: string,
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult

// 修改后
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  rootDir: string,
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 有错误（调用方参数名不匹配）

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "refactor(preprocess): rename sourceDir to rootDir in processCyberPulseFile"
```

---

## Task 6: 修改 `processCyberPulseFile()` 内部路径计算

**Files:**
- Modify: `scripts/preprocess/index.ts:468-492`

- [ ] **Step 1: 修改所有 `writeErrorLog` 调用**

在 `processCyberPulseFile` 函数内找到所有：

```typescript
writeErrorLog(sourcePath, sourceDir, ...)
```

修改为：

```typescript
writeErrorLog(sourcePath, path.dirname(sourcePath), ...)
```

- [ ] **Step 2: 修改 `convertedRelativePath` 计算**

找到约第 492 行：

```typescript
// 修改前
const convertedRelativePath = path.relative(sourceDir, convertedPath);

// 修改后
const convertedRelativePath = path.relative(rootDir, convertedPath);
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 有错误（batchProcess 调用参数不匹配）

- [ ] **Step 4: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "fix(preprocess): use rootDir for path calculation in processCyberPulseFile"
```

---

## Task 7: 修改 `batchProcess()` 调用

**Files:**
- Modify: `scripts/preprocess/index.ts:869-945`

- [ ] **Step 1: 修改 cyber-pulse 文件处理调用**

找到 cyber-pulse 文件处理部分（约第 869-908 行），修改调用：

```typescript
// 修改前
const result = processCyberPulseFile(
  sourcePath,
  convertedDir,
  sourceDir,
  knownFiles,
  dateRef
);

// 修改后
const result = processCyberPulseFile(
  sourcePath,
  convertedDir,
  rootDir,
  knownFiles,
  dateRef
);
```

- [ ] **Step 2: 修改本地文件处理调用**

找到本地文件处理部分（约第 909-945 行），修改调用：

```typescript
// 修改前
const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  sourceDir,
  preprocessorVersion,
  knownHashes,
  dateRef
);

// 修改后
const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  rootDir
);
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "fix(preprocess): pass rootDir to processFile and processCyberPulseFile"
```

---

## Task 8: 修复 `knownHashes` 值类型

**Files:**
- Modify: `scripts/preprocess/index.ts:940-942`

- [ ] **Step 1: 修改 `knownHashes.set` 调用**

找到处理成功后的 `knownHashes.set` 调用：

```typescript
// 修改前
if (result.success) {
  knownHashes.set(sourceHash, result.archivedPath || '');
}

// 修改后
if (result.success && result.convertedPath) {
  knownHashes.set(sourceHash, result.convertedPath);
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd plugins/market-radar && pnpm exec tsc --noEmit`

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git commit -m "fix(preprocess): store convertedPath in knownHashes"
```

---

## Task 9: 创建单元测试

**Files:**
- Create: `scripts/preprocess/__tests__/preprocess-path.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
// scripts/preprocess/__tests__/preprocess-path.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { toWikiLink, fromWikiLink } from '../types/frontmatter';

describe('WikiLink Path Format', () => {
  it('should generate WikiLink without ../ prefix', () => {
    const relativePath = 'archive/2026/04/report.pdf';
    const result = toWikiLink(relativePath);
    
    expect(result).toBe('[[archive/2026/04/report.pdf|report.pdf]]');
    expect(result).not.toContain('../');
  });

  it('should generate WikiLink for converted file', () => {
    const relativePath = 'converted/2026/04/item_abc123.md';
    const result = toWikiLink(relativePath);
    
    expect(result).toBe('[[converted/2026/04/item_abc123.md|item_abc123.md]]');
  });

  it('should extract path from WikiLink with alias', () => {
    const wikiLink = '[[archive/2026/04/report.pdf|report.pdf]]';
    const result = fromWikiLink(wikiLink);
    
    expect(result).toBe('archive/2026/04/report.pdf');
  });

  it('should extract path from WikiLink without alias', () => {
    const wikiLink = '[[archive/2026/04/report.pdf]]';
    const result = fromWikiLink(wikiLink);
    
    expect(result).toBe('archive/2026/04/report.pdf');
  });

  it('should return null for non-WikiLink format', () => {
    const notWikiLink = '../archive/2026/04/report.pdf';
    const result = fromWikiLink(notWikiLink);
    
    expect(result).toBeNull();
  });
});

describe('Path Relative Calculation', () => {
  it('should produce correct relative path from rootDir', () => {
    const rootDir = '/project';
    const archivePath = '/project/archive/2026/04/report.pdf';
    
    const relativePath = path.relative(rootDir, archivePath);
    
    expect(relativePath).toBe('archive/2026/04/report.pdf');
    expect(relativePath).not.toContain('../');
  });

  it('should not produce ../ when using correct base', () => {
    const rootDir = '/project';
    const convertedPath = '/project/converted/2026/04/item_xxx.md';
    
    const relativePath = path.relative(rootDir, convertedPath);
    
    expect(relativePath).toBe('converted/2026/04/item_xxx.md');
    expect(relativePath).not.toContain('../');
  });
});
```

- [ ] **Step 2: 运行测试验证**

Run: `cd plugins/market-radar && pnpm exec vitest run scripts/preprocess/__tests__/preprocess-path.test.ts`

Expected: PASS - 所有测试通过

- [ ] **Step 3: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/__tests__/preprocess-path.test.ts
git commit -m "test(preprocess): add WikiLink path format tests"
```

---

## Task 10: 手动测试验证

**Files:**
- 无文件修改

- [ ] **Step 1: 创建测试 PDF 文件**

在项目根目录创建测试文件：

```bash
mkdir -p /tmp/test-preprocess/inbox
echo "%PDF-1.4 test content" > /tmp/test-preprocess/inbox/"Buyers' Guide.pdf"
```

- [ ] **Step 2: 运行预处理**

Run: `cd plugins/market-radar && pnpm run preprocess -- --source /tmp/test-preprocess/inbox --root /tmp/test-preprocess`

- [ ] **Step 3: 验证输出**

检查生成的文件：

```bash
# 检查 archive 文件名
ls -la /tmp/test-preprocess/archive/2026/04/

# 检查 converted 文件
ls -la /tmp/test-preprocess/converted/2026/04/

# 检查 frontmatter
cat /tmp/test-preprocess/converted/2026/04/*.md
```

验证点：
- [ ] archive 文件名规范化
- [ ] converted 文件名规范化
- [ ] `archived_file` 无 `../` 前缀
- [ ] `item_title` 规范化

- [ ] **Step 4: 清理测试文件**

```bash
rm -rf /tmp/test-preprocess
```

---

## Task 11: 更新版本号

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`

- [ ] **Step 1: 更新版本号**

修改 `plugin.json` 中的版本：

```json
{
  "version": "1.9.6",
  ...
}
```

- [ ] **Step 2: 提交**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json
git commit -m "chore(market-radar): bump version to 1.9.6"
```

---

## Task 12: 更新 CHANGELOG

**Files:**
- Modify: `plugins/market-radar/CHANGELOG.md`

- [ ] **Step 1: 添加 v1.9.6 更新日志**

在 `CHANGELOG.md` 开头添加：

```markdown
## [1.9.6] - 2026-04-09

### 修复

- **WikiLink 路径修复**：使用 `rootDir` 作为路径基准，消除 `../` 前缀
  - `archived_file` 路径现在在 Obsidian 中可正确跳转
  - cyber-pulse 文件的 `archived_file` 正确指向自身

- **文件名规范化**：archive 文件名应用 `normalizeFilename()`
  - 确保 archive 和 converted 文件名编码一致
  - `item_title` 字段同步规范化

- **去重机制优化**：移除冗余代码
  - hash 计算从 2 次/文件 减少到 1 次/文件
  - 去重检查统一在 `batchProcess()` 中处理
  - `knownHashes` 统一存储 converted 文件路径

### 技术改进

- 简化 `processFile()` 函数签名，移除未使用参数
- 重命名 `processCyberPulseFile()` 参数 `sourceDir` → `rootDir`
- 错误日志写入源文件所在目录（而非固定 sourceDir）
```

- [ ] **Step 2: 提交**

```bash
git add plugins/market-radar/CHANGELOG.md
git commit -m "docs(market-radar): update CHANGELOG for v1.9.6"
```

---

## 自检清单

完成所有任务后，检查以下项：

- [ ] TypeScript 编译通过：`pnpm exec tsc --noEmit`
- [ ] 手动测试验证：PDF 文件预处理 WikiLink 正确
- [ ] 手动测试验证：cyber-pulse 文件预处理 WikiLink 正确
- [ ] 版本号已更新
- [ ] CHANGELOG 已更新