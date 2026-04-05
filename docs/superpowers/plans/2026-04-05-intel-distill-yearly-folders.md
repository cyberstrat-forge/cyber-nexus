# intel-distill 年月子目录结构实现计划

> **For agentic workers:** 按照本计划逐步实现，使用 checkbox (`- [ ]`) 语法追踪进度。遵循项目开发规范，在功能分支开发，通过 PR 合并。

**Goal:** 为 intel-distill 命令增加年月子目录结构和 Obsidian Bases 索引功能

**Architecture:** 
- 情报卡片输出路径改为 `{domain}/{YYYY}/{MM}/{filename}.md`
- 新增 obsidian-cli skill 提供通用 Obsidian 操作能力
- 情报卡片生成后自动创建 `_index.base` 索引文件

**Tech Stack:** TypeScript, Obsidian CLI, YAML

---

## 文件结构

```
plugins/market-radar/
├── skills/
│   ├── obsidian-cli/                    # 新增
│   │   ├── SKILL.md                     # 主文档
│   │   └── references/
│   │       └── cli-commands.md          # CLI 命令参考
│   └── intelligence-output-templates/
│       └── SKILL.md                     # 修改：更新输出结构
├── agents/
│   └── intelligence-analyzer.md         # 修改：更新输出路径、Bases 生成
├── commands/
│   └── intel-distill.md                 # 修改：更新目录结构文档
└── scripts/
    └── preprocess/
        └── migrate-to-yearly-folders.ts # 新增：历史文件迁移脚本
```

---

## Task 1: 创建 obsidian-cli Skill

**Files:**
- Create: `plugins/market-radar/skills/obsidian-cli/SKILL.md`
- Create: `plugins/market-radar/skills/obsidian-cli/references/cli-commands.md`

- [ ] **Step 1: 创建 skill 目录结构**

```bash
mkdir -p plugins/market-radar/skills/obsidian-cli/references
```

- [ ] **Step 2: 编写 SKILL.md 主文档**

创建文件 `plugins/market-radar/skills/obsidian-cli/SKILL.md`:

```markdown
---
name: obsidian-cli
description: This skill should be used when the user wants to interact with Obsidian from Claude Code. Triggers when the user asks to "search obsidian", "query bases", "read note properties", "set note properties", "create notes in obsidian", or when commands need to generate Obsidian-specific files like .base files.
---

## 概述

此 skill 提供通过 Obsidian CLI 操作 Obsidian 的能力，支持两类使用场景：

1. **命令内部使用**：如 intel-distill 生成 Bases 索引文件
2. **用户直接使用**：在 Claude Code 中查询、搜索、操作 Obsidian vault

## 前置条件

- Obsidian 应用运行中（CLI 需要连接到运行中的 Obsidian）
- Obsidian 1.12+ 版本（CLI 支持）
- 用户已在 Obsidian 设置中启用 CLI（Settings → General → Command line interface）

## 常用命令

### 文件操作

```bash
# 创建文件
obsidian create path="folder/note.md" content="# Title\n\nContent"

# 读取文件
obsidian read file="note-name"

# 列出文件
obsidian files folder="folder-path"

# 搜索文件
obsidian search query="search term" path="folder"
```

### 属性操作

```bash
# 读取属性
obsidian property:read file="note-name" name="property-name"

# 设置属性
obsidian property:set file="note-name" name="property-name" value="value"
```

### Bases 操作

```bash
# 列出所有 .base 文件
obsidian bases

# 查询 base 结果
obsidian base:query file="base-name" view="view-name" format=json
```

## 使用示例

### 创建 Bases 索引文件

```bash
obsidian create path="intelligence/Threat-Landscape/_index.base" content="filters:
  and:
    - file.ext == \"md\"
    - file.name != \"_index\"

views:
  - type: table
    name: \"按发布时间\"
    order:
      - note.published_at
    direction: DESC"
```

### 搜索情报卡片

```bash
obsidian search query="ransomware" path="intelligence"
```

### 查询 Bases 视图

```bash
obsidian base:query file="Threat-Landscape/_index" view="最近 7 天新增" format=json
```

## 注意事项

- CLI 命令需要 Obsidian 应用运行中
- `file` 参数使用文件名（不需要完整路径和扩展名）
- `path` 参数需要完整路径（从 vault 根目录开始）
- 多行内容使用 `\n` 表示换行，`\t` 表示制表符

## 相关资源

- **`references/cli-commands.md`** - 完整 CLI 命令参考
```

