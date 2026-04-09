# 本地文件预处理路径修复设计

**日期**: 2026-04-09
**版本**: 1.1
**状态**: 设计中

## 问题概述

market-radar 自 v1.9.3 开始修复本地文件预处理问题，但引入了新的 bug：

| 问题 | 描述 | 影响 |
|------|------|------|
| Archive 文件名未规范化 | `getArchivePath()` 未应用 `normalizeFilename()` | archive 与 converted 文件名编码不一致 |
| WikiLink 包含 `../` 前缀 | `path.relative(sourceDir, ...)` 产生相对路径 | Obsidian 无法跳转 |
| cyber-pulse 路径同样有问题 | `processCyberPulseFile()` 使用相同错误逻辑 | cyber-pulse 文件也受影响 |
| 去重机制冗余 | hash 计算两次，去重检查重复 | 性能浪费，代码冗余 |

### 根因分析

**路径基准错误**：

```
sourceDir = rootDir/inbox (默认)
archivePath = rootDir/archive/2026/04/...

path.relative(sourceDir, archivePath)
= path.relative(rootDir/inbox, rootDir/archive/2026/04/...)
= "../archive/2026/04/..."  ← 错误！
```

**正确做法**：

```
path.relative(rootDir, archivePath)
= path.relative(rootDir, rootDir/archive/2026/04/...)
= "archive/2026/04/..."  ← 正确！
```

---

## 设计目标

1. **统一输出**：本地文件和 cyber-pulse 文件产生相同结构的 converted 文件
2. **路径正确**：所有 WikiLink 路径以 `rootDir` 为基准，无 `../` 前缀
3. **文件名规范**：archive 和 converted 文件名都应用规范化
4. **向后兼容**：cyber-pulse 处理逻辑保持不变
5. **代码质量**：消除冗余代码，优化去重机制

---

## 去重机制问题分析

### 问题 1：重复计算 hash（性能问题）

**现状**：
```typescript
// batchProcess() 第 911 行
const sourceHash = calculateHash(sourcePath);

// processFile() 第 665 行
const sourceHash = calculateHash(sourcePath);  // ← 重复计算
```

**影响**：每个文件 hash 计算两次，浪费 I/O 和 CPU。

**修复方案**：移除 `processFile()` 内部的 hash 计算和去重检查，由 `batchProcess()` 统一处理。

---

### 问题 2：重复去重检查（代码冗余）

**现状**：
```typescript
// batchProcess() 第 914 行
if (!force && knownHashes.has(sourceHash)) { ... }

// processFile() 第 672 行
if (knownHashes.has(sourceHash)) { ... }  // ← 冗余检查
```

**影响**：逻辑冗余，维护困难。

**修复方案**：移除 `processFile()` 内部的去重检查。

---

### 问题 3：`knownHashes` 值类型不一致

**现状**：
| 来源 | 存储的值 |
|------|---------|
| `collectKnownHashes()` | converted 文件路径 (`mdPath`) |
| `batchProcess()` 更新 | archive 文件路径 (`result.archivedPath`) |

**影响**：数据语义不一致，可能导致混淆。

**修复方案**：统一存储 converted 文件路径。

---

### 问题 4：函数参数语义不清

**现状**：
- `processFile()` 的 `sourceDir` 参数实际应为 `rootDir`
- `processFile()` 的 `_currentVersion` 参数未使用

**修复方案**：重命名参数，移除未使用参数

---

## 设计方案

### 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `scripts/preprocess/index.ts` | 核心修改：函数签名、路径计算逻辑 |

---

### 详细修改

#### 1. `getArchivePath()` 增强

**位置**: `index.ts:364-367`

**修改前**：
```typescript
function getArchivePath(sourcePath: string, archiveDir: string): string {
  const filename = path.basename(sourcePath);
  return path.join(archiveDir, filename);
}
```

**修改后**：
```typescript
function getArchivePath(sourcePath: string, archiveDir: string): string {
  const rawFilename = path.basename(sourcePath);
  const filename = normalizeFilename(rawFilename);  // 应用规范化
  return path.join(archiveDir, filename);
}
```

---

#### 2. `processFile()` 重构

**位置**: `index.ts:655-838`

**修改前签名**：
```typescript
async function processFile(
  sourcePath: string,
  archiveDir: string,
  convertedDir: string,
  sourceDir: string,
  _currentVersion: string,
  knownHashes: Map<string, string>,
  _dateRef: Date
): Promise<PreprocessResult>
```

**修改后签名**：
```typescript
async function processFile(
  sourcePath: string,
  archiveDir: string,
  convertedDir: string,
  rootDir: string               // 改为 rootDir，移除未使用参数
): Promise<PreprocessResult>
```

**内部修改**：

| 行号 | 修改类型 | 修改前 | 修改后 |
|------|---------|--------|--------|
| 665-678 | 删除 | hash 计算和去重检查 | 由 batchProcess() 统一处理 |
| ~695 | 修改 | `writeErrorLog(sourcePath, sourceDir, ...)` | `writeErrorLog(sourcePath, path.dirname(sourcePath), ...)` |
| ~740 | 修改 | `path.relative(sourceDir, archivePath)` | `path.relative(rootDir, archivePath)` |

