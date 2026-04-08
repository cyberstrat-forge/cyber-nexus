# 修复 preprocess 脚本问题

**日期**: 2026-04-08
**版本**: 1.1

## 问题概述

| 问题 | 描述 | 影响 |
|------|------|------|
| 嵌套 inbox 目录（writeErrorLog） | `writeErrorLog` 错误地在 `sourceDir` 下创建 `inbox/` 子目录 | 错误日志写入错误位置 |
| 嵌套 inbox 目录（scanDirectory） | `scanDirectory` 错误地扫描 `sourceDir/inbox/` 子目录 | 可能扫描错误位置的文件 |
| PDF 转换失败 | 未安装 PDF 转换工具，且不符合 uv 规范 | PDF 文件无法处理 |
| cyber-pulse 文件失败无错误日志 | `processCyberPulseFile` 失败时未生成错误日志 | 用户无法定位失败原因 |

---

## 问题 1：writeErrorLog 嵌套 inbox 目录

### 根因分析

**文件**: `scripts/preprocess/index.ts`
**位置**: 第 249 行

```typescript
function writeErrorLog(
  sourcePath: string,
  sourceDir: string,
  errorCode: string,
  errorMessage: string
): string {
  const inboxDir = path.join(sourceDir, 'inbox');  // ← 错误：在 sourceDir 下又创建 inbox
  const filename = path.basename(sourcePath);
  const errorLogPath = path.join(inboxDir, `${filename}.error.md`);
  // ...
}
```

脚本早期设计假设 `sourceDir` 是项目根目录，后续改为直接指定源目录，但 `writeErrorLog` 未同步更新。

### 解决方案

**文件**: `scripts/preprocess/index.ts`

**修改 1**: 第 249 行（移除嵌套 inbox）

```typescript
// 修改前
const inboxDir = path.join(sourceDir, 'inbox');
const filename = path.basename(sourcePath);
const errorLogPath = path.join(inboxDir, `${filename}.error.md`);

// 修改后
const filename = path.basename(sourcePath);
const errorLogPath = path.join(sourceDir, `${filename}.error.md`);
```

**修改 2**: 第 257-260 行（移除目录创建逻辑）

```typescript
// 删除以下代码
if (!fs.existsSync(inboxDir)) {
  fs.mkdirSync(inboxDir, { recursive: true });
}
```

### 行为变更

| 场景 | 源文件 | 修改前 | 修改后 |
|------|--------|--------|--------|
| 顶层文件 | `inbox/report.pdf` | `inbox/inbox/report.pdf.error.md` ❌ | `inbox/report.pdf.error.md` ✅ |
| 子目录文件 | `inbox/docs/report.pdf` | `inbox/docs/inbox/report.pdf.error.md` ❌ | `inbox/docs/report.pdf.error.md` ✅ |

---

## 问题 1.5：scanDirectory 嵌套 inbox 扫描

### 根因分析

**文件**: `scripts/preprocess/index.ts`
**位置**: 第 528-543 行

```typescript
// Priority 1: Scan inbox/ directory
const inboxDir = path.join(sourceDir, 'inbox');  // ← 错误：在 sourceDir 下又扫描 inbox
if (fs.existsSync(inboxDir)) {
  // ... 扫描 inboxDir
}
```

**调用场景**：

| 调用方式 | sourceDir 值 | 扫描位置 | 正确行为 |
|----------|-------------|----------|----------|
| `--source ./inbox --root .` | `/path/to/inbox` | `/path/to/inbox/inbox/` ❌ | 直接扫描 `/path/to/inbox/` |

### 解决方案

移除嵌套 inbox 扫描逻辑，直接扫描 sourceDir：

**文件**: `scripts/preprocess/index.ts`

```typescript
// 修改前（第 528-546 行）
// Priority 1: Scan inbox/ directory
const inboxDir = path.join(sourceDir, 'inbox');
if (fs.existsSync(inboxDir)) {
  try {
    const inboxEntries = fs.readdirSync(inboxDir, { withFileTypes: true });
    for (const entry of inboxEntries) {
      const fullPath = path.join(inboxDir, entry.name);
      if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Cannot read inbox directory ${inboxDir}: ${errMsg}`);
  }
}

// Priority 2: Scan root directory (for backward compatibility)
scan(sourceDir, true);

