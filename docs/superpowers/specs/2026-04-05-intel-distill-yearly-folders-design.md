# intel-distill 年月子目录结构设计

> **日期**: 2026-04-05
> **状态**: 设计完成，待实现
> **关联**: market-radar 插件

## 背景

当前 `intel-distill` 命令生成的情报卡片采用扁平目录结构：

```
intelligence/
├── Threat-Landscape/
│   ├── 20260301-apt-activity.md
│   └── 20260402-ransomware-trend.md
├── Industry-Analysis/
│   └── 20251013-cybersecurity-trends-2026.md
└── ...（其他领域同理）
```

**问题**：
- 随着时间推移，单个目录下文件数量会持续累积
- 用户无法通过目录导航按时间浏览情报卡片
- 缺乏索引机制快速了解有哪些情报卡片

## 目标

1. **年月子目录结构**：输出情报卡片时增加年份和月份目录，便于按时间浏览和组织
2. **Obsidian Bases 索引**：自动为各领域目录生成 `_index.base` 文件，区分发布时间和创建时间视图
3. **Obsidian CLI Skill**：开发通用 skill，实现对 Obsidian 的操作能力（本次用于 Bases 文件生成）

## 设计方案

### 输出结构变更

**原结构**：
```
{output}/{domain}/{YYYYMMDD}-{subject}-{feature}.md
```

**新结构**：
```
{output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-{subject}-{feature}.md
```

**示例**：

```
intelligence/
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

### 日期来源

年月子目录基于**情报日期**（`published_at`）生成，与文件名中的 `YYYYMMDD` 保持一致。

**Why**: 情报日期代表源文档的发布时间，按此组织便于按时间归档和查找。

**日期提取优先级**：
1. `published_at` 字段（frontmatter）
2. `created_date` 字段（frontmatter）
3. 文件系统日期（兜底）

### Obsidian Bases 索引文件

**intel-distill 命令会自动为各领域目录生成 `_index.base` 文件**，提供以下索引视图：

**时间维度区分**：

| 时间类型 | 属性 | 来源 | 用途 |
|---------|------|------|------|
| **发布时间** | `note.published_at` | frontmatter | 情报本身的时效性（文件名中的日期） |
| **创建时间** | `note.created_date` | frontmatter | 情报卡片生成时间 |
| **文件创建** | `file.ctime` | 文件系统 | 文件被写入磁盘的时间 |

**视图设计**：

1. **按发布时间**：情报卡片按发布时间倒序，便于查看最新情报
2. **按创建时间**：情报卡片按生成时间倒序，便于追踪新增卡片
3. **最近 7 天新增**：最近 7 天创建的情报卡片
4. **按年份分组（发布）**：按发布年份分组

**`_index.base` 文件结构**：

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

**文件属性支持**：

| 属性 | 类型 | 用途 |
|------|------|------|
| `note.published_at` | 日期 | 情报发布时间（frontmatter） |
| `note.created_date` | 日期 | 情报卡片创建时间（frontmatter） |
| `note.primary_domain` | 字符串 | 主要领域 |
| `note.tags` | 列表 | 标签 |
| `file.folder` | 字符串 | 文件所在文件夹路径 |
| `file.ctime` | 日期 | 文件系统创建时间 |
| `file.mtime` | 日期 | 文件系统修改时间 |
| `file.name` | 字符串 | 文件名称 |
| `file.tags` | 列表 | 文件标签 |

**生成时机**：
- 情报卡片生成后，检测领域目录是否存在 `_index.base`
- 如不存在，自动创建
- 如已存在，跳过（保留用户自定义配置）

## 改动范围

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `skills/obsidian-cli/SKILL.md` | 新增 | Obsidian CLI 操作 skill |
| `agents/intelligence-analyzer.md` | 修改 | 更新输出路径逻辑、使用 Obsidian CLI skill 生成 Bases 文件 |
| `skills/intelligence-output-templates/SKILL.md` | 修改 | 更新输出结构说明 |
| `scripts/preprocess/migrate-to-yearly-folders.ts` | 新增 | 历史文件迁移脚本 |
| `commands/intel-distill.md` | 修改 | 更新目录结构文档、添加 Bases 生成步骤 |

### Obsidian CLI Skill 设计

**目的**：提供通用的 Obsidian 操作能力，支持两类使用场景

#### 使用场景

**场景 1：intel-distill 命令内部使用**

| 操作 | 命令 | 说明 |
|------|------|------|
| 创建 Bases 文件 | `obsidian create` | 生成 `_index.base` 索引文件 |

**场景 2：用户在 Claude Code 中直接使用**

| 操作 | 命令 | 用户场景示例 |
|------|------|-------------|
| **查询 Bases** | `obsidian base:query` | "查看 Threat-Landscape 最近 7 天新增的情报" |
| **搜索文件** | `obsidian search` | "搜索包含 'ransomware' 的情报卡片" |
| **读取属性** | `obsidian property:read` | "读取这张卡片的标签" |
| **设置属性** | `obsidian property:set` | "把这张卡片的 status 设为 done" |
| **列出文件** | `obsidian files` | "列出 Industry-Analysis 目录下所有文件" |
| **读取内容** | `obsidian read` | "读取某张情报卡片的内容" |

#### 功能范围

| 命令 | 用途 | 优先级 |
|------|------|--------|
| `create` | 创建/覆盖文件 | P0 |
| `read` | 读取文件内容 | P0 |
| `property:set` | 设置文件属性 | P1 |
| `property:read` | 读取文件属性 | P1 |
| `search` | 搜索文件 | P1 |
| `files` | 列出文件 | P1 |
| `bases` | 列出 .base 文件 | P1 |
| `base:query` | 查询 base 结果 | P1 |
| `base:create` | 在 base 中创建项目 | P2 |

#### 触发条件

**命令内部触发**：
- intel-distill 生成情报卡片后，创建 Bases 索引文件

**用户直接触发**：
- 用户请求查询/搜索 Obsidian vault 中的情报卡片
- 用户请求读取或设置文件属性
- 用户请求操作 Bases 视图

#### 使用示例

**创建 Bases 文件（intel-distill 内部）**：

```bash
obsidian create path="intelligence/Threat-Landscape/_index.base" content="filters:..."
```

**用户查询情报（Claude Code 中）**：

```bash
# 查询 Threat-Landscape 领域最近 7 天新增的情报
obsidian base:query file="Threat-Landscape/_index" view="最近 7 天新增" format=json

