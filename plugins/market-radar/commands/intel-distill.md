---
name: intel-distill
description: Extract strategic intelligence from source documents and generate intelligence cards
argument-hint: "[--source <目录>] [--output <目录>] [--review <list|approve|reject> [--pending-id <id>] [--reason <原因>]] [--report <daily|weekly|monthly|annual> [--date <日期>|周期]]"
allowed-tools: Read, Write, Grep, Glob, Bash, Agent
---

## 命令概述

执行情报提取工作流：扫描源文档，分析战略价值，并在输出目录生成情报卡片。

支持从现有情报卡片生成日报/周报/月报简报。

支持审核机制：对待复核的情报进行批准或拒绝。

## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 待扫描的源文件目录（默认：./inbox） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：./intelligence） |
| `--review <action>` | 否 | 审核操作：`list`/`approve`/`reject` |
| `--pending-id <id>` | 条件 | 待审核项 ID（approve/reject 时必填） |
| `--reason <text>` | 条件 | 审核原因（approve/reject 时推荐） |
| `--report <type>` | 否 | 生成情报报告：`daily`/`weekly`/`monthly`/`annual` |
| `--date <YYYY-MM-DD>` | 否 | 日报日期（仅 daily 模式，默认当天） |
| `<period>` | 否 | 周期参数：日报用 `--date`，周报 `YYYY-Wnn`，月报 `YYYY-MM` |
| `--help` | 否 | 显示使用帮助 |

```bash
# === 情报提取模式 ===

# 扫描 inbox/，输出到 intelligence/
/intel-distill

# 扫描指定目录，输出到 intelligence/
/intel-distill --source ./docs

# 扫描 inbox/，输出到指定目录
/intel-distill --output ./reports

# 同时指定源和输出
/intel-distill --source ./docs --output ./reports

# === 审核模式 ===

# 列出所有待审核任务
/intel-distill --review list

# 批准待审核项
/intel-distill --review approve --pending-id pending-threat-20260313-001 --reason "情报准确"

# 拒绝待审核项
/intel-distill --review reject --pending-id pending-emerging-20260313-002 --reason "信息来源不可靠"

# === 报告模式 ===

# 生成当天日报（从现有卡片，按 created_date）
/intel-distill --report daily

# 生成指定日期日报
/intel-distill --report daily --date 2026-04-05

# 生成当前周报（从现有卡片）
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成当前月报
/intel-distill --report monthly

# 生成年报
/intel-distill --report annual

# 生成指定年份年报
/intel-distill --report annual 2026

# 显示帮助
/intel-distill --help
```

**注意**：`--report` 参数仅从现有情报卡片生成报告，不执行新的情报提取。

## 帮助信息

如果用户输入 `--help` 参数，读取并显示帮助文档：

```
使用 Read 工具读取：
${CLAUDE_PLUGIN_ROOT}/commands/references/intel-distill-guide.md

将内容展示给用户，无需执行后续流程。
```

---

## 架构概述

`intel-distill` 采用四层架构设计，实现从源文档到情报卡片的完整处理链路：

```
┌─────────────────────────────────────────────────────────────┐
│                    用户层（User Layer）                      │
├─────────────────────────────────────────────────────────────┤
│  • 用户将文档放入 inbox/                                    │
│  • 执行 /intel-distill --source ./docs                     │
│  • 查看输出统计，了解待审核任务                             │
│  • 执行 /intel-distill --review approve|reject             │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                 预处理层（Preprocessing Layer）              │
├─────────────────────────────────────────────────────────────┤
│  • 扫描待处理文件（inbox/ + 根目录）                         │
│  • 去重检查（基于源文件哈希）                               │
│  • 格式转换（PDF/DOCX → Markdown）                          │
│  • 内容清洗（删除噪声）                                     │
│  • 归档源文件到 archive/YYYY/MM/                           │
│  • 保存转换文件到 converted/YYYY/MM/（含 frontmatter）      │
│  • 转换失败时生成 .error.md 到 inbox/                       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              情报提取层（Intelligence Extraction Layer）     │
├─────────────────────────────────────────────────────────────┤
│  • 扫描转换文件（converted/**/*.md）                        │
│  • 构建处理队列（基于 content_hash）                        │
│  • 调用 intelligence-analyzer Agent                         │
│  • 处理三种情况：                                            │
│    - 明确有价值 → 生成情报卡片                              │
│    - 明确无价值 → 跳过（intelligence_count = 0）            │
│    - 需要复核 → 加入 review.items 队列（不生成卡片）        │
│  • 更新 pending.json 状态文件                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  输出层（Output Layer）                      │
├─────────────────────────────────────────────────────────────┤
│  • 统计预处理结果（扫描、转换、归档）                       │
│  • 统计情报提取结果（生成、跳过、待审核）                   │
│  • 显示待审核任务列表（pending_id、原因、来源）             │
│  • 提供审核命令提示                                         │
└─────────────────────────────────────────────────────────────┘
```

**核心设计原则**：
- **情报卡片独立性**：情报卡片一旦生成，完全独立于源文件和中间产物
- **状态集中管理**：运行时状态集中在 `pending.json`，已处理状态通过文件系统追踪
- **审核分离机制**：待审核不生成卡片，批准后才生成，拒绝后不生成