- [ ] **Step 3: 编写 CLI 命令参考文档**

创建文件 `plugins/market-radar/skills/obsidian-cli/references/cli-commands.md`:

```markdown
# Obsidian CLI 命令参考

本文档提供 Obsidian CLI 的完整命令参考，基于 Obsidian 1.12+ 版本。

## 文件操作

### `create` - 创建文件

```bash
obsidian create path="folder/note.md" content="# Title\n\nContent"

# 参数
name=<name>        # 文件名
path=<path>        # 文件路径
content=<text>     # 文件内容
template=<name>    # 使用的模板

# 标志
overwrite          # 覆盖已存在的文件
open               # 创建后打开文件
newtab             # 在新标签页打开
```

### `read` - 读取文件

```bash
obsidian read file="note-name"
obsidian read path="folder/note.md"
```

### `files` - 列出文件

```bash
obsidian files folder="folder-path"

# 参数
folder=<path>      # 过滤文件夹
ext=<extension>    # 过滤扩展名

# 标志
total              # 返回文件数量
```

### `search` - 搜索文件

```bash
obsidian search query="search term" path="folder"

# 参数
query=<text>       # (必填) 搜索查询
path=<folder>      # 限制文件夹
limit=<n>          # 最大文件数
format=text|json   # 输出格式

# 标志
total              # 返回匹配数量
case               # 区分大小写
```

## 属性操作

### `property:read` - 读取属性

```bash
obsidian property:read file="note-name" name="property-name"
```

### `property:set` - 设置属性

```bash
obsidian property:set file="note-name" name="status" value="done"

# 参数
name=<name>                                    # (必填) 属性名
value=<value>                                  # (必填) 属性值
type=text|list|number|checkbox|date|datetime   # 属性类型
file=<name>                                    # 文件名
path=<path>                                    # 文件路径
```

### `property:remove` - 删除属性

```bash
obsidian property:remove file="note-name" name="property-name"
```

### `properties` - 列出属性

```bash
obsidian properties

# 参数
file=<name>        # 显示指定文件的属性
path=<path>        # 文件路径
name=<name>        # 统计特定属性

# 标志
total              # 返回属性数量
counts             # 包含出现次数
active             # 显示当前活动文件的属性
```

## Bases 操作

### `bases` - 列出 Bases 文件

```bash
obsidian bases
```

### `base:views` - 列出 Base 视图

```bash
obsidian base:views file="base-name"
```

### `base:create` - 在 Base 中创建项目

```bash
obsidian base:create file="base-name" name="new-item"

# 参数
file=<name>        # base 文件名
path=<path>        # base 文件路径
view=<name>        # 视图名
name=<name>        # 新文件名
content=<text>     # 初始内容

# 标志
open               # 创建后打开
newtab             # 在新标签页打开
```

### `base:query` - 查询 Base

```bash
obsidian base:query file="base-name" format=json

# 参数
file=<name>                    # base 文件名
path=<path>                    # base 文件路径
view=<name>                    # 视图名
format=json|csv|tsv|md|paths   # 输出格式
```

## 标签操作

### `tags` - 列出标签

```bash
obsidian tags

# 参数
file=<name>        # 显示指定文件的标签
path=<path>        # 文件路径
sort=count         # 按数量排序

# 标志
total              # 返回标签数量
counts             # 包含出现次数
active             # 显示当前活动文件的标签
```

## 日常笔记

### `daily` - 打开今日笔记

```bash
obsidian daily
```

### `daily:append` - 追加内容到今日笔记

```bash
obsidian daily:append content="- [ ] New task"

# 标志
inline             # 不换行追加
open               # 追加后打开
```

### `daily:prepend` - 前置内容到今日笔记

```bash
obsidian daily:prepend content="# Heading"
```

## 任务操作

### `tasks` - 列出任务

```bash
obsidian tasks

# 参数
file=<name>        # 过滤文件
status="<char>"    # 过滤状态字符

# 标志
total              # 返回任务数量
done               # 显示已完成
todo               # 显示未完成
daily              # 显示日常笔记中的任务
```

### `task` - 显示/更新任务

```bash
obsidian task file="note-name" line=5 toggle

# 参数
ref=<path:line>    # 任务引用
line=<n>           # 行号
status="<char>"    # 设置状态字符