**说明**：
- 移除 `knownHashes` 参数，去重由 `batchProcess()` 统一处理
- 移除内部的 hash 计算和去重检查，避免重复
- 参数 `rootDir` 用于正确的路径计算

---

#### 3. `processCyberPulseFile()` 重构

**位置**: `index.ts:446-607`

**修改前签名**：
```typescript
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  sourceDir: string,
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult
```

**修改后签名**：
```typescript
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  rootDir: string,              // 改为 rootDir
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult
```

**内部修改**：

| 行号 | 修改前 | 修改后 |
|------|--------|--------|
| ~468, ~482, ~497, ~560, ~574 | `writeErrorLog(sourcePath, sourceDir, ...)` | `writeErrorLog(sourcePath, path.dirname(sourcePath), ...)` |
| ~492 | `path.relative(sourceDir, convertedPath)` | `path.relative(rootDir, convertedPath)` |

---

#### 4. `batchProcess()` 调用修改和去重优化

**位置**: `index.ts:889-950`

**修改要点**：
1. 调用时传递 `rootDir` 而非 `sourceDir`
2. 统一 `knownHashes` 值为 converted 文件路径
3. 移除 `processFile()` 参数中的 `knownHashes`

**修改前**：
```typescript
// cyber-pulse 文件
const result = processCyberPulseFile(
  sourcePath,
  convertedDir,
  sourceDir,  // ← 改为 rootDir
  knownFiles,
  dateRef
);

// 本地文件
const sourceHash = calculateHash(sourcePath);
if (!force && knownHashes.has(sourceHash)) { ... }  // 第一次检查

const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  sourceDir,              // ← 改为 rootDir
  preprocessorVersion,    // ← 移除此参数
  knownHashes,            // ← 移除此参数
  dateRef
);

if (result.success) {
  knownHashes.set(sourceHash, result.archivedPath || '');  // 存 archive 路径
}
```

**修改后**：
```typescript
// cyber-pulse 文件
const result = processCyberPulseFile(
  sourcePath,
  convertedDir,
  rootDir,    // ← 使用 rootDir
  knownFiles,
  dateRef
);

// 本地文件
const sourceHash = calculateHash(sourcePath);

if (!force && knownHashes.has(sourceHash)) {
  duplicates++;
  results.set(sourcePath, {
    success: true,
    isDuplicate: true,
    convertedPath: knownHashes.get(sourceHash),  // 返回 converted 路径
  });
  continue;
}

const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  rootDir      // ← 使用 rootDir，移除 knownHashes 参数
);

if (result.success && result.convertedPath) {
  knownHashes.set(sourceHash, result.convertedPath);  // 存 converted 路径
}
```

---

## 行为变化对照

| 场景 | 修改前 | 修改后 |
|------|--------|--------|
| archive 文件名 | 保留原始 Unicode（如 `报告：2024.pdf`） | 规范化为 ASCII（如 `报告:2024.pdf`） |
| `archived_file` 路径 | `[[../archive/2026/04/report.pdf\|report.pdf]]` | `[[archive/2026/04/report.pdf\|report.pdf]]` |
| cyber-pulse `archived_file` | `[[../converted/2026/04/item_xxx.md\|item_xxx.md]]` | `[[converted/2026/04/item_xxx.md\|item_xxx.md]]` |
| 错误日志位置 | `sourceDir/`（通常是 `rootDir/inbox`） | `path.dirname(sourcePath)/`（源文件所在目录） |
| hash 计算次数 | 2 次/文件 | 1 次/文件 |
| 去重检查位置 | batchProcess() + processFile() | 仅 batchProcess() |
| `knownHashes` 值 | 混合（archive/converted 路径） | 统一为 converted 路径 |

---

## 测试验证

### 测试用例 1：本地 PDF 文件预处理

1. 放置包含 Unicode 字符的 PDF 文件到 `inbox/`（如 `Buyers' Guide.pdf`）
2. 执行 `pnpm run preprocess`
3. 验证：
   - archive 文件名规范化为 `Buyers' Guide.pdf`
   - converted 文件名为 `Buyers' Guide.md`
   - frontmatter 中 `archived_file` 为 `[[archive/2026/04/Buyers' Guide.pdf|Buyers' Guide.pdf]]`
   - 在 Obsidian 中点击链接可跳转到 archive 文件

### 测试用例 2：cyber-pulse 文件预处理

1. 使用 `/intel-pull` 拉取文件
2. 执行 `pnpm run preprocess`
3. 验证：
   - `archived_file` 为 `[[converted/2026/04/item_xxx.md|item_xxx.md]]`
   - 在 Obsidian 中点击链接可跳转到自身

### 测试用例 3：自定义 sourceDir

1. 执行 `pnpm run preprocess -- --source /custom/path`
2. 验证：
   - 转换文件正常生成
   - 错误日志（如有）写在 `/custom/path/`
   - WikiLink 路径仍以 `rootDir` 为基准