---

## 目录结构（v3.1）

### 推荐目录布局

```
{root_dir}/                         # 项目根目录（当前目录）
├── inbox/                          # ⭐️ 待处理文档（默认扫描目录）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   ├── vendor-news.pdf
│   └── failed-doc.pdf.error.md     # ⭐️ 转换失败的错误日志
│
├── archive/                        # ⭐️ 已归档文档（固定位置）
│   └── 2026/
│       └── 04/
│           ├── report-2026.pdf
│           ├── ai-article.docx
│           └── vendor-news.pdf
│
├── converted/                      # ⭐️ 转换后的 Markdown（固定位置）
│   └── 2026/
│       └── 04/
│           ├── report-2026.md      # ⭐️ 含 frontmatter 元数据
│           ├── ai-article.md
│           └── vendor-news.md
│
├── intelligence/                   # 情报卡片输出（默认输出目录）
│   ├── Threat-Landscape/
│   │   └── 2026/
│   │       ├── 03/
│   │       │   └── 20260301-apt-activity.md
│   │       └── 04/
│   │           └── 20260402-ransomware-trend.md
│   ├── Industry-Analysis/
│   │   └── 2026/
│   │       └── 04/
│   ├── Vendor-Intelligence/
│   ├── Emerging-Tech/
│   ├── Customer-Market/
│   ├── Policy-Regulation/
│   └── Capital-Investment/
│
└── .intel/                         # ⭐️ 管理目录（固定位置）
    └── pending.json                 # ⭐️ 运行时状态文件
```

### 目录说明

| 目录 | 说明 | 文件命名规则 | 用户可见性 |
|------|------|-------------|-----------|
| `inbox/` | 待处理文档目录 | 保持原名 | ✅ 可见 |
| `inbox/*.error.md` | 转换失败的错误日志 | `{filename}.error.md` | ✅ 可见 |
| `archive/YYYY/MM/` | 已归档文档目录 | 保持原名 | ✅ 可见 |
| `converted/YYYY/MM/` | 转换后的 Markdown（含 frontmatter） | 保持原名（仅改扩展名） | ✅ 可见 |
| `intelligence/{domain}/YYYY/MM/` | 情报卡片（按领域和年月组织） | `{YYYYMMDD}-{subject}-{feature}.md` | ✅ 可见 |
| `.intel/` | 管理目录 | - | ❌ 隐藏 |

### 转换文件格式（v3.1）

转换后的 Markdown 文件包含统一 frontmatter 元数据：

**本地文件示例**：

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

archived_file: "[[archive/2026/04/report.pdf|report.pdf]]"
content_hash: "def456abc123..."
source_hash: "abc789def456..."
archivedAt: "2026-04-08T10:00:00Z"