# 搜索包含 ransomware 的情报卡片
obsidian search query="ransomware" path="intelligence"

# 读取情报卡片的标签属性
obsidian property:read file="20260405-apt-activity" name="tags"
```

#### 前置条件

- Obsidian 应用运行中（CLI 需要连接到运行中的 Obsidian）
- Obsidian 1.12+ 版本（CLI 支持）
- 用户已在 Obsidian 设置中启用 CLI

#### Skill 结构

```
skills/obsidian-cli/
├── SKILL.md                    # 主文档
└── references/
    └── cli-commands.md         # 完整命令参考
```

#### Bases 自动更新机制

**重要**：Bases 是动态查询，无需手动更新索引。

- 每次打开 `.base` 文件时，Obsidian 会实时运行查询
- 新情报卡片创建后，打开 `_index.base` 即可见
- 无需 intel-distill 命令更新 Bases 文件
- Bases 文件只需创建一次，之后自动追踪所有新文件

### 详细改动

#### 1. intelligence-analyzer Agent

**步骤 5：生成情报卡片** - 更新写入路径

```
原路径: {output}/{domain}/{filename}
新路径: {output}/{domain}/{YYYY}/{MM}/{filename}
```

其中 `{YYYY}` 和 `{MM}` 从 `intelligence_date` 提取。

**步骤 6.1：去重检测** - 更新检测路径

```
原检测: {output}/{domain}/{YYYYMMDD}-*.md
新检测: {output}/{domain}/{YYYY}/{MM}/{YYYYMMDD}-*.md
```

**步骤 7：写入文件** - 无需改动

Write 工具会自动创建父目录。

#### 1.1 Bases 索引文件生成

**生成时机**：情报卡片写入成功后

**生成方式**：使用 `obsidian-cli` skill 创建 Bases 文件

**生成逻辑**：

```
对于每个有新情报卡片的领域目录：
  检查 {output}/{domain}/_index.base 是否存在
  如不存在 → 使用 Obsidian CLI 创建 _index.base 文件
  如已存在 → 跳过（保留用户自定义）
```

**使用 Obsidian CLI 创建**：

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
    direction: DESC
..."
```

**注意事项**：
- `_index.base` 文件命名以下划线开头，在 Obsidian 文件列表中会排在前面
- 过滤条件排除自身，避免索引文件出现在视图中
- 用户可自定义修改 `_index.base`，命令不会覆盖
- 需要 Obsidian 应用运行中才能使用 CLI

#### 2. intelligence-output-templates SKILL.md

更新输出结构章节，反映新的目录结构。

#### 3. migrate-to-yearly-folders.ts（新增）

**功能**：将现有的扁平结构情报卡片迁移到年月子目录结构

**执行方式**：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx preprocess/migrate-to-yearly-folders.ts --directory ./intelligence
```

**参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--directory` | 是 | 情报卡片输出目录 |
| `--dry-run` | 否 | 模拟执行，不实际移动文件 |

**迁移逻辑**：

1. 扫描 `{directory}/{domain}/*.md`（仅根级别，不递归）
2. 从文件名提取 `YYYYMMDD`（前 8 位）
3. 解析为年月：`YYYY` 和 `MM`
4. 移动文件到 `{domain}/{YYYY}/{MM}/{filename}`
5. 输出迁移统计