# 标志
toggle             # 切换状态
done               # 标记完成
todo               # 标记未完成
```

## Vault 操作

### `vault` - 显示 Vault 信息

```bash
obsidian vault

# 参数
info=name|path|files|folders|size  # 返回特定信息
```

### `vaults` - 列出所有 Vault

```bash
obsidian vaults

# 标志
total              # 返回数量
verbose            # 包含路径
```

## 开发者命令

### `eval` - 执行 JavaScript

```bash
obsidian eval code="app.vault.getFiles().length"
```

### `devtools` - 打开开发者工具

```bash
obsidian devtools
```

### `dev:screenshot` - 截图

```bash
obsidian dev:screenshot path="screenshot.png"
```
```

- [ ] **Step 4: 验证文件创建**

```bash
ls -la plugins/market-radar/skills/obsidian-cli/
```

预期输出：
```
SKILL.md
references/
```

- [ ] **Step 5: 提交 Skill 文件**

```bash
git add plugins/market-radar/skills/obsidian-cli/
git commit -m "feat(market-radar): add obsidian-cli skill for Obsidian CLI operations"
```

---

## Task 2: 更新 intelligence-output-templates Skill

**Files:**
- Modify: `plugins/market-radar/skills/intelligence-output-templates/SKILL.md`

- [ ] **Step 1: 读取当前 SKILL.md**

```bash
cat plugins/market-radar/skills/intelligence-output-templates/SKILL.md
```

- [ ] **Step 2: 更新输出结构章节**

修改 `plugins/market-radar/skills/intelligence-output-templates/SKILL.md`，将输出结构章节从：

```markdown
## 输出结构

情报卡片按领域存储：

```
{output_dir}/
├── Threat-Landscape/
├── Industry-Analysis/
├── Vendor-Intelligence/
├── Emerging-Tech/
├── Customer-Market/
├── Policy-Regulation/
└── Capital-Investment/
```
```

修改为：

```markdown
## 输出结构

情报卡片按领域和年月存储：

```
{output_dir}/
├── Threat-Landscape/
│   └── 2026/
│       ├── 03/
│       │   └── 20260301-apt-activity.md
│       └── 04/
│           └── 20260402-ransomware-trend.md
├── Industry-Analysis/
│   └── 2025/
│       └── 10/
│           └── 20251013-cybersecurity-trends-2026.md
├── Vendor-Intelligence/
│   └── 2026/
├── Emerging-Tech/
│   └── 2026/
├── Customer-Market/
│   └── 2026/
├── Policy-Regulation/
│   └── 2026/
└── Capital-Investment/
    └── 2026/