processed_status: "pending"
processed_at: null
---
```

**cyber-pulse 文件示例**：

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

archived_file: null
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
| `archived_file` | string/null | ✅ | 归档文件链接（WikiLink 格式，cyber-pulse 文件为 null） |
| `content_hash` | string | ✅ | 转换文件 body 内容哈希（用于变更检测） |
| `source_hash` | string | ✅ | 源文件内容哈希（用于去重） |
| `archivedAt` | string | ✅ | 归档时间（ISO 8601） |
| `processed_status` | string | ❌ | 处理状态：pending/passed/rejected |
| `processed_at` | string/null | ❌ | 处理完成时间（ISO 8601） |

**注意**：情报卡片的 frontmatter 格式参见 `intelligence-output-templates` skill。

**元数据继承流程**：

```
intel-pull 采集 → inbox/*.md frontmatter → 预处理转换 → converted/*.md frontmatter → Agent 分析 → 情报卡片
```

对于本地文档（非 cyber-pulse 来源），`author`、`original_url`、`published_at`、`completeness_score` 以及情报源相关字段为 null，这是预期行为。cyber-pulse 文件额外包含 `source_type`、`first_seen_at`、`tags` 等采集阶段字段。

---

## 执行流程

### 步骤 0：参数解析与模式判断

解析命令参数，确定执行模式：

```
参数解析：
- root_dir = 当前目录（固定）
- source_dir = --source 参数或 ./inbox
- output_dir = --output 参数或 ./intelligence
- review_action = --review 参数值（list/approve/reject 或无）
- pending_id = --pending-id 参数值（approve/reject 时需要）
- review_reason = --reason 参数值
- report_type = --report 参数值（weekly/monthly 或无）
- period_param = 周期参数
```

**模式判断**：

| 条件 | 执行模式 | 后续流程 |
|------|---------|---------|
| `--review` 参数存在 | **审核模式** → 执行审核流程（步骤 A1-A3） |
| `--report` 参数存在 | **报告模式** → 执行报告生成流程（步骤 R1-R5） |
| 两者都不存在 | **提取模式** → 执行情报提取流程（步骤 1-8） |

**执行顺序**：提取模式（默认） → 审核模式 → 报告模式

```
┌─────────────────────────────────────────────────────────────┐
│                      参数解析                                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
        默认模式         --review?        --report?
              │               │               │
              ↓               ↓               ↓
        提取模式         审核模式         报告模式
        (步骤 1-8)       (步骤 A)         (步骤 R)
```

---

## 情报提取流程

当 `--review` 和 `--report` 参数都不存在时，执行以下流程：

### 步骤 1：首次运行检测

**目的**：引导用户使用 `inbox/` 目录。

**执行逻辑**：
1. 检测 `source_dir/inbox/` 目录是否存在
2. 如果不存在，显示引导信息
3. 询问用户是否创建 `inbox/` 目录

**输出示例**：
```
🔍 检测到目录结构...
⚠️  未发现 inbox/ 目录

💡 建议:
   创建 inbox/ 目录以获得更好的文件管理体验：
   $ mkdir -p ./docs/inbox

   然后将待处理文件放入 inbox/：
   $ mv *.pdf *.docx ./docs/inbox/

❓ 是否现在创建 inbox/ 目录？(Y/n): Y

✅ 已创建 inbox/ 目录: ./docs/inbox
```

### 步骤 2：初始化路径

```
root_dir = 当前目录（固定）
source_dir = --source 参数或 ./inbox
output_dir = --output 参数或 ./intelligence

# 固定位置（始终在 root_dir 下）
archive_dir = root_dir/archive/YYYY/MM/
converted_dir = root_dir/converted/YYYY/MM/
intel_dir = root_dir/.intel/
pending_file = intel_dir/pending.json
```

### 步骤 3：检查并安装脚本依赖

在执行脚本前，检查 `node_modules` 是否存在：

```bash
检查 ${CLAUDE_PLUGIN_ROOT}/scripts/node_modules 目录是否存在
```

**如果不存在**，自动安装依赖：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm install
```

**输出示例**：
```
📦 正在安装脚本依赖...
Done in 262ms using pnpm v10.33.0
✅ 依赖安装完成
```

### 步骤 4：检查 pending.json

检查 `.intel/pending.json` 是否存在，如不存在则创建默认结构（v3.0.0）。

**状态文件迁移**（首次运行时）：
- 如果存在旧的 `state.json`，提示用户执行迁移
- 迁移命令：`/intel-migrate`
- 迁移脚本会处理 `state.processed` 和 `state.stats` 数据，转换为文件系统状态追踪

### 步骤 5：预处理（格式转换与内容清洗）

#### 5.1 调用预处理脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/index.ts --source {source_dir} --root {root_dir}
```

**输出位置**：
- 归档文件：`{root_dir}/archive/YYYY/MM/`
- 转换文件：`{root_dir}/converted/YYYY/MM/`（含 frontmatter 元数据）
- 错误日志：`{source_dir}/{filename}.error.md`（转换失败时）

#### 5.2 预处理逻辑

脚本会自动：
1. 扫描 `--source` 指定的目录（默认：`./inbox`）
2. 检查已知源文件哈希，跳过重复文件
3. 执行格式转换和噪声清洗
4. 归档源文件到 `{root_dir}/archive/YYYY/MM/`
5. **转换成功**：生成 Markdown 文件到 `{root_dir}/converted/YYYY/MM/`，frontmatter 包含元数据
6. **转换失败**：源文件保留在源目录，生成 `.error.md` 错误日志

#### 5.3 转换失败处理

当文件转换失败时：

```
inbox/
├── failed-doc.pdf           # 源文件保留原位置
└── failed-doc.pdf.error.md  # 可读的错误日志
```

**错误日志格式**：

```markdown
# 文件转换失败

**文件名**: failed-doc.pdf
**处理时间**: 2026-03-15 10:00:00
**错误码**: CONVERSION_FAILED

## 错误原因

[具体错误信息]

## 建议操作

- [ ] 检查文件是否损坏
- [ ] 尝试用其他工具打开

---

修复后删除此文件，重新运行 `/intel-distill`
```

**用户操作**：修复问题后删除 `.error.md` 文件，重新运行命令即可重新处理。

### 步骤 6：扫描转换后的文件

从 `converted/YYYY/MM/` 目录扫描 Markdown 文件。

#### 6.1 扫描策略选择

根据转换文件数量选择扫描策略：

| 待处理文件数量 | 推荐策略 | 原因 |
|--------------|---------|------|
| **< 50 个** | Glob 工具 | 简单直接，无需额外调用 |
| **>= 50 个** | 脚本处理 | 批量处理性能更优 |

#### 6.2 策略 A：Glob 工具（< 50 个文件）

直接使用 Glob 工具扫描：

```bash
glob pattern: {source_dir}/converted/**/*.md
```

然后逐个读取文件、解析 frontmatter 提取 `source_hash`、计算内容 Hash、对比情报卡片 frontmatter。

#### 6.3 策略 B：脚本处理（>= 50 个文件）

调用扫描队列脚本，一次性完成扫描、frontmatter 解析、Hash 计算、状态对比：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/scan-queue.ts \
  --root {root_dir} \
  --output json
```

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
      "archived_file": "[[archive/2026/03/report-2026.pdf|report-2026.pdf]]",
      "status": "needs_processing"
    }
  ],
  "threshold": 50,
  "recommendation": "script"
}
```

**输出字段说明**：

| 字段 | 说明 |
|------|------|
| `total` | 转换文件总数 |
| `already_processed` | 已处理文件数（跳过） |
| `needs_processing` | 待处理文件数 |
| `pending_review` | 已在审核队列的文件数 |
| `queue` | 处理队列详情（含 source_hash、archived_file） | `archived_file` 可为 null（cyber-pulse 文件） |
| `recommendation` | 推荐策略（`glob` 或 `script`） |

#### 6.4 判断逻辑

```
if (needs_processing + pending_review >= 50) {
  使用脚本处理
} else {
  使用 Glob 工具
}
```

#### 6.5 中断恢复机制

**自动检测**：scan-queue.ts 会自动检测中断导致的状态不一致：

| 场景 | 检测方式 | 处理 |
|------|---------|------|
| Agent 写入卡片后被中断 | 情报卡片存在但 processed_status ≠ passed | 自动跳过，记录修复建议 |
| 批量处理中断 | 未处理的文件状态为 pending/null | 下次运行继续处理 |

**状态一致性保证**：

scan-queue.ts 在扫描时会检查情报卡片是否存在，无论 `processed_status` 是什么：

```
如果情报卡片存在 && 内容哈希匹配:
    视为已处理，跳过
    如果 processed_status 不是 passed/rejected:
        记录到 auto_fix 数组（状态不一致，建议修复）