// 修改后
// Scan source directory directly
scan(sourceDir, true);
```

### 简化后的 scanDirectory 函数

```typescript
function scanDirectory(sourceDir: string): string[] {
  const files: string[] = [];
  const excludeDirs = new Set(['inbox', 'archive', 'converted', 'intelligence', '.intel']);

  function scan(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read directory ${dir}: ${errMsg}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden directories and special directories
      if (entry.name.startsWith('.') || excludeDirs.has(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Scan source directory directly
  scan(sourceDir);

  return files;
}
```

---

## 问题 2：PDF 转换工具不符合 uv 规范

### 根因分析

**文件**: `scripts/preprocess/convert.ts`
**位置**: 第 100-126 行

```typescript
async function convertPdfWithPyMuPdf(filePath: string): Promise<string> {
  // ...
  const result = execFileSync(
    'python3',  // ← 直接调用 python3，未安装 PyMuPDF
    ['-c', script, filePath],
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
  );
  return result;
}
```

当前脚本直接调用 `python3`，但未安装 PyMuPDF。

**考量**：
- 脚本位于插件缓存目录，不适合放置 `pyproject.toml`（插件更新会覆盖）
- 用户规范要求使用 `uv` 管理 Python 依赖
- `uv run --with <pkg>` 是处理临时脚本依赖的推荐方式

### 解决方案

修改 `convert.ts` 使用 `uv run --with PyMuPDF`：

**文件**: `scripts/preprocess/convert.ts`

**修改 1**: `isPyMuPdfAvailable` 函数（第 50-62 行）

```typescript
// 修改前
export function isPyMuPdfAvailable(): boolean {
  try {
    const result = spawnSync('python3', ['-c', 'import fitz; print(fitz.__version__)'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return result.status === 0;
  } catch (error) {
    console.warn('PyMuPDF check failed:', error);
    return false;
  }
}

// 修改后
export function isPyMuPdfAvailable(): boolean {
  try {
    const result = spawnSync('uv', ['run', '--with', 'PyMuPDF', 'python3', '-c', 'import fitz; print(fitz.__version__)'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return result.status === 0;
  } catch (error) {
    console.warn('PyMuPDF check failed:', error);
    return false;
  }
}
```

**修改 2**: `convertPdfWithPyMuPdf` 函数（第 100-126 行）

```typescript
// 修改前
const result = execFileSync(
  'python3',
  ['-c', script, filePath],
  { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
);

// 修改后
const result = execFileSync(
  'uv',
  ['run', '--with', 'PyMuPDF', 'python3', '-c', script, filePath],
  { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
);
```

### 前置条件

用户需安装 `uv`（已安装）。无需额外配置文件或依赖安装步骤。

### 行为变更

**修改前**：
- 检测 PDF 转换器失败，提示用户手动安装
- PDF 文件无法处理

**修改后**：
- `uv run --with PyMuPDF` 自动处理依赖
- PDF 文件可正常转换，无需用户手动安装

**注意**：首次运行时 `uv` 会下载 PyMuPDF，有短暂延迟。后续运行会使用缓存。

---

## 问题 3：cyber-pulse 文件失败无错误日志

### 根因分析

**文件**: `scripts/preprocess/index.ts`
**位置**: 第 374-488 行（`processCyberPulseFile` 函数）

当前 `processCyberPulseFile` 函数在多个失败点只返回 error 对象，但不生成错误日志文件：

```typescript
function processCyberPulseFile(sourcePath, convertedDir, _sourceDir, knownFiles, _dateRef) {
  // ...
  
  // 验证失败 - 无错误日志
  const validationError = validateCyberPulseFile(sourcePath);
  if (validationError) {
    return { success: false, error: { code: 'INVALID_PULSE_FORMAT', message: validationError } };
  }
  
  // 读取失败 - 无错误日志
  try {
    content = fs.readFileSync(sourcePath, 'utf-8');
  } catch (error) {
    return { success: false, error: { code: 'READ_FAILED', message } };
  }
  
  // frontmatter 解析失败 - 无错误日志
  if (!frontmatter) {
    return { success: false, error: { code: 'INVALID_PULSE_FORMAT', message: 'Missing frontmatter' } };
  }
  
  // 写入失败 - 无错误日志
  try {
    fs.writeFileSync(convertedPath, newContent, 'utf-8');
  } catch (error) {
    return { success: false, error: { code: 'WRITE_FAILED', message } };
  }
}
```

**影响**：用户无法在源文件目录中看到失败原因，难以排查问题。

### 解决方案

在 `processCyberPulseFile` 函数中引入 `sourceDir` 参数，失败时调用 `writeErrorLog`。

**文件**: `scripts/preprocess/index.ts`

**修改 1**: 函数签名（第 374 行）

```typescript
// 修改前
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  _sourceDir: string,  // ← 未使用
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult

// 修改后
function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  sourceDir: string,  // ← 用于错误日志路径
  knownFiles: Set<string>,
  _dateRef: Date
): PreprocessResult
```

**修改 2**: 验证失败时写入错误日志（第 393-399 行）

```typescript
// 修改前
const validationError = validateCyberPulseFile(sourcePath);
if (validationError) {
  return {
    success: false,
    error: { code: 'INVALID_PULSE_FORMAT', message: validationError },
  };
}

// 修改后
const validationError = validateCyberPulseFile(sourcePath);
if (validationError) {
  const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'INVALID_PULSE_FORMAT', validationError);
  return {
    success: false,
    error: { code: 'INVALID_PULSE_FORMAT', message: validationError },
    errorLogPath,
  };
}
```

**修改 3**: 读取失败时写入错误日志（第 401-411 行）

```typescript
// 修改前
try {
  content = fs.readFileSync(sourcePath, 'utf-8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: { code: 'READ_FAILED', message },
  };
}

// 修改后
try {
  content = fs.readFileSync(sourcePath, 'utf-8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'READ_FAILED', message);
  return {
    success: false,
    error: { code: 'READ_FAILED', message },
    errorLogPath,
  };
}
```

**修改 4**: frontmatter 解析失败时写入错误日志（第 414-420 行）

```typescript
// 修改前
if (!frontmatter) {
  return {
    success: false,
    error: { code: 'INVALID_PULSE_FORMAT', message: 'Missing frontmatter' },
  };
}

// 修改后
if (!frontmatter) {
  const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'INVALID_PULSE_FORMAT', 'Missing frontmatter');
  return {
    success: false,
    error: { code: 'INVALID_PULSE_FORMAT', message: 'Missing frontmatter' },
    errorLogPath,
  };
}
```

**修改 5**: 写入失败时写入错误日志（第 452-460 行）

```typescript
// 修改前
try {
  fs.writeFileSync(convertedPath, newContent, 'utf-8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: { code: 'WRITE_FAILED', message: `Failed to write converted file: ${message}` },
  };
}

// 修改后
try {
  fs.writeFileSync(convertedPath, newContent, 'utf-8');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const errorMsg = `Failed to write converted file: ${message}`;
  const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'WRITE_FAILED', errorMsg);
  return {
    success: false,
    error: { code: 'WRITE_FAILED', message: errorMsg },
    errorLogPath,
  };
}
```

**修改 6**: 更新错误日志模板（`generateErrorLog` 函数）

在 `generateErrorLog` 函数的建议操作中添加 `INVALID_PULSE_FORMAT` 的处理，并更新 `DEPENDENCY_MISSING`：

```typescript
const suggestionMap: Record<string, string[]> = {
  // ... 现有条目 ...
  DEPENDENCY_MISSING: [
    '确保 uv 已安装并可用',
    'PDF 转换将自动通过 uv run --with PyMuPDF 处理',
    'DOCX 转换需要 pandoc: brew install pandoc',
  ],
  INVALID_PULSE_FORMAT: [
    '检查文件是否为有效的 cyber-pulse 输出文件',
    '确认 frontmatter 包含必需字段: item_id, source_type, first_seen_at, title',
    '重新运行 intel-pull 命令获取正确格式',
  ],
};
```

**注意**：使用 `uv run --with PyMuPDF` 后，PDF 相关的依赖缺失错误将不再触发。此建议主要针对 DOCX 文件（需要 pandoc）。

---

## 清理操作

修复后需清理错误创建的目录：

```bash
rm -rf /Users/luoweirong/cyberstrat-forge/cyber-insights/inbox/inbox/
```

---

## 测试验证

### 测试 1：错误日志位置

1. 确保 PDF 转换工具可用（uv 已安装）
2. 创建测试 PDF 文件在 `inbox/`
3. 执行预处理，触发转换失败
4. 验证错误日志写入 `inbox/*.error.md`（非 `inbox/inbox/`）

### 测试 2：PDF 转换

1. 确保 `uv` 已安装
2. 放置 PDF 文件到 `inbox/`
3. 执行预处理
4. 验证 PDF 正确转换到 `converted/YYYY/MM/`

### 测试 3：扫描目录正确性

1. 清理 `inbox/inbox/` 目录
2. 放置 PDF 文件到 `inbox/`
3. 执行预处理
4. 验证只扫描 `inbox/` 中的文件，不会扫描 `inbox/inbox/`

### 测试 4：cyber-pulse 文件错误日志

1. 创建格式错误的 cyber-pulse 文件（缺少必需字段）
2. 放置到 `inbox/`
3. 执行预处理
4. 验证错误日志写入 `inbox/*.error.md`，内容包含失败原因

---

## 影响范围

| 修改 | 影响 |
|------|------|
| writeErrorLog 修复 | 错误日志位置修正 |
| scanDirectory 修复 | 扫描目录逻辑简化，避免嵌套 |
| PDF 转换使用 `uv run --with PyMuPDF` | 符合用户规范，PDF 可正常处理 |
| processCyberPulseFile 错误日志 | cyber-pulse 文件失败时可追溯 |