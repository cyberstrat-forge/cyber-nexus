# 转换文件 Frontmatter 统一设计

**日期**: 2026-04-08
**版本**: 1.0

## 问题概述

PR #97 修复预处理功能后，发现转换文件的 frontmatter 存在问题：

| 问题 | 描述 | 影响 |
|------|------|------|
| 字段缺失 | 本地文件缺少 item_id、item_title 等字段 | Agent 无法继承元数据 |
| 链接格式错误 | archivedSource 使用普通路径，非 WikiLink | Obsidian 中不可跳转 |
| 结构不一致 | 本地文件与 cyber-pulse 文件结构不同 | 代码逻辑复杂 |

---

## 设计目标

1. **统一结构**：本地文件和 cyber-pulse 文件使用相同字段集
2. **符合 Obsidian 规范**：链接使用 WikiLink 格式，标签符合嵌套规范
3. **字段可选**：本地文件缺少的属性使用 `null` 表示

---

## Obsidian 格式规范

### Tags 格式

来源：[Obsidian 标签文档](https://obsidian.md/zh/help/tags)

| 规则 | 说明 |
|------|------|
| 允许字符 | 字母、数字、`_`、`-`、`/` |
| 必须包含 | 至少一个非数字字符 |
| 禁止 | 空格、特殊符号 |
| 嵌套 | 使用 `/` 分隔：`#geo/china` |

**YAML 格式**：
```yaml
tags: ["geo/china", "APT", "ransomware"]
```

### Links 格式

来源：[Obsidian 内部链接文档](https://obsidian.md/zh/help/links)

| 类型 | 格式 | 示例 |
|------|------|------|
| 基本链接 | `[[文件名]]` | `[[report.pdf]]` |
| 带路径 | `[[路径/文件名]]` | `[[archive/2026/04/report.pdf]]` |
| 带显示文本 | `[[文件名\|显示文本]]` | `[[report.pdf\|报告]]` |
| 非 Markdown 文件 | 必须包含扩展名 | `[[Figure 1.png]]` |

**无效字符**：`# | ^ : %% [[ ]]`

---

## 统一 Frontmatter 结构

### 字段定义

```yaml
---
# ============================================
# 第一组：item 来源追溯
# ============================================
item_id: string              # 必填，格式：item_{hash前8位}
item_title: string           # 必填，文档标题或文件名
author: string | null        # 可选，作者
original_url: string | null  # 可选，原文链接
published_at: string | null  # 可选，ISO 8601 格式
fetched_at: string           # 必填，采集/处理时间
completeness_score: number | null  # 可选，0-1

# ============================================
# 第二组：情报源追溯
# ============================================
source_id: string | null     # 可选，情报源 ID
source_name: string | null   # 可选，情报源名称
source_url: string | null    # 可选，情报源 URL
source_tier: string | null   # 可选，T0-T3
source_score: number | null  # 可选，0-100

# ============================================
# 第三组：文件追溯（预处理生成）
# ============================================
archived_file: string        # 必填，WikiLink 格式
content_hash: string         # 必填，body MD5
source_hash: string          # 必填，源文件 MD5（用于去重）
archived_at: string          # 必填，归档时间

# ============================================
# 第四组：处理状态
# ============================================
processed_status: "pending" | "passed" | "rejected"
processed_at: string | null  # 处理完成时间
---
```

### 空值处理

| 字段类型 | 空值表示 | 示例 |
|---------|---------|------|
| 字符串 | `null` | `author: null` |
| 数字 | 省略或 `null` | `completeness_score: null` |
| 列表 | `[]` | `secondary_domains: []` |

**Why**: `null` 明确表示"本地文件无此信息"，与字段缺失含义不同。用户在 Obsidian 中可直观看到哪些属性为空。

---

## 两种文件的实际输出

### 本地文件（用户放入 inbox）

```yaml
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
archived_at: "2026-04-08T10:00:00Z"

processed_status: "pending"
processed_at: null
---
```

### cyber-pulse 文件（API 采集）

```yaml
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

archived_file: "[[converted/2026/04/item_a1b2c3d4.md]]"  # 指向自身，非 archive
content_hash: "def456abc123..."
source_hash: "abc789def456..."  # 原始采集文件内容的 hash
archived_at: "2026-04-01T10:30:00Z"

processed_status: "pending"
processed_at: null

# 保留原始字段
source_type: "cyber-pulse"
first_seen_at: "2026-04-01T10:30:00Z"
tags: ["APT", "ransomware"]
---
```

---

## Hash 字段分析

### 三种 Hash 对比

| Hash | 生成位置 | 存储位置 | 用途 |
|------|---------|---------|------|
| `source_hash` | 预处理 | 转换文件 | 源文件去重（避免重复处理相同内容） |
| `content_hash` | 预处理 | 转换文件 | 变更检测（核心机制） |
| `converted_content_hash` | Agent | 情报卡片 | 关联转换文件 |

### 保留 source_hash 的原因

**source_hash 用途**：防止"相同内容不同文件名"的重复处理。

**去重机制**：
```typescript
// 预处理扫描阶段：收集已知 source_hash
const knownHashes = new Map<string, string>();  // source_hash → archived_path
for (const mdPath of existingConvertedFiles) {
  if (frontmatter?.source_hash) {
    knownHashes.set(frontmatter.source_hash, archivedPath);
  }
}

// 处理阶段：检查是否已处理过
const sourceHash = calculateHash(sourcePath);
if (knownHashes.has(sourceHash)) {
  // 已处理过相同内容的文件，跳过
  return { success: true, isDuplicate: true };
}
```

**场景分析**：

| 场景 | source_hash 能检测？ | 实际频率 |
|------|---------------------|---------|
| 同内容不同文件名 | ✅ 能检测 | 中等（转发/复制场景） |
| 同文件名不同内容 | ❌ 不能（归档路径覆盖） | 低 |
| 文件归档后再放入 | ❌ 不能（已处理） | 低 |

**结论**：保留 `source_hash`，去重机制稳定且改动成本低。

### 保留 content_hash 的原因

**变更检测流程**：

```typescript
// scan-queue.ts
const recordedHash = convertedToHash.get(relativePath);  // 情报卡片的 hash
const contentHash = calculateBodyHash(file);             // 转换文件实时 hash

if (recordedHash && recordedHash === contentHash) {
  // 内容未变 → 跳过
} else {
  // 内容变化或无卡片 → 需要处理
}
```

**这是核心机制**：决定是否需要重新生成情报卡片。

---

## 字段命名规范

### WikiLink 字段

| 旧名称 | 新名称 | 格式变化 |
|--------|--------|---------|
| `archivedSource` | `archived_file` | `"archive/..."` → `"[[archive/...]]"` |

### Hash 字段命名

| 字段 | 说明 |
|------|------|
| `source_hash` | 源文件内容哈希（原名 `sourceHash`，改为 snake_case 统一风格） |
| `content_hash` | 转换后 body 内容哈希（保持不变） |

### 命名一致性

与情报卡片字段名保持一致：
- `archived_file` → 情报卡片也使用 `archived_file`
- `content_hash` → 转换文件独有，用于变更检测
- `source_hash` → 转换文件独有，用于去重
- `converted_content_hash` → 情报卡片独有，记录来源

---

## 现有代码格式规范检查

### Tags 格式 ✅ 符合 Obsidian 规范

所有文件中的 tags 都符合规范：
- 嵌套格式：`geo/china`, `business/MSSP`
- 连字符：`cloud-security`, `ai-security`
- 无空格

**示例**（来自 `templates.md`）：
```yaml
tags: ["geo/china", "business/MSSP", "APT", "ransomware"]
```

### WikiLink 格式 ⚠️ 发现不一致

| 文件 | 当前字段 | 格式 | 状态 |
|------|---------|------|------|
| `intelligence-analyzer.md` | `archived_file` | `"[[archive/...]]"` | ✅ 正确 |
| `templates.md` | `archived_file` | `"[[archive/...]]"` | ✅ 正确 |
| `intel-distill.md` | `archivedSource` | `"archive/..."` | ❌ 需修改 |
| `scan-queue.ts` | `archived_source` | 普通字符串 | ❌ 需修改 |
| `preprocess/index.ts` | `archivedSource` | 普通字符串 | ❌ 需修改 |
| `intel-pull-guide.md` | `archivedSource` | 空字符串 | ❌ 需修改 |

---

## 修改文件清单

### 脚本文件

| 文件 | 当前字段 | 修改为 | 修改内容 |
|------|---------|--------|---------|
| `scripts/preprocess/index.ts` | `archivedSource`, `sourceHash`, `originalPath` | `archived_file`, `source_hash`, 移除 `originalPath` | 重构 `generateFrontmatter()` 函数，统一字段结构 |
| `scripts/preprocess/scan-queue.ts` | `archived_source`, `source_hash` | `archived_file`, 保留 `source_hash` | 更新 `QueueItem` 接口和读取逻辑 |

### 命令文档

| 文件 | 修改内容 |
|------|---------|
| `commands/intel-distill.md` | 更新转换文件 frontmatter 文档，字段名和格式 |
| `commands/references/intel-pull-guide.md` | 更新 frontmatter 示例（严重过时，需全面修正） |

### 已正确文件（无需修改）

| 文件 | 说明 |
|------|------|
| `agents/intelligence-analyzer.md` | 已使用 `archived_file` 和 WikiLink 格式 |
| `skills/intelligence-output-templates/references/templates.md` | 已使用正确格式 |
| `scripts/pulse/output.ts` | **不修改**，字段映射在 preprocess 中处理 |

---

## cyber-pulse 文件特殊处理

### 识别机制

cyber-pulse 文件通过 `source_type: 'cyber-pulse'` 字段识别：

```typescript
// scripts/preprocess/index.ts
function isCyberPulseFile(filePath: string): boolean {
  const frontmatter = parseFrontmatter(content);
  return frontmatter?.source_type === 'cyber-pulse';
}
```

**必需字段**：`['item_id', 'source_type', 'first_seen_at', 'title']`

### 与本地文件的关键差异

| 差异点 | 本地文件 | cyber-pulse 文件 |
|--------|---------|-----------------|
| 归档 | 源文件移动到 `archive/YYYY/MM/` | 不归档，源文件直接删除 |
| archived_file | 指向 `archive/` 目录 | 指向 `converted/` 目录（自身） |
| source_type | 无（本地文件） | `cyber-pulse`（保留，用于识别） |
| 元数据来源 | 预处理生成 | 继承自采集阶段 |

### 设计影响评估

#### ✅ 不会影响识别

| 检查项 | 评估 |
|--------|------|
| `source_type` 字段 | ✅ 保留，识别逻辑不变 |
| `item_id` 字段 | ✅ 已存在，继承即可 |
| `first_seen_at` 字段 | ✅ 已存在，可映射为 `fetched_at` |

#### ⚠️ 需要修改的字段

| 字段 | 当前状态 | 设计修改 |
|------|---------|---------|
| `archived_path` | 空字符串 `""` | 改为 `archived_file: "[[converted/...]]"` |
| `content_hash` | 空字符串 `""` | 已实现：填充 body MD5 |
| `processed_status` | 不存在 | 添加，初始值 `"pending"` |
| `processed_at` | 不存在 | 添加，初始值 `null` |

### intel-pull 输出的 frontmatter（当前）

```yaml
---
item_id: "item_a1b2c3d4"
source_type: "cyber-pulse"
first_seen_at: "2026-04-01T10:00:00Z"
title: "Lazarus Group's New Malware"
author: "Security Team"
url: "https://..."
published_at: "2026-04-01T08:00:00Z"
tags: ["APT", "ransomware"]
source_id: "src_securityweekly"
source_name: "Security Weekly"
source_tier: "T1"
source_score: 85
completeness_score: 0.92
content_hash: ""      # 预处理填充
archived_path: ""     # 预处理填充
---
```

### 预处理后的 frontmatter（设计方案）

```yaml
---
# 第一组：item 来源追溯（继承自 intel-pull）
item_id: "item_a1b2c3d4"
item_title: "Lazarus Group's New Malware"  # 从 title 映射
author: "Security Team"
original_url: "https://..."                 # 从 url 映射
published_at: "2026-04-01T08:00:00Z"
fetched_at: "2026-04-01T10:00:00Z"          # 从 first_seen_at 映射
completeness_score: 0.92

# 第二组：情报源追溯（继承自 intel-pull）
source_id: "src_securityweekly"
source_name: "Security Weekly"
source_url: "https://securityweekly.com"
source_tier: "T1"
source_score: 85

# 第三组：文件追溯（预处理生成）
archived_file: "[[converted/2026/04/item_a1b2c3d4.md]]"  # 指向自身
content_hash: "def456abc123..."
archived_at: "2026-04-01T10:00:00Z"

# 第四组：处理状态（预处理添加）
processed_status: "pending"
processed_at: null

# 保留字段（用于识别和追溯）
source_type: "cyber-pulse"    # 保留，识别标识
first_seen_at: "2026-04-01T10:00:00Z"  # 保留，原始采集时间
tags: ["APT", "ransomware"]   # 保留，采集阶段标签
---
```

### 字段映射表

| intel-pull 输出 | 转换文件字段 | 映射说明 |
|----------------|-------------|---------|
| `title` | `item_title` | 字段名统一 |
| `url` | `original_url` | 字段名统一 |
| `first_seen_at` | `fetched_at` | 字段名统一（同时保留原字段） |
| `archived_path` | `archived_file` | 改为 WikiLink 格式 |

**映射位置**：`processCyberPulseFile()` 函数中处理，保持 intel-pull 输出格式不变。

---

## intel-pull 输出脚本评估

### 当前状态

`scripts/pulse/output.ts` 生成的 frontmatter：

```yaml
---
item_id: "item_a1b2c3d4"
source_type: "cyber-pulse"
first_seen_at: "2026-04-01T10:00:00Z"
title: "..."
url: "https://..."
author: "..."
tags: [...]
published_at: "..."
source_id: "..."
source_name: "..."
source_tier: "..."
source_score: ...
completeness_score: ...
content_hash: ""      # 待预处理填充
archived_path: ""     # 待预处理填充
---
```

### 修改决策

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A: 修改 intel-pull 输出** | 字段名直接统一 | 影响范围大，需同步修改命令和文档 |
| **B: 在 preprocess 映射** ✅ | 影响范围小，逻辑集中 | 多一层映射 |

**选择方案 B**：在 `processCyberPulseFile()` 中做字段映射。

### 理由

1. intel-pull 输出格式已稳定，修改风险高
2. 映射逻辑集中在 preprocess 脚本更清晰
3. 减少对已发布功能的修改范围

### 需要修改的脚本

| 脚本 | 修改内容 |
|------|---------|
| `scripts/preprocess/index.ts` | `processCyberPulseFile()` 添加字段映射逻辑 |
| `scripts/pulse/output.ts` | **不修改**，保持现有输出格式 |

---

## processCyberPulseFile() 修改要点

```typescript
// 当前逻辑：只更新 content_hash
const updatedFrontmatter = {
  ...frontmatter,
  content_hash: contentHash,
};

// 设计方案：统一字段结构
// 1. 计算转换后的文件路径（用于 archived_file）
const convertedRelativePath = path.relative(sourceDir, convertedPath);

// 2. 计算 source_hash（从原始文件内容）
const sourceHash = createHash('md5').update(originalContent).digest('hex');

const updatedFrontmatter = {
  // 第一组：item 来源追溯（字段名映射）
  item_id: frontmatter.item_id,
  item_title: frontmatter.title,
  author: frontmatter.author || null,
  original_url: frontmatter.url || null,
  published_at: frontmatter.published_at || null,
  fetched_at: frontmatter.first_seen_at,
  completeness_score: frontmatter.completeness_score || null,

  // 第二组：情报源追溯（继承）
  source_id: frontmatter.source_id || null,
  source_name: frontmatter.source_name || null,
  source_url: frontmatter.source_url || null,
  source_tier: frontmatter.source_tier || null,
  source_score: frontmatter.source_score || null,

  // 第三组：文件追溯
  archived_file: `[[${convertedRelativePath}]]`,  // WikiLink，指向自身
  content_hash: contentHash,
  source_hash: sourceHash,
  archived_at: frontmatter.first_seen_at,

  // 第四组：处理状态
  processed_status: 'pending',
  processed_at: null,

  // 保留原始字段（用于识别和兼容）
  source_type: frontmatter.source_type,
  first_seen_at: frontmatter.first_seen_at,
  tags: frontmatter.tags || [],
};
```

---

## 详细修改说明

### 1. `scripts/preprocess/index.ts`

#### 1.1 重构 `generateFrontmatter()` 函数

当前函数生成：
```yaml
sourceHash: "..."
originalPath: "..."
archived_at: "..."
archivedSource: "..."
```

需要替换为统一结构函数，移除 `originalPath`（预处理后文件已移动，无需记录原路径）。

#### 1.2 新增 `generateLocalFileFrontmatter()` 函数

```typescript
interface LocalFileFrontmatter {
  // 第一组：item 来源追溯
  item_id: string;
  item_title: string;
  author: null;
  original_url: null;
  published_at: null;
  fetched_at: string;
  completeness_score: null;

  // 第二组：情报源追溯
  source_id: null;
  source_name: null;
  source_url: null;
  source_tier: null;
  source_score: null;

  // 第三组：文件追溯
  archived_file: string;  // WikiLink 格式
  content_hash: string;
  source_hash: string;
  archived_at: string;

  // 第四组：处理状态
  processed_status: 'pending';
  processed_at: null;
}

function generateLocalFileFrontmatter(
  sourceHash: string,        // 源文件 MD5（用于去重）
  contentHash: string,       // body MD5
  filename: string,          // 用于生成 item_title
  archivedPath: string,      // 用于生成 archived_file
  fetchedAt: string          // 处理时间
): string {
  // item_id: item_ + contentHash 前 8 位
  const itemId = `item_${contentHash.slice(0, 8)}`;

  // item_title: 去除扩展名的文件名
  const itemTitle = path.basename(filename, path.extname(filename));

  // archived_file: WikiLink 格式
  const archivedFile = `[[${archivedPath}]]`;

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
archived_at: "${fetchedAt}"

processed_status: "pending"
processed_at: null
---
`;
}
```

#### 1.3 去重逻辑保持不变

保留现有的 `knownHashes` 去重机制，只需将字段名从 `sourceHash` 改为 `source_hash`：

```typescript
// 扫描阶段：收集已知 source_hash
for (const mdPath of existingConvertedFiles) {
  const frontmatter = parseFrontmatter(content);
  if (frontmatter?.source_hash) {  // 改为 snake_case
    knownHashes.set(frontmatter.source_hash, archivedPath);
  }
}

// 处理阶段：检查是否已处理
const sourceHash = calculateHash(sourcePath);
if (knownHashes.has(sourceHash)) {
  return { success: true, isDuplicate: true };
}
```

### 2. `scripts/preprocess/scan-queue.ts`

#### 2.1 更新 `QueueItem` 接口

```typescript
// 修改前
interface QueueItem {
  file: string;
  content_hash: string;
  source_hash?: string;      // ← 保留，重命名自 sourceHash
  archived_source?: string;  // ← 改名
  status: QueueItemStatus;
}

// 修改后
interface QueueItem {
  file: string;
  content_hash: string;
  source_hash?: string;      // 保留
  archived_file?: string;    // ← 新名称
  status: QueueItemStatus;
}
```

#### 2.2 更新读取逻辑

```typescript
// 修改前
const sourceHash = frontmatter?.sourceHash;
const archivedSource = frontmatter?.archivedSource;

// 修改后
const sourceHash = frontmatter?.source_hash;  // snake_case
let archivedFile = frontmatter?.archived_file;
// 提取 WikiLink 中的路径
if (archivedFile) {
  archivedFile = archivedFile.replace(/^\[\[/, '').replace(/\]\]$/, '');
}
```

---

## 识别机制影响评估

### 关键识别逻辑

```typescript
// scripts/preprocess/index.ts
function isCyberPulseFile(filePath: string): boolean {
  const frontmatter = parseFrontmatter(content);
  return frontmatter?.source_type === 'cyber-pulse';
}

const CYBER_PULSE_REQUIRED_FIELDS = ['item_id', 'source_type', 'first_seen_at', 'title'];
```

### 评估结论

| 检查项 | 本地文件 | cyber-pulse 文件 | 结果 |
|--------|---------|-----------------|------|
| `source_type` 字段 | ❌ 不生成 | ✅ 保留 `cyber-pulse` | ✅ 识别正确 |
| `isCyberPulseFile()` 返回 | `false` | `true` | ✅ 识别正确 |
| 必需字段验证 | 不适用（非 cyber-pulse） | 全部存在 | ✅ 验证通过 |

**结论**：设计不会影响 cyber-pulse 文件的识别机制。

### 为什么不影响

1. **本地文件**：不生成 `source_type` 字段，`isCyberPulseFile()` 返回 `false`，走本地文件处理流程

2. **cyber-pulse 文件**：保留 `source_type: 'cyber-pulse'` 和所有必需字段，`isCyberPulseFile()` 返回 `true`，走 cyber-pulse 处理流程

3. **字段映射**：只在 cyber-pulse 处理流程内部进行，不影响识别判断

---

## 测试验证

### 测试 1：本地文件预处理

1. 放置 PDF 文件到 `inbox/`
2. 执行预处理
3. 验证转换文件 frontmatter：
   - 包含所有字段（空值为 `null`）
   - `archived_file` 为 WikiLink 格式
   - `content_hash` 和 `source_hash` 都存在
   - 无 `originalPath`（已移除）

### 测试 2：cyber-pulse 文件预处理

1. 使用 `intel-pull` 拉取文件
2. 执行预处理
3. 验证转换文件 frontmatter：
   - 继承采集阶段的元数据
   - 添加 `content_hash` 和 `source_hash`
   - `archived_file` 为 WikiLink 格式
   - `source_type` 字段保留

### 测试 3：Obsidian 兼容性

1. 在 Obsidian 中打开转换文件
2. 验证 `archived_file` 链接可点击跳转
3. 验证属性面板正确显示所有字段
4. 验证 `null` 值显示为空

### 测试 4：scan-queue 功能

1. 执行 `scan-queue.ts` 脚本
2. 验证输出包含 `archived_file` 字段
3. 验证包含 `source_hash` 字段

### 测试 5：去重机制

1. 预处理一个文件
2. 再次放入同名文件（相同内容）
3. 验证第二次处理时被正确识别为重复

---

## 影响范围

| 修改 | 影响 |
|------|------|
| 保留 `source_hash` | 去重机制无需改动，只需字段名改为 snake_case |
| 移除 `originalPath` | 无影响（未被使用） |
| `archivedSource` → `archived_file` | scan-queue.ts、intel-distill.md 需同步修改 |
| WikiLink 格式 | Obsidian 中可直接跳转 |
| 新增 `item_id` 等字段 | Agent 可继承更多元数据 |
| 统一结构 | 代码逻辑简化，易于维护 |