```

**修复建议输出**（如果有状态不一致）：

```
⚠️ 检测到 5 个状态不一致的文件（有卡片但未标记）
   这些文件将被跳过，建议运行修复命令更新状态
```

**中断恢复流程**：

1. 用户执行 `/intel-distill`
2. scan-queue.ts 自动检测已存在的情报卡片
3. 中断的文件被自动跳过
4. 只处理真正需要处理的文件

### 步骤 7：构建处理队列

#### 7.1 调用扫描队列脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/scan-queue.ts \
  --root {root_dir} \
  --output json
```

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
      "archived_file": "[[archive/2026/03/report-2026.pdf|report-2026.pdf]]",
      "status": "needs_processing"
    }
  ]
}
```

#### 7.2 解析队列结果

从脚本输出提取：

| 字段 | 用途 |
|------|------|
| `needs_processing` | 本次待处理文件数 |
| `queue` | 处理队列详情（含 content_hash、source_hash、archived_file） | `archived_file` 可为 null（cyber-pulse 文件） |

**注意**：`total` 和 `already_processed` 是历史统计数据，**不展示给用户**。用户只关心本次待处理文件。

#### 7.3 处理队列输出

```
【本次任务】
• 待处理文件: 271 个
• 批次大小: 5（预计 55 批次）
```

### 步骤 8：分批处理文件

#### 8.1 批次配置

**核心设计**：1 Agent = 1 文件，并发数 = 批次大小

| 参数 | 值 | 说明 |
|------|-----|------|
| 并发数 | 5 | 同时运行的 Agent 数量 |
| 批次大小 | 5 | 每批次处理的文件数（= 并发数） |
| Agent 粒度 | 1 文件 | 每个 Agent 只处理 1 个文件 |

**计算批次数量**：

```
总批次 = ceil(待处理文件数 / 批次大小) = ceil(待处理文件数 / 5)
```

**示例**：

| 待处理文件 | 批次大小 | 总批次 |
|-----------|---------|--------|
| 271 个 | 5 | 55 批次 |
| 15 个 | 5 | 3 批次 |
| 3 个 | 5 | 1 批次 |

#### 8.2 批次处理循环

```
初始化: 
  队列 = scan-queue 返回的 queue 数组
  已完成 = 0
  当前批次 = 0
  累计统计 = {cards: 0, rejected: 0, pending: 0}

批次处理循环:
  while 队列非空:
    当前批次++
    本批次文件 = 从队列取出最多 5 个文件
    
    ┌─────────────────────────────────────────────────────┐
    │  步骤 A: 并行启动 5 个 Agent（每个处理 1 个文件）      │
    │                                                      │
    │  Agent 1 → 处理 file1                               │
    │  Agent 2 → 处理 file2                               │
    │  Agent 3 → 处理 file3                               │
    │  Agent 4 → 处理 file4                               │
    │  Agent 5 → 处理 file5                               │
    └─────────────────────────────────────────────────────┘
    
    步骤 B: 等待所有 Agent 完成
    步骤 C: 收集结果并更新状态
    步骤 D: 累计统计，输出批次进度
    
    已完成 += 本批次文件数