```

**输出路径格式**：

```
{output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-{subject}-{feature}.md
```

其中：
- `{domain}` - 情报领域（如 Threat-Landscape）
- `{YYYY}` - 发布年份（从 published_at 提取）
- `{MM}` - 发布月份（从 published_at 提取）
- `{YYYYMMDD}` - 发布日期
- `{subject}` - 主体/对象
- `{feature}` - 核心特征
```

- [ ] **Step 3: 提交更新**

```bash
git add plugins/market-radar/skills/intelligence-output-templates/SKILL.md
git commit -m "docs(market-radar): update output structure with yearly folders"
```

---

## Task 3: 更新 intelligence-analyzer Agent

**Files:**
- Modify: `plugins/market-radar/agents/intelligence-analyzer.md`

- [ ] **Step 1: 读取当前 Agent 文件**

```bash
head -300 plugins/market-radar/agents/intelligence-analyzer.md
```

- [ ] **Step 2: 更新步骤 5 输出路径**

在 `plugins/market-radar/agents/intelligence-analyzer.md` 中，找到步骤 5 相关内容，更新输出路径逻辑：

**原内容**（约第 251-278 行）：

```markdown
**每张情报卡片独立生成**：
- 独立的 `intelligence_id`：`{domain_prefix}-{YYYYMMDD}-{seq}`
- 独立的文件名：`{YYYYMMDD}-{subject}-{feature}.md`
- 独立写入文件：`{output}/{domain}/{filename}`
```

**修改为**：

```markdown
**每张情报卡片独立生成**：
- 独立的 `intelligence_id`：`{domain_prefix}-{YYYYMMDD}-{seq}`
- 独立的文件名：`{YYYYMMDD}-{subject}-{feature}.md`
- 独立写入文件：`{output}/{domain}/{YYYY}/{MM}/{filename}`

**年月路径提取**：

从 `intelligence_date`（即 `published_at`）提取年份和月份：
- `{YYYY}` = `intelligence_date` 的年份部分
- `{MM}` = `intelligence_date` 的月份部分（两位数，如 "03"、"04"）

**日期提取优先级**：
1. `published_at` 字段（frontmatter）
2. `created_date` 字段（frontmatter）
3. 文件系统日期（兜底）
```

- [ ] **Step 3: 更新步骤 6 去重检测路径**

在 `plugins/market-radar/agents/intelligence-analyzer.md` 中，找到步骤 6.3 冲突检测流程：

**原内容**（约第 364-368 行）：

```markdown
#### 6.3 冲突检测流程

```bash
# 检查同日期同领域文件
glob pattern: {output}/{domain}/{YYYYMMDD}-*.md
```
```

**修改为**：

```markdown
#### 6.3 冲突检测流程

```bash
# 检查同年同月同领域文件
glob pattern: {output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-*.md
```
```

- [ ] **Step 4: 添加 Bases 索引文件生成步骤**

在步骤 7 之后，添加新步骤 8：

```markdown
### 步骤 8：生成 Obsidian Bases 索引文件

**生成时机**：情报卡片写入成功后

**生成逻辑**：

```
对于每个有新情报卡片的领域目录：
  检查 {output}/{domain}/_index.base 是否存在
  如不存在 → 使用 obsidian-cli skill 创建 _index.base 文件
  如已存在 → 跳过（保留用户自定义）
```

**使用 obsidian-cli skill**：

参考 `obsidian-cli` skill 中的命令，使用 `obsidian create` 创建 Bases 文件：

```bash
obsidian create path="{output}/{domain}/_index.base" content="..."
```

**Bases 文件内容模板**：

```yaml
filters:
  and:
    - file.ext == "md"
    - file.name != "_index"

views:
  - type: table
    name: "按发布时间"
    order:
      - note.published_at
    direction: DESC

  - type: table
    name: "按创建时间"
    order:
      - note.created_date
    direction: DESC

  - type: table
    name: "最近 7 天新增"
    filters:
      note.created_date >= today() - "7 days"
    order:
      - note.created_date
    direction: DESC

  - type: table
    name: "按年份分组（发布）"
    groupBy:
      property: note.published_at
      direction: DESC
```

**注意事项**：
- `_index.base` 文件命名以下划线开头，在 Obsidian 文件列表中会排在前面
- 过滤条件排除自身，避免索引文件出现在视图中
- 用户可自定义修改 `_index.base`，命令不会覆盖

**Bases 自动更新机制**：

Bases 是动态查询，每次打开时实时运行：
- 新情报卡片创建后，打开 `_index.base` 即可见
- 无需手动更新索引
- Bases 文件只需创建一次
```

- [ ] **Step 5: 更新原有步骤编号**

将原有的步骤 8、9 等依次后移：
- 原步骤 7 → 步骤 7（写入文件）
- 原步骤 8 → 新步骤 8（生成 Bases）
- 原步骤 9 → 新步骤 9（输出格式）

更新后续步骤的编号引用。

- [ ] **Step 6: 提交 Agent 更新**

```bash
git add plugins/market-radar/agents/intelligence-analyzer.md
git commit -m "feat(market-radar): update intelligence-analyzer with yearly folders and bases generation"
```

---

## Task 4: 更新 intel-distill 命令文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

- [ ] **Step 1: 更新目录结构章节**

在 `plugins/market-radar/commands/intel-distill.md` 中，找到目录结构章节（约第 136-183 行），更新为新结构：

**原内容**：

```markdown
### 推荐目录布局

```
{source_dir}/
├── inbox/                          # ⭐️ 待处理文档（推荐入口）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   ├── vendor-news.pdf
│   └── failed-doc.pdf.error.md     # ⭐️ 转换失败的错误日志
│
├── archive/                        # ⭐️ 已归档文档（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.pdf
│           ├── ai-article.docx
│           └── vendor-news.pdf
│
├── converted/                      # ⭐️ 转换后的 Markdown（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.md      # ⭐️ 含 frontmatter 元数据
│           ├── ai-article.md
│           └── vendor-news.md
│
├── intelligence/                   # 情报卡片输出
│   ├── threat-intelligence/
│   ├── market-trends/
│   ├── technology-innovation/
│   └── ...
│
└── .intel/                         # ⭐️ 管理目录（隐藏）
    └── state.json                  # ⭐️ 状态文件 v2.0
```
```

**修改为**：

```markdown
### 推荐目录布局

```
{source_dir}/
├── inbox/                          # ⭐️ 待处理文档（推荐入口）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   ├── vendor-news.pdf
│   └── failed-doc.pdf.error.md     # ⭐️ 转换失败的错误日志
│
├── archive/                        # ⭐️ 已归档文档（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.pdf
│           ├── ai-article.docx
│           └── vendor-news.pdf
│
├── converted/                      # ⭐️ 转换后的 Markdown（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.md      # ⭐️ 含 frontmatter 元数据
│           ├── ai-article.md
│           └── vendor-news.md
│
├── intelligence/                   # 情报卡片输出（按领域和年月组织）
│   ├── Threat-Landscape/
│   │   └── 2026/
│   │       ├── 03/
│   │       │   └── 20260301-apt-activity.md
│   │       └── 04/
│   │           └── 20260402-ransomware-trend.md
│   ├── Industry-Analysis/
│   │   └── 2026/
│   │       └── 04/
│   │           └── _index.base     # ⭐️ Obsidian Bases 索引文件
│   ├── Vendor-Intelligence/
│   ├── Emerging-Tech/
│   ├── Customer-Market/
│   ├── Policy-Regulation/
│   └── Capital-Investment/
│
└── .intel/                         # ⭐️ 管理目录（隐藏）
    └── state.json                  # ⭐️ 状态文件 v2.0
```
```

- [ ] **Step 2: 添加 Bases 索引文件说明**

在目录说明表格中添加 Bases 文件的说明：

```markdown
| `intelligence/{domain}/YYYY/MM/` | 情报卡片（按领域和年月组织） | `{YYYYMMDD}-{subject}-{feature}.md` | ✅ 可见 |
| `intelligence/{domain}/_index.base` | Obsidian Bases 索引文件 | `_index.base` | ✅ 可见 |
```

- [ ] **Step 3: 提交命令文档更新**

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "docs(market-radar): update intel-distill with yearly folders and bases docs"
```

---

## Task 5: 创建历史文件迁移脚本

**Files:**
- Create: `plugins/market-radar/scripts/preprocess/migrate-to-yearly-folders.ts`

- [ ] **Step 1: 创建迁移脚本**

创建文件 `plugins/market-radar/scripts/preprocess/migrate-to-yearly-folders.ts`:

```typescript
#!/usr/bin/env node
/**
 * 历史情报卡片迁移脚本
 * 
 * 将扁平结构的情报卡片迁移到年月子目录结构
 * 
 * 用法：
 *   pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence
 *   pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  total: number;
  migrated: number;
  skippedAlreadyInSubfolder: number;
  skippedInvalidName: number;
  skippedError: number;
  details: MigrationDetail[];
}

interface MigrationDetail {
  source: string;
  target?: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
}

const DOMAINS = [
  'Threat-Landscape',
  'Industry-Analysis',
  'Vendor-Intelligence',
  'Emerging-Tech',
  'Customer-Market',
  'Policy-Regulation',
  'Capital-Investment',
];

function parseArgs(): { directory: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let directory = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--directory' && args[i + 1]) {
      directory = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!directory) {
    console.error('错误：必须指定 --directory 参数');
    console.error('用法：pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence [--dry-run]');
    process.exit(1);
  }

  return { directory, dryRun };
}

function extractDateFromFilename(filename: string): { year: string; month: string } | null {
  // 从文件名提取 YYYYMMDD（前 8 位）
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})-/);
  if (!match) {
    return null;
  }
  return {
    year: match[1],
    month: match[2],
  };
}

function migrateDirectory(
  domainDir: string,
  domain: string,
  dryRun: boolean
): MigrationResult {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skippedAlreadyInSubfolder: 0,
    skippedInvalidName: 0,
    skippedError: 0,
    details: [],
  };

  if (!fs.existsSync(domainDir)) {
    return result;
  }

  const entries = fs.readdirSync(domainDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    result.total++;

    const sourcePath = path.join(domainDir, entry.name);

    // 检查是否已在子目录中（通过检查路径是否包含年份目录）
    const relativePath = path.relative(domainDir, sourcePath);
    if (relativePath.includes(path.sep)) {
      result.skippedAlreadyInSubfolder++;
      result.details.push({
        source: sourcePath,
        status: 'skipped',
        reason: '已在子目录中',
      });
      continue;
    }

    // 从文件名提取日期
    const dateInfo = extractDateFromFilename(entry.name);
    if (!dateInfo) {
      result.skippedInvalidName++;
      result.details.push({
        source: sourcePath,
        status: 'skipped',
        reason: '文件名不以日期开头',
      });
      continue;
    }

    // 构建目标路径
    const targetDir = path.join(domainDir, dateInfo.year, dateInfo.month);
    const targetPath = path.join(targetDir, entry.name);

    // 检查目标文件是否已存在
    if (fs.existsSync(targetPath)) {
      // 追加序号
      const ext = path.extname(entry.name);
      const baseName = path.basename(entry.name, ext);
      let seq = 2;
      let newTargetPath: string;
      do {
        newTargetPath = path.join(targetDir, `${baseName}-${seq}${ext}`);
        seq++;
      } while (fs.existsSync(newTargetPath));
      
      if (!dryRun) {
        // 创建目标目录
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.renameSync(sourcePath, newTargetPath);
      }
      result.migrated++;
      result.details.push({
        source: sourcePath,
        target: newTargetPath,
        status: 'migrated',
        reason: '目标文件已存在，追加序号',
      });
      continue;
    }

    // 执行迁移
    if (!dryRun) {
      // 创建目标目录
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.renameSync(sourcePath, targetPath);
    }

    result.migrated++;
    result.details.push({
      source: sourcePath,
      target: targetPath,
      status: 'migrated',
    });
  }

  return result;
}

function printReport(results: Map<string, MigrationResult>, dryRun: boolean) {
  console.log('════════════════════════════════════════════════════════');
  console.log(`📊 迁移执行报告${dryRun ? '（模拟运行）' : ''}`);
  console.log('════════════════════════════════════════════════════════');
  console.log();

  // 汇总统计
  let totalFiles = 0;
  let totalMigrated = 0;
  let totalSkippedSubfolder = 0;
  let totalSkippedInvalid = 0;
  let totalErrors = 0;

  for (const [domain, result] of results) {
    totalFiles += result.total;
    totalMigrated += result.migrated;
    totalSkippedSubfolder += result.skippedAlreadyInSubfolder;
    totalSkippedInvalid += result.skippedInvalidName;
    totalErrors += result.skippedError;
  }

  console.log('【迁移统计】');
  console.log(`• 扫描到文件: ${totalFiles} 个`);
  console.log(`• 成功迁移: ${totalMigrated} 个`);
  console.log(`• 跳过（已在子目录）: ${totalSkippedSubfolder} 个`);
  console.log(`• 跳过（日期格式错误）: ${totalSkippedInvalid} 个`);
  if (totalErrors > 0) {
    console.log(`• 错误: ${totalErrors} 个`);
  }
  console.log();

  // 迁移详情
  console.log('【迁移详情】');
  for (const [domain, result] of results) {
    if (result.migrated === 0 && result.total === 0) {
      continue;
    }

    console.log();
    console.log(`### ${domain}`);
    
    for (const detail of result.details) {
      if (detail.status === 'migrated') {
        console.log(`✅ ${detail.source}`);
        console.log(`   → ${detail.target}`);
      } else if (detail.status === 'skipped') {
        console.log(`⚠️  跳过: ${detail.source}（${detail.reason}）`);
      } else if (detail.status === 'error') {
        console.log(`❌ 错误: ${detail.source}（${detail.reason}）`);
      }
    }
  }

  console.log();
  console.log('════════════════════════════════════════════════════════');
}

function main() {
  const { directory, dryRun } = parseArgs();

  console.log(`正在扫描目录: ${directory}`);
  if (dryRun) {
    console.log('（模拟运行，不实际移动文件）');
  }
  console.log();

  const results = new Map<string, MigrationResult>();

  for (const domain of DOMAINS) {
    const domainDir = path.join(directory, domain);
    const result = migrateDirectory(domainDir, domain, dryRun);
    results.set(domain, result);
  }

  printReport(results, dryRun);
}

main();
```

- [ ] **Step 2: 验证脚本语法**

```bash
cd plugins/market-radar/scripts
pnpm exec tsc --noEmit preprocess/migrate-to-yearly-folders.ts
```

预期输出：无错误

- [ ] **Step 3: 提交迁移脚本**

```bash
git add plugins/market-radar/scripts/preprocess/migrate-to-yearly-folders.ts
git commit -m "feat(market-radar): add migration script for yearly folders structure"
```

---

## Task 6: 更新插件版本和文档

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`
- Modify: `plugins/market-radar/CHANGELOG.md`

- [ ] **Step 1: 读取当前版本**

```bash
grep '"version"' plugins/market-radar/.claude-plugin/plugin.json
```

- [ ] **Step 2: 更新 plugin.json 版本号**

假设当前版本为 `1.6.1`，更新为 `1.7.0`（新功能 MINOR 版本）：

```bash
# 使用 sed 更新版本号（根据实际当前版本调整）
sed -i '' 's/"version": "1.6.1"/"version": "1.7.0"/' plugins/market-radar/.claude-plugin/plugin.json
```

- [ ] **Step 3: 更新 CHANGELOG.md**

在 `plugins/market-radar/CHANGELOG.md` 顶部添加新版本记录：

```markdown
## [1.7.0] - 2026-04-05

### Added

- **年月子目录结构**：情报卡片输出改为 `{domain}/{YYYY}/{MM}/{filename}.md` 格式，便于按时间浏览和组织
- **Obsidian Bases 索引**：自动为各领域目录生成 `_index.base` 文件，提供按发布时间、创建时间、最近新增等视图
- **obsidian-cli skill**：新增通用 skill，支持通过 Obsidian CLI 进行文件操作、属性读写、Bases 查询等
- **历史文件迁移脚本**：新增 `migrate-to-yearly-folders.ts` 脚本，支持将扁平结构迁移到年月子目录

### Changed

- **intelligence-analyzer Agent**：更新输出路径逻辑，支持年月子目录结构
- **intelligence-output-templates Skill**：更新输出结构文档

### Technical

- 输出路径格式：`{output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-{subject}-{feature}.md`
- Bases 索引文件自动生成，动态查询无需手动更新
```

- [ ] **Step 4: 提交版本更新**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json plugins/market-radar/CHANGELOG.md
git commit -m "chore(market-radar): release v1.7.0 with yearly folders and bases support"
```

---

## Task 7: 创建功能分支和 PR

- [ ] **Step 1: 确认当前分支状态**

```bash
git status
git log --oneline -5
```

- [ ] **Step 2: 推送功能分支**

```bash
git push -u origin feature/yearly-folders-bases
```

- [ ] **Step 3: 创建 Pull Request**

使用 GitHub CLI 或 Web 界面创建 PR：

**PR 标题**：`feat(market-radar): add yearly folders structure and Obsidian Bases support`

**PR 描述**：

```markdown
## Summary

实现设计文档 `docs/superpowers/specs/2026-04-05-intel-distill-yearly-folders-design.md` 中的两个特性：

1. **年月子目录结构**：情报卡片输出改为 `{domain}/{YYYY}/{MM}/{filename}.md` 格式
2. **Obsidian Bases 索引**：自动生成 `_index.base` 文件，提供多种视图

## Changes

| 文件 | 变更类型 |
|------|---------|
| `skills/obsidian-cli/` | 新增 - Obsidian CLI 操作 skill |
| `agents/intelligence-analyzer.md` | 修改 - 更新输出路径、添加 Bases 生成 |
| `skills/intelligence-output-templates/SKILL.md` | 修改 - 更新输出结构文档 |
| `commands/intel-distill.md` | 修改 - 更新目录结构文档 |
| `scripts/preprocess/migrate-to-yearly-folders.ts` | 新增 - 历史文件迁移脚本 |

## Test Plan

- [ ] 运行 TypeScript 类型检查：`pnpm exec tsc --noEmit`
- [ ] 在 Obsidian 中验证 Bases 视图正常工作
- [ ] 运行迁移脚本验证历史文件迁移

## Breaking Changes

情报卡片输出路径变更，历史用户需运行迁移脚本。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 验收清单

- [ ] TypeScript 类型检查通过：`pnpm exec tsc --noEmit`
- [ ] 所有文件已提交到功能分支
- [ ] PR 已创建并通过 CI 检查
- [ ] 在 Obsidian 中验证 Bases 视图正常工作
- [ ] 迁移脚本能正确处理边缘情况