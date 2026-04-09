# 本地文件预处理路径修复设计

**日期**: 2026-04-09
**版本**: 1.0
**状态**: 设计中

## 问题概述

market-radar 自 v1.9.3 开始修复本地文件预处理问题，但引入了新的 bug：

| 问题 | 描述 | 影响 |
|------|------|------|
| Archive 文件名未规范化 | `getArchivePath()` 未应用 `normalizeFilename()` | archive 与 converted 文件名编码不一致 |
| WikiLink 包含 `../` 前缀 | `path.relative(sourceDir, ...)` 产生相对路径 | Obsidian 无法跳转 |
| cyber-pulse 路径同样有问题 | `processCyberPulseFile()` 使用相同错误逻辑 | cyber-pulse 文件也受影响 |

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
  rootDir: string,              // 改为 rootDir
  knownHashes: Map<string, string>,
  _dateRef: Date
): Promise<PreprocessResult>
```

**内部修改**：

| 行号 | 修改前 | 修改后 |
|------|--------|--------|
| ~695 | `writeErrorLog(sourcePath, sourceDir, ...)` | `writeErrorLog(sourcePath, path.dirname(sourcePath), ...)` |
| ~740 | `path.relative(sourceDir, archivePath)` | `path.relative(rootDir, archivePath)` |

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

#### 4. `batchProcess()` 调用修改

**位置**: `index.ts:889-895, 925-933`

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
const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  sourceDir,              // ← 改为 rootDir
  preprocessorVersion,    // ← 移除此参数
  knownHashes,
  dateRef
);
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
const result = await processFile(
  sourcePath,
  archiveDir,
  convertedDir,
  rootDir,      // ← 使用 rootDir
  knownHashes,
  dateRef
);
```

---

## 行为变化对照

| 场景 | 修改前 | 修改后 |
|------|--------|--------|
| archive 文件名 | 保留原始 Unicode（如 `报告：2024.pdf`） | 规范化为 ASCII（如 `报告:2024.pdf`） |
| `archived_file` 路径 | `[[../archive/2026/04/report.pdf\|report.pdf]]` | `[[archive/2026/04/report.pdf\|report.pdf]]` |
| cyber-pulse `archived_file` | `[[../converted/2026/04/item_xxx.md\|item_xxx.md]]` | `[[converted/2026/04/item_xxx.md\|item_xxx.md]]` |
| 错误日志位置 | `sourceDir/`（通常是 `rootDir/inbox`） | `path.dirname(sourcePath)/`（源文件所在目录） |

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

## 参考资料

- [Issue #104: Market Radar v1.9.5 问题清单](https://github.com/cyberstrat-forge/cyber-nexus/issues/104)
- [转换文件 Frontmatter 统一设计](./2026-04-08-converted-frontmatter-design.md)
- [v1.9.3 提交 968ada7](https://github.com/cyberstrat-forge/cyber-nexus/commit/968ada7)
- [v1.9.4 提交 a368579](https://github.com/cyberstrat-forge/cyber-nexus/commit/a368579)