---

## 影响范围

### 不受影响的部分

| 组件 | 原因 |
|------|------|
| `scanDirectory()` | 扫描逻辑不变 |
| `collectKnownHashes()` | 去重逻辑不变 |
| `collectKnownFiles()` | cyber-pulse 去重逻辑不变 |
| `convert.ts` | 转换逻辑不变 |
| `clean.ts` | 清理逻辑不变 |
| `scan-queue.ts` | 已有 WikiLink 解析逻辑 |

### 受影响的部分

| 组件 | 影响 |
|------|------|
| `processFile()` | 参数签名和内部逻辑 |
| `processCyberPulseFile()` | 参数签名和内部逻辑 |
| `batchProcess()` | 调用方式 |
| 已有的 converted 文件 | frontmatter 中 WikiLink 可能需要更新（可选） |

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 修改引入新 bug | 中 | 高 | 编写完整测试用例 |
| 与现有数据不兼容 | 低 | 中 | WikiLink 格式向后兼容 |
| 性能影响 | 无 | - | 不涉及性能相关代码 |

---

## Issue #104 问题分析

根据 [Issue #104](https://github.com/cyberstrat-forge/cyber-nexus/issues/104) 反馈的问题，逐一分析在新设计方案中的状态：

### 问题 1：scan-queue.ts 优先级逻辑 Bug

**状态**：✅ 已修复（不在本次设计范围）

**说明**：此问题已在之前的提交中修复，本次设计不涉及 `scan-queue.ts` 的去重逻辑。

---

### 问题 2：converted_content_hash 存储错误哈希值

**状态**：⚠️ 需要数据修复（代码已正确）

**分析**：
- 预处理脚本已正确生成 `content_hash`
- 问题出在已有情报卡片中存储的是 `source_hash` 而非 `content_hash`
- 新设计不改变 hash 计算逻辑，只改变路径计算

**结论**：代码层面已正确，数据修复需单独处理。

---

### 问题 3：WikiLink `../` 前缀问题

**状态**：✅ 本次设计已修复

**分析**：
| 问题点 | 当前代码 | 新设计 |
|--------|---------|--------|
| 路径基准 | `path.relative(sourceDir, ...)` | `path.relative(rootDir, ...)` |
| 结果 | `../archive/2026/04/...` | `archive/2026/04/...` |

**结论**：新设计彻底解决此问题。

---

### 问题 4：相关情报链接格式不规范

**状态**：❌ 不在本次设计范围

**说明**：此问题涉及 Agent 生成的情报卡片内容，不属于预处理脚本范围。

---

### 问题 5：文件名编码不一致

**状态**：✅ 本次设计已修复

**分析**：
| 文件类型 | 当前行为 | 新设计 |
|----------|---------|--------|
| archive 文件 | 未规范化 | 应用 `normalizeFilename()` |
| converted 文件 | 已规范化 | 保持不变 |

**结论**：新设计确保 archive 和 converted 文件名编码一致。

---

### 问题 6：cyber-pulse 文件 archived_file 指向错误

**状态**：✅ 本次设计已修复

**分析**：
- 当前：`archived_file` 路径包含 `../` 前缀
- 新设计：使用 `rootDir` 计算，路径正确指向 `converted/` 目录

**结论**：新设计确保 cyber-pulse 文件的 `archived_file` 正确指向自身。

---

### 问题 7：fix-content-hash.ts 路径匹配失败

**状态**：✅ 本次设计已修复（根本原因已解决）

**分析**：
- 根本原因是 WikiLink `../` 前缀和文件名编码不一致
- 新设计解决了这两个根本问题后，路径匹配将正常工作

**结论**：根本问题解决后，此问题自然消失。

---

### Issue #104 问题汇总

| 问题 | 状态 | 说明 |
|------|------|------|
| 1. scan-queue.ts 优先级逻辑 | ✅ 已修复 | 不在本次范围 |
| 2. converted_content_hash 错误 | ⚠️ 需数据修复 | 代码已正确 |
| 3. WikiLink `../` 前缀 | ✅ 本次修复 | 路径基准修正 |
| 4. 相关情报链接格式 | ❌ 不在范围 | Agent 生成内容 |
| 5. 文件名编码不一致 | ✅ 本次修复 | archive 文件名规范化 |
| 6. cyber-pulse archived_file | ✅ 本次修复 | 路径基准修正 |
| 7. fix-content-hash.ts 路径 | ✅ 本次修复 | 根本原因已解决 |

---

## 参考资料

- [Issue #104: Market Radar v1.9.5 问题清单](https://github.com/cyberstrat-forge/cyber-nexus/issues/104)
- [转换文件 Frontmatter 统一设计](./2026-04-08-converted-frontmatter-design.md)
- [v1.9.3 提交 968ada7](https://github.com/cyberstrat-forge/cyber-nexus/commit/968ada7)
- [v1.9.4 提交 a368579](https://github.com/cyberstrat-forge/cyber-nexus/commit/a368579)