**边缘情况处理**：

| 场景 | 处理策略 |
|------|---------|
| 文件名不以日期开头 | 跳过，输出警告 |
| 目标文件已存在 | 追加序号 |
| 年月目录不存在 | 自动创建 |
| 文件已在子目录中 | 跳过，输出提示 |

**输出示例**：

```
════════════════════════════════════════════════════════
📊 迁移执行报告
════════════════════════════════════════════════════════

【迁移统计】
• 扫描到文件: 45 个
• 成功迁移: 42 个
• 跳过（已在子目录）: 2 个
• 跳过（日期格式错误）: 1 个

【迁移详情】
✅ Industry-Analysis/20251013-cybersecurity-trends-2026.md
   → Industry-Analysis/2025/10/20251013-cybersecurity-trends-2026.md

✅ Threat-Landscape/20260402-ransomware-trend.md
   → Threat-Landscape/2026/04/20260402-ransomware-trend.md

⚠️  跳过: notes/misc-info.md（文件名不以日期开头）

════════════════════════════════════════════════════════
```

#### 4. scan-cards.ts 脚本

**无需改动**。Glob 的 `**` 会递归匹配所有子目录，现有扫描模式已兼容新结构。

```typescript
// 现有模式已兼容
const pattern = `${directory}/**/*.md`;
```

#### 5. intel-distill 命令

**步骤 6.2/6.3**：扫描策略无需改动（扫描 `converted/` 目录，不受影响）

**目录结构文档**：更新步骤 8.2 和相关章节中的路径示例

## 测试计划

### 单元测试

1. **年月路径生成**
   - 输入：`intelligence_date = "2026-04-02"`
   - 预期：`2026/04/`

2. **日期缺失兜底**
   - 输入：`intelligence_date = null`, `created_date = "2026-03-15"`
   - 预期：`2026/03/`

### 集成测试

1. **新情报卡片生成**
   - 运行 `/intel-distill` 处理新文档
   - 验证输出路径：`{domain}/{YYYY}/{MM}/{filename}.md`

2. **周报/月报生成**
   - 运行 `/intel-distill --report weekly`
   - 验证能正确扫描新目录结构下的卡片

3. **迁移脚本**
   - 在测试目录创建扁平结构文件
   - 运行迁移脚本
   - 验证文件移动到正确位置

### 手动测试

1. **Obsidian Bases**
   - 在 Obsidian 中打开 `intelligence/` 目录
   - 验证能通过文件夹导航浏览各领域和时间段的卡片
   - 打开 `_index.base` 文件，验证四个视图正常工作：
     - 按发布时间（最新情报在前）
     - 按创建时间（追踪新增卡片）
     - 最近 7 天新增
     - 按年份分组
   - 创建新情报卡片后，刷新 `_index.base` 验证新卡片自动出现

2. **Obsidian CLI Skill**
   - 在 Claude Code 中请求搜索情报卡片
   - 验证 `obsidian search` 命令正常工作
   - 验证 `obsidian base:query` 能导出 Bases 数据

## 实现计划

| 步骤 | 任务 | 预计改动 |
|------|------|---------|
| 1 | 创建 obsidian-cli skill | SKILL.md + references/cli-commands.md |
| 2 | 更新 intelligence-analyzer.md | 步骤 5、6.1、7（使用 Obsidian CLI 生成 Bases） |
| 3 | 更新 intelligence-output-templates SKILL.md | 输出结构章节 |
| 4 | 更新 intel-distill.md | 目录结构文档、Bases 生成说明 |
| 5 | 创建 migrate-to-yearly-folders.ts | 新文件 |
| 6 | 测试验证 | 运行命令和脚本、Obsidian 中验证 Bases |

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 历史文件丢失 | 迁移脚本使用 `--dry-run` 模式先验证 |
| 用户习惯改变 | 目录结构保持直观（年/月层级） |
| Obsidian CLI 需应用运行 | 文档说明前置条件，提供 Write 工具作为 fallback |
| Obsidian CLI 版本兼容 | skill 中说明最低版本要求（1.12+） |

## 未来扩展

**Obsidian CLI Skill 复用场景**：

1. **intel-pull 命令**：采集情报后更新 Obsidian 属性
2. **情报卡片属性更新**：批量更新 `status`、`tags` 等属性
3. **搜索与查询**：在 Obsidian vault 中搜索特定情报卡片
4. **Bases 查询**：通过 `base:query` 导出情报统计数据

**Bases 扩展**：

1. **自定义视图**：用户可手动编辑 `_index.base` 添加更多视图（如按标签过滤、按地域分组）
2. **公式属性**：在 Bases 中添加公式，如计算卡片数量、统计标签分布
3. **Dataview 插件**：如需更复杂查询，可安装 Dataview 插件