```

#### 8.3 调用情报分析 Agent

使用 Agent 工具，subagent_type="intelligence-analyzer"

**并行执行时**：在单个消息中发起多个 Agent 调用（最多 5 个），由 Claude Code 自动管理并发

> ⚠️ **禁止使用 `run_in_background=true`**
>
> 后台 Agent 运行在独立上下文中，**无法继承父会话的工具权限**（包括 Write）。
> 这会导致情报卡片写入失败，返回 `Permission to use Write has been denied` 错误。
>
> **正确做法**：在单消息中发起多个 Agent 调用（不设置 `run_in_background`），
> Claude Code 会自动并行执行，同时保持权限继承。

**Agent 工具权限**：
- Read: 读取转换后的 Markdown 文件
- Grep: 搜索文档中的关键信息
- Glob: 检查输出目录中的现有文件（去重检测）
- Write: 写入情报卡片文件
- Bash: 执行辅助命令（如日期提取）

**参数**:
- `source`: 转换文件路径
- `output`: 输出目录（情报卡片根目录，如 `./intelligence`）

**Agent 职责**（只负责情报提取，不管理状态）：
- ✅ 读取并分析转换文件
- ✅ 判断战略价值（true/false/null）
- ✅ 生成并写入情报卡片（如有价值）
- ✅ 返回轻量级 JSON 结果
- ❌ **不更新转换文件 frontmatter**
- ❌ **不更新 pending.json**

#### 8.4 收集 Agent 结果

等待本批次所有 Agent 完成，收集返回结果：

**情况 1：明确有价值（`has_strategic_value = true`）**
- 已生成情报卡片
- 记录 `intelligence_ids` 和 `output_files`
- 后续设置 `processed_status = "passed"`

**情况 2：明确无价值（`has_strategic_value = false`）**
- 未生成情报卡片
- `intelligence_ids = []`
- 后续设置 `processed_status = "rejected"`

**情况 3：需要复核（`has_strategic_value = null`）**
- 未生成情报卡片
- 后续添加到 `review.items` 队列

#### 8.5 更新状态

**执行时机**：每批次 Agent 完成后立即执行

**命令层职责**：

1. 从内存中保存的 scan-queue 结果获取 `archived_file`（如 Agent 未返回且需要）

2. 合并 Agent 结果，构造 JSON 数组

3. 调用 update-state.ts 更新状态：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/update-state.ts \
  --root {root_dir} \
  --results '{json_array}'
```

**输入 JSON 格式**（简化版，仅包含必要字段）：

```json
[
  {
    "source_file": "converted/2026/04/xxx.md",
    "has_strategic_value": true,
    "intelligence_count": 2,
    "intelligence_ids": ["threat-20260407-xxx", "emerging-20260407-xxx"],
    "output_files": ["intelligence/Threat-Landscape/2026/04/20260407-xxx.md"]
  },
  {
    "source_file": "converted/2026/04/notes.md",
    "has_strategic_value": false,
    "intelligence_count": 0,
    "intelligence_ids": [],
    "output_files": []
  },
  {
    "source_file": "converted/2026/04/suspicious.md",
    "has_strategic_value": null,
    "intelligence_count": 0,
    "intelligence_ids": [],
    "output_files": [],
    "review_reason": "检测到高风险威胁指标，需人工确认",
    "domain": "Threat-Landscape",
    "archived_source": "archive/2026/04/suspicious.pdf"
  }
]
```

**字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `source_file` | ✅ | 转换文件路径 |
| `has_strategic_value` | ✅ | true=有价值，false=无价值，null=待审核 |
| `intelligence_count` | ✅ | 生成的情报卡片数量 |
| `intelligence_ids` | ✅ | 情报卡片 ID 数组 |
| `output_files` | ✅ | 情报卡片文件路径数组 |
| `review_reason` | 条件 | 待审核原因（has_strategic_value=null 时必填） |
| `domain` | 条件 | 领域（待审核时用于生成 pending_id） |
| `archived_source` | 条件 | 归档文件路径（待审核时用于 pending.json） |

**update-state.ts 执行内容**：
- 更新转换文件 frontmatter: `processed_status`（passed/rejected）、`processed_at`
- 更新 pending.json: 添加 `review.items`（仅待审核项）

#### 8.6 输出批次进度

每批次完成后输出：

```
📊 批次 3/55 完成: 已处理 15/271 个文件
   ✅ 生成情报卡片: 3 张
   ⏭️ 无价值跳过: 1 个
   📋 待审核: 1 个
```

#### 8.7 失败处理

**Agent 失败处理**：

| 场景 | 处理方式 | 状态更新 |
|------|---------|---------|
| Agent 返回 `status: "error"` | 标记为失败，继续处理其他文件 | `processed_status = "error"` |
| Agent 超时（> 5 分钟） | 重试 1 次，仍失败则标记 error | `processed_status = "error"` |
| Agent 写入情报卡片失败 | 返回 error 状态 | `processed_status = "error"` |

**update-state.ts 失败处理**：

| 场景 | 处理方式 |
|------|---------|
| 转换文件不存在 | 跳过该文件，输出警告 |
| JSON 格式错误 | 输出错误信息，中断流程 |
| 文件写入失败 | 输出错误信息，中断流程 |

**错误输出示例**：

```
⚠️ Agent 处理失败: converted/2026/04/file5.md
   错误: ANALYSIS_FAILED - Unable to extract meaningful content
   操作: 已标记为 error，继续处理其他文件
```

### 步骤 9：统一输出统计

**输出格式**：
```
════════════════════════════════════════════════════════
📊 情报提取执行报告
════════════════════════════════════════════════════════

【本次任务】
• 待处理文件: 271 个
• 批次进度: 55/55 批次完成
• 已处理: 271/271 个文件

【处理结果】
• 生成情报卡片: 252 张 ✅
• 无价值跳过: 15 个
• 待人工审核: 4 个
• 处理失败: 0 个

【领域分布】
• Threat-Landscape: 128 张
• Emerging-Tech: 68 张
• Industry-Analysis: 42 张
• Vendor-Intelligence: 14 张

💡 操作提示:
   /intel-distill --review list
   /intel-distill --report weekly

════════════════════════════════════════════════════════
```

**如有处理失败的文件**：

```
【处理结果】
• 生成情报卡片: 250 张 ✅
• 无价值跳过: 15 个
• 待人工审核: 4 个
• 处理失败: 2 个 ⚠️

⚠️ 处理失败的文件:
   - converted/2026/04/file5.md: ANALYSIS_FAILED
   - converted/2026/04/file12.md: TIMEOUT
   请检查日志后手动处理
```

---

## 审核模式流程

当 `--review` 参数存在时，执行以下流程：

### 步骤 A1：列出待审核（`--review list`）

1. 读取 `pending.json` 的 `review.items` 队列
2. 对每个待审核项，显示：
   - `pending_id`
   - 来源文件（归档路径）
   - 转换文件（转换路径）
   - 审核原因
   - 添加时间

**输出示例**：
```
📋 待审核情报卡片 (2 个)

1. pending_id: pending-threat-20260313-001
   来源文件: archive/2026/03/report-2026.pdf
   转换文件: converted/2026/03/report-2026.md
   原因: 检测到高风险威胁指标，需人工确认
   添加时间: 2026-03-13 10:00:00

2. pending_id: pending-emerging-20260313-002
   来源文件: archive/2026/03/ai-article.docx
   转换文件: converted/2026/03/ai-article.md
   原因: AI 安全新技术，需人工评估价值
   添加时间: 2026-03-13 10:05:00

💡 操作:
   /intel-distill --review approve --pending-id <pending_id> --reason "原因"
   /intel-distill --review reject --pending-id <pending_id> --reason "原因"
```

### 步骤 A2：批准审核（`--review approve --pending-id <id> --reason`）

**⚠️ 重要：批准审核需要命令层按顺序执行多个操作**

#### 步骤 A2.1：列出待审核项

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/update-state.ts \
  --root {root_dir} \
  --review list
```

从输出中获取 `pending_id`、`converted_file`、`archived_file`。

#### 步骤 A2.2：检查并恢复转换文件

检查转换文件是否存在：

```bash
# 检查文件
ls -la {root_dir}/{converted_file}
```

如果文件不存在，从归档恢复：

```bash
# 从归档重新转换
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/index.ts \
  --source {archived_file 的父目录} \
  --root {root_dir}
```

#### 步骤 A2.3：调用 Agent 生成情报卡片

```
使用 Agent 工具，subagent_type="intelligence-analyzer"

参数:
- source: {converted_file}（转换文件路径）
- output: {output_dir}（情报卡片输出目录）
```

**Agent 职责**（只负责情报提取，不更新状态）：
- ✅ 分析转换文件内容
- ✅ 生成情报卡片到 `{output}/{domain}/{YYYY}/{MM}/`
- ✅ 返回 JSON 结果
- ❌ **不更新转换文件 frontmatter**
- ❌ **不更新 pending.json**

**Agent 返回示例**：

```json
{
  "status": "success",
  "source_file": "converted/2026/04/file4.md",
  "has_strategic_value": true,
  "intelligence_count": 1,
  "intelligence_ids": ["threat-20260407-003"],
  "output_files": ["intelligence/Threat-Landscape/2026/04/20260407-apt-activity.md"],
  "domain": "Threat-Landscape"
}
```

#### 步骤 A2.4：命令层更新状态

Agent 成功后，命令层调用 update-state.ts 更新状态：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/update-state.ts \
  --root {root_dir} \
  --review approve \
  --pending-id {pending_id} \
  --reason "{reason}"
```

**update-state.ts 执行内容**：
- 更新转换文件 frontmatter: `processed_status = "passed"`
- 从 `pending.json` 的 `review.items` 中移除该项
- 保存 pending.json

**输出示例**：
```
✅ 已批准: pending-threat-20260313-001
   • 情报卡片已生成: threat-20260313-001
   • 输出位置: ./intelligence/threat-intelligence/20260313-ransomware-trend.md
   • 批准原因已记录（正样本反馈）
```

### 步骤 A3：拒绝审核（`--review reject --pending-id <id> --reason`）

拒绝审核不需要调用 Agent，直接更新状态：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx preprocess/update-state.ts \
  --root {root_dir} \
  --review reject \
  --pending-id {pending_id} \
  --reason "{reason}"
```

**update-state.ts 执行内容**：
- 更新转换文件 frontmatter: `processed_status = "rejected"`
- 从 `pending.json` 的 `review.items` 中移除该项
- **不生成情报卡片**

**输出示例**：
```
✅ 已拒绝: pending-emerging-20260313-002
   • 不生成情报卡片
   • 拒绝原因已记录（负样本反馈）
```

---

## 报告生成流程

当 `--report` 参数存在时，执行以下流程：

### 步骤 R1：检查脚本依赖

在执行脚本前，检查 `node_modules` 是否存在：

```bash
检查 ${CLAUDE_PLUGIN_ROOT}/scripts/node_modules 目录是否存在
```

**如果不存在**，自动安装依赖：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm install
```

**输出示例**：
```
📦 正在安装脚本依赖...
Done in 262ms using pnpm v10.33.0
✅ 依赖安装完成
```

### 步骤 R2：确定报告类型和周期

根据 `--report` 参数确定：

| 报告类型 | 主输入 | Agent |
|----------|--------|-------|
| daily | 情报卡片 | intelligence-daily-writer |
| weekly | 日报集合 | intelligence-weekly-writer |
| monthly | 周报集合 | intelligence-monthly-writer |
| annual | 月报+周报集合 | intelligence-annual-writer |

### 步骤 R3：扫描输入数据

**日报模式**：
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-cards.ts \
  --period daily --date {date} --format agent --output-dir {output_dir}
```

**关键设计**：
- 命令层不读取卡片内容，直接传递路径列表给 Agent
- `--format agent` 输出轻量元数据（无正文摘要）

**周报模式**：
```bash
# 1. 扫描本周日报
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-reports.ts \
  --type daily --start {week_start} --end {week_end} --output-dir {output_dir}

# 2. 扫描本周情报卡片（用于主题提炼）
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-cards.ts \
  --period weekly --param {week_param} --format agent --output-dir {output_dir}
```

**月报模式**：
```bash
# 扫描本月周报
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-reports.ts \
  --type weekly --start {month_start} --end {month_end} --output-dir {output_dir}
```

- 加载态势索引：读取 `.intel/situations.json`

**年报模式**：
```bash
# 扫描本年月报和周报
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx reporting/scan-reports.ts \
  --type monthly --start {year_start} --end {year_end} --output-dir {output_dir}
```

- 加载态势索引：读取 `.intel/situations.json`

### 步骤 R4：调用 Agent 生成报告

使用 Agent 工具调用对应的报告撰写 Agent。

**日报模式**：
```
使用 Agent 工具，subagent_type="intelligence-daily-writer"

Prompt 内容：
生成情报日报：

**cards_list**: {scan_script_output}
**output_dir**: {output_dir}
**date**: {date}

提示：
1. 根据 cards_list 中的 card_path 使用 Read 工具读取需要的卡片
2. 重点关注候选使用 security_relevance 和 metadata 筛选
3. 只读取必要的卡片，避免过度使用 Read
```

**周报模式**：
```
使用 Agent 工具，subagent_type="intelligence-weekly-writer"

Prompt 内容：
生成情报周报：

**period**: {week_param}
**date_range**: {"start": "{week_start}", "end": "{week_end}"}
**daily_reports**: {reports_scan_output.reports}（日报路径列表）
**intelligence_cards**: {cards_scan_output.cards}（情报卡片列表）
**output_dir**: {output_dir}

提示：
1. 使用 Read 工具读取日报全文，提炼主题
2. intelligence_cards 用于辅助主题发现和跨日关联分析
3. 每个主题标注变化类型
```

**月报模式**：
```
使用 Agent 工具，subagent_type="intelligence-monthly-writer"

Prompt 内容：
生成情报月报：

**period**: {month_param}
**date_range**: {"start": "{month_start}", "end": "{month_end}"}
**weekly_reports**: {reports_scan_output.reports}（周报路径列表）
**previous_situations**: {situations_index}（态势索引）
**output_dir**: {output_dir}

提示：
1. 使用 Read 工具读取周报全文，识别态势变化
2. 追踪态势状态（新态势/持续/减弱/消退）
```

**年报模式**：
```
使用 Agent 工具，subagent_type="intelligence-annual-writer"

Prompt 内容：
生成年报：

**period**: {year_param}
**monthly_reports**: {monthly_reports_scan_output.reports}
**weekly_reports**: {weekly_reports_scan_output.reports}
**situations_index**: {situations_index}
**output_dir**: {output_dir}
```

### 步骤 R5：显示报告

将生成的报告内容展示给用户。

**日报**：
```
✅ 情报日报已生成

报告文件: {output}/reports/daily/{date}-daily.md

--- 报告内容 ---
```

**周报**：
```
✅ 情报周报已生成

报告文件: {output}/reports/weekly/{week_param}-weekly.md

--- 报告内容 ---
```

**月报**：
```
✅ 情报月报已生成

报告文件: {output}/reports/monthly/{month_param}-monthly.md

--- 报告内容 ---
```

**年报**：
```
✅ 情报年报已生成

报告文件: {output}/reports/annual/{year_param}-annual.md

--- 报告内容 ---
```

[展示报告 Markdown 内容]
```

---

## 去重机制

### 源文件去重（预处理阶段）

1. 计算新源文件的 MD5 哈希
2. 扫描 `converted/**/*.md` 文件 frontmatter 中的 `source_hash`
3. 如果哈希已存在，标记为重复文件
4. 重复文件仍然归档（保留用户操作），但不重复转换

### 内容变更检测（情报提取阶段）

1. 计算转换文件的 content_hash（正文内容的 MD5）
2. 对比情报卡片 frontmatter 中的 `converted_content_hash`
3. 相同则跳过，不同则重新处理

---

## 状态管理（v3.1）

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
        "archived_file": "[[archive/2026/04/report.pdf|report.pdf]]",
        "added_at": "2026-04-06T10:00:00Z",
        "reason": "检测到高风险威胁指标，需人工确认"
      }
    ]
  },
  "pulse": {
    "cursors": {
      "securityweekly": {
        "last_fetched_at": "2026-04-06T10:00:00Z",
        "last_item_id": "abc123",
        "last_pull": "2026-04-06T10:05:00Z",
        "total_synced": 42
      }
    }
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 状态文件格式版本（如 "1.0.0"） |
| `updated_at` | string | 最后更新时间（ISO 8601 格式） |
| `review.items` | array | 待审核队列 |
| `review.items[].pending_id` | string | 临时 ID（格式：`pending-{domain}-{timestamp}-{random}`） |
| `review.items[].converted_file` | string | 转换文件路径 |
| `review.items[].archived_source` | string | 归档文件路径（待审核时记录） |
| `review.items[].added_at` | string | 添加时间 |
| `review.items[].reason` | string | 审核原因 |
| `pulse.cursors` | object | cyber-pulse API 游标（用于增量拉取） |

### 已处理状态追踪

已处理状态通过文件系统追踪：

1. **转换文件 frontmatter**：`processed_status` 字段
   - `pending`：待处理（新文件）
   - `passed`：已处理，有情报卡片
   - `rejected`：已拒绝（无价值或用户拒绝）

2. **情报卡片 frontmatter**：`converted_file` + `converted_content_hash`
   - `converted_file`：确认卡片来源
   - `converted_content_hash`：检测转换文件内容变更

### 状态迁移

从旧版 `state.json` 迁移到 `pending.json`：

```bash
/intel-migrate
```

迁移脚本会：
- 将 `state.review.pending` 转移到 `pending.json` 的 `review.items`
- 将 `state.pulse.cursors` 转移到 `pending.json`
- 将 `state.processed` 数据写入转换文件 frontmatter
- 删除旧的 `state.json`（用户确认后）

---

## 边缘情况处理

| 场景 | 处理策略 | 说明 |
|------|---------|------|
| **转换失败** | 保留源文件在 `inbox/`，不归档 | 用户可见，便于排查 |
| **归档文件被删除** | 记录警告，不影响其他文件处理 | frontmatter 中的路径失效，但不影响流程 |
| **转换文件被删除** | 审核时从 `archive/` 恢复并重新转换 | 自动恢复，无需用户干预 |
| **同名文件** | 基于哈希判断：相同 = 跳过，不同 = 覆盖 | 避免冲突 |
| **用户删除 `inbox/`** | 向后兼容，支持根目录文件 | 不强制使用 `inbox/` |
| **pending.json 损坏** | 备份旧文件，创建新状态文件 | 从现有文件重建 |
| **Agent 超时** | 重试一次，然后标记为失败 | 记录失败原因 |

---

## 错误处理

| 错误 | 操作 |
|------|------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Agent 返回 error | 记录错误信息，标记为失败 |
| Agent 超时 | 重试一次，然后标记为失败 |
| pending.json 读取失败 | 备份旧文件，创建新状态 |

## 关联 Skills

`intelligence-analyzer` agent 预加载以下 skills：
- **cybersecurity-domain-knowledge** - 七大情报领域定义和关键词
- **intelligence-analysis-methodology** - 战略价值判断标准和提取原则
- **intelligence-output-templates** - 情报卡片模板

## Schema 校验

使用 `validate-json.ts` 脚本进行 JSON Schema 校验：

```bash
# 校验 Agent 返回结果
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx validate-json.ts agent-result ./temp/result.json

# 校验 pending.json
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm exec tsx validate-json.ts pending ./.intel/pending.json
```

**校验时机**：

| 时机 | Schema | 说明 |
|------|--------|------|
| Agent 返回后 | `agent-result` | 校验轻量返回格式 |
| 启动时 | `pending` | 校验现有 pending.json |
| 写入前 | `pending` | 校验新状态 |

**支持的 Schema**：

| Schema 名称 | 文件 | 说明 |
|------------|------|------|
| `agent-result` | `agent-result.schema.json` | Agent 返回结果格式 |
| `pending` | `pending.schema.json` | pending.json 状态文件格式 |
| `intelligence-output` | `intelligence-output.schema.json` | 情报卡片输出格式 |
| `themes-config` | `themes-config.schema.json` | 主题配置格式 |
| `theme-state` | `theme-state.schema.json` | 主题状态格式 |

## 注意事项

- Agent 负责分析文档、生成情报卡片、返回 JSON 结果（不更新状态）
- 命令层负责调用 update-state.ts 更新转换文件 frontmatter 和 pending.json
- 状态通过文件系统追踪，pending.json 仅存储运行时数据
- 删除源文件或转换文件后，情报卡片仍保留（frontmatter 包含追溯信息）
- 重新加入历史文件时会检测重复（基于转换文件 frontmatter 的 source_hash）
- 建议将 `.intel/` 添加到 `.gitignore`
- 转换失败的文件保留在 `inbox/`，查看 `.error.md` 了解原因
- 情报卡片数量不设上限，根据源文档实际内容和情报价值决定（详见 `intelligence-analysis-methodology` skill）
- 情报卡片文件命名格式：`{YYYYMMDD}-{subject}-{feature}.md`
  - `YYYYMMDD`：情报日期（源文件发布日期）
  - `subject`：主体/对象（简短英文 kebab-case）
  - `feature`：核心特征/动作（简短英文 kebab-case）
  - 示例：`20260301-lockbit-ransomware-surge.md`
  - 详细规则参见 `intelligence-output-templates/references/templates.md` 中的 File Naming Rules