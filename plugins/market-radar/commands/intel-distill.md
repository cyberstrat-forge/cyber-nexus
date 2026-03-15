---
name: intel-distill
description: Extract strategic intelligence from source documents and generate intelligence cards
argument-hint: "[--source <目录>] [--output <目录>] [--review <list|approve|reject> [pending_id] [--reason <原因>]] [--report <weekly|monthly> [周期]]"
allowed-tools: Read, Write, Grep, Glob, Bash, Agent
---

## 命令概述

执行情报提取工作流：扫描源文档，分析战略价值，并在输出目录生成情报卡片。

支持从现有情报卡片生成周报/月报简报。

支持审核机制：对待复核的情报进行批准或拒绝。

## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 包含文档的源目录（默认：当前目录） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：当前目录） |
| `--review <action>` | 否 | 审核操作：`list`/`approve`/`reject` |
| `--reason <text>` | 条件 | 审核原因（approve/reject 时推荐） |
| `--report <type> [period]` | 否 | 生成情报简报：`weekly`/`monthly` |
| `--help` | 否 | 显示使用帮助 |

```bash
# === 情报提取模式 ===

# 处理当前目录下的所有文档
/intel-distill

# 处理指定目录下的文档
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence

# === 审核模式 ===

# 列出所有待审核任务
/intel-distill --review list

# 批准待审核项
/intel-distill --review approve pending-threat-20260313-001 --reason "情报准确"

# 拒绝待审核项
/intel-distill --review reject pending-emerging-20260313-002 --reason "信息来源不可靠"

# === 报告模式 ===

# 生成当前周报（从现有卡片）
/intel-distill --report weekly

# 生成指定周报
/intel-distill --report weekly 2026-W10

# 生成当前月报
/intel-distill --report monthly

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
│    - 需要复核 → 加入 review.pending 队列（不生成卡片）      │
│  • 更新 state.json 状态文件                                 │
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
- **状态集中管理**：所有状态集中在 `state.json`，无冗余队列
- **审核分离机制**：待审核不生成卡片，批准后才生成，拒绝后不生成

---

## 目录结构（v2.1）

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

### 目录说明

| 目录 | 说明 | 文件命名规则 | 用户可见性 |
|------|------|-------------|-----------|
| `inbox/` | 待处理文档目录 | 保持原名 | ✅ 可见 |
| `inbox/*.error.md` | 转换失败的错误日志 | `{filename}.error.md` | ✅ 可见 |
| `archive/YYYY/MM/` | 已归档文档目录 | 保持原名 | ✅ 可见 |
| `converted/YYYY/MM/` | 转换后的 Markdown（含 frontmatter） | 保持原名（仅改扩展名） | ✅ 可见 |
| `intelligence/` | 情报卡片输出 | `{YYYYMMDD}-{subject}-{feature}.md` | ✅ 可见 |
| `.intel/` | 管理目录 | - | ❌ 隐藏 |

### 转换文件格式（v2.1）

转换后的 Markdown 文件包含 frontmatter 元数据：

```markdown
---
sourceHash: "abc123def456..."
originalPath: "inbox/report-2026.pdf"
archivedAt: "2026-03-15T10:00:00Z"
archivedSource: "archive/2026/03/report-2026.pdf"
---

# 文档内容...
```

**frontmatter 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sourceHash` | string | 源文件 MD5 哈希（用于去重） |
| `originalPath` | string | 源文件原始路径（相对于 source_dir） |
| `archivedAt` | string | 归档时间（ISO 8601 格式） |
| `archivedSource` | string | 归档文件路径 |

---

## 执行流程

### 步骤 0：参数解析与模式判断

解析命令参数，确定执行模式：

```
参数解析：
- source = --source 参数值
- output = --output 参数值或当前目录
- review_action = --review 参数值（list/approve/reject 或无）
- review_target = 审核目标 pending_id
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
source_dir = --source 参数或当前目录
output_dir = --output 参数或 source_dir 或当前目录
intel_dir = output_dir/.intel/
state_file = intel_dir/state.json
```

### 步骤 3：加载或创建状态文件

读取 `state.json`，如不存在则创建默认结构（v2.0.0）。

**状态文件版本迁移**：
- 如果 `version` 为 `1.0` 或 `1.x`，执行迁移到 `2.0.0`
- 添加 `review.pending` 数组
- 更新 `processed` 条目格式（添加 `intelligence_ids` 数组）

### 步骤 4：预处理（格式转换与内容清洗）

#### 4.1 调用预处理脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx preprocess/index.ts --source {source_dir}
```

**输出位置**：
- 归档文件：`{source_dir}/archive/YYYY/MM/`
- 转换文件：`{source_dir}/converted/YYYY/MM/`（含 frontmatter 元数据）
- 错误日志：`{source_dir}/inbox/{filename}.error.md`（转换失败时）

#### 4.2 预处理逻辑

脚本会自动：
1. 优先扫描 `inbox/` 目录
2. 兼容扫描根目录（跳过 `inbox/`、`archive/`、`converted/`）
3. 检查已知源文件哈希，跳过重复文件
4. 执行格式转换和噪声清洗
5. 归档源文件到 `archive/YYYY/MM/`
6. **转换成功**：生成 Markdown 文件到 `converted/YYYY/MM/`，frontmatter 包含元数据
7. **转换失败**：源文件保留在 `inbox/`，生成 `.error.md` 错误日志

#### 4.3 转换失败处理

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

### 步骤 5：扫描转换后的文件

从 `converted/YYYY/MM/` 目录扫描 Markdown 文件。

#### 5.1 扫描策略选择

根据转换文件数量选择扫描策略：

| 待处理文件数量 | 推荐策略 | 原因 |
|--------------|---------|------|
| **< 50 个** | Glob 工具 | 简单直接，无需额外调用 |
| **>= 50 个** | 脚本处理 | 批量处理性能更优 |

#### 5.2 策略 A：Glob 工具（< 50 个文件）

直接使用 Glob 工具扫描：

```bash
glob pattern: {source_dir}/converted/**/*.md
```

然后逐个读取文件、解析 frontmatter 提取 `sourceHash`、计算内容 Hash、对比 state。

#### 5.3 策略 B：脚本处理（>= 50 个文件）

调用扫描队列脚本，一次性完成扫描、frontmatter 解析、Hash 计算、状态对比：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx preprocess/scan-queue.ts \
  --source {source_dir} \
  --state {source_dir}/.intel/state.json \
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
      "archived_source": "archive/2026/03/report-2026.pdf",
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
| `queue` | 处理队列详情（含 source_hash、archived_source） |
| `recommendation` | 推荐策略（`glob` 或 `script`） |

#### 5.4 判断逻辑

```
if (needs_processing + pending_review >= 50) {
  使用脚本处理
} else {
  使用 Glob 工具
}
```

### 步骤 6：构建处理队列

#### 6.1 解析 frontmatter 提取元数据

从转换文件的 frontmatter 中提取：

| 字段 | 来源 | 用途 |
|------|------|------|
| `sourceHash` | frontmatter | 去重检测、写入情报卡片 |
| `archivedSource` | frontmatter | 传递给 Agent、写入情报卡片 |

#### 6.2 计算文件内容 Hash

使用 MD5 算法计算转换后文件的内容哈希（用于变更检测）。

#### 6.3 变更检测逻辑

| 条件 | 操作 |
|------|------|
| content_hash 相同 | 跳过（无变更） |
| content_hash 不同 | 加入队列（内容变更） |
| 新文件（无记录） | 加入队列 |
| review_status = pending | 跳过（已在审核队列） |

#### 6.4 去重检测

扫描 `state.json` 中已记录的 `source_hash`，跳过已处理的相同源文件。

#### 6.5 处理队列输出

```
【处理队列】
• 已处理（跳过）: 10 个
• 待处理: 4 个
• 已在审核队列: 1 个
• 转换失败: 1 个（见 inbox/*.error.md）
```

### 步骤 7：处理文件

#### 7.1 选择执行策略

根据待处理文件数量：

| 文件数量 | 执行策略 | 说明 |
|---------|---------|------|
| ≤ 3 个 | 顺序执行 | 开销小，无需并行 |
| > 3 个 | 并行执行 | 在单个消息中发起多个 Agent 调用 |

#### 7.2 调用情报分析 Agent

使用 Agent 工具，subagent_type="intelligence-analyzer"

**并行执行时**：在单个消息中发起多个 Agent 调用，由 Claude Code 自动管理并发

**Agent 工具权限**：
- Read: 读取转换后的 Markdown 文件
- Grep: 搜索文档中的关键信息
- Glob: 检查输出目录中的现有文件（去重检测）
- Write: 写入情报卡片文件
- Bash: 执行辅助命令（如日期提取）

**参数**:
- `source`: 转换文件路径（Agent 从 frontmatter 读取 sourceHash、archivedSource）
- `output`: 输出目录
- `session_id`: 会话 ID

**Agent 职责**：
- 从 frontmatter 解析元数据（sourceHash、archivedSource）
- 分析文档，提取情报
- 写入情报卡片文件（frontmatter 包含 sourceHash、archivedSource）
- 返回轻量级 JSON 结果（不更新 state.json）

#### 7.3 收集结果并分类

等待所有 Agent 完成，收集返回结果并分类：

**情况 1：明确有价值（`has_strategic_value = true`）**
- 已生成情报卡片
- 记录 `intelligence_ids` 和 `output_files`
- `review_status = null`（无需审核）

**情况 2：明确无价值（`has_strategic_value = false`）**
- 未生成情报卡片
- `intelligence_ids = []`
- `intelligence_count = 0`
- `review_status = null`

**情况 3：需要复核（`has_strategic_value = null`）**
- 未生成情报卡片
- 添加到待审核队列
- 分配临时 `pending_id`（格式：`pending-{domain}-{timestamp}`）
- `review_status = "pending"`

#### 7.4 统一更新状态文件

所有 Agent 完成后，一次性更新 `state.json`：
- 更新 `processed` 记录
- 更新 `review.pending` 队列
- 更新 `stats` 统计

### 步骤 8：统一输出统计

**输出格式**：
```
════════════════════════════════════════════════════════
📊 情报提取执行报告
════════════════════════════════════════════════════════

【预处理统计】
• 扫描到文件: 15 个
• 转换成功: 14 个
• 转换失败: 1 个（保留在 inbox/）
• 重复文件: 2 个（已跳过）
• 归档位置: ./archive/2026/03/
• 转换文件: ./converted/2026/03/

【情报提取统计】
• 处理文件: 14 个
• 生成情报卡片: 12 个  ⭐️（自动批准）
• 待用户复核: 0 个
• 无价值文件: 2 个
• 情报卡片位置: ./intelligence/

【领域分布】
• threat-intelligence: 3 张
• market-trends: 2 张
• technology-innovation: 6 张
• strategic-planning: 1 张

💡 操作提示:
   /intel-distill --review list
   /intel-distill --report weekly

⚠️ 转换失败的文件保留在 inbox/，请查看 .error.md 文件了解详情
════════════════════════════════════════════════════════
```

---

## 审核模式流程

当 `--review` 参数存在时，执行以下流程：

### 步骤 A1：列出待审核（`--review list`）

1. 读取 `state.json` 的 `review.pending` 队列
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
   /intel-distill --review approve <pending_id> --reason "原因"
   /intel-distill --review reject <pending_id> --reason "原因"
```

### 步骤 A2：批准审核（`--review approve <pending_id> --reason`）

1. **查找待审核项**
   - 从 `state.review.pending` 中查找 `pending_id`
   - 如果不存在，报错退出

2. **检查转换文件**
   - 检查 `converted_file` 是否存在
   - 如果不存在，执行转换文件恢复流程：
     - 从 `archived_source` 复制归档文件到临时位置
     - 重新执行转换（调用 `preprocess/index.ts`）
     - 保存转换文件到原路径

3. **调用 Agent 生成情报卡片**
   - 调用 `intelligence-analyzer` Agent
   - 参数：`source`（转换文件路径）、`output`（输出目录）、`session_id`（会话 ID）
   - Agent 从转换文件 frontmatter 读取 `sourceHash` 和 `archivedSource`
   - Agent 返回正式 `intelligence_id`

4. **更新状态文件**
   - 在 `state.processed` 中更新：
     - `intelligence_id`（正式 ID）
     - `review_status = "approved"`
     - `reviewed_at`（当前时间）
     - `approved_reason`
     - `reviewed_by = "user"`
   - 从 `state.review.pending` 中移除该待审核项

**输出示例**：
```
⚠️  转换文件不存在: converted/2026/03/report-2026.md
   尝试从归档文件恢复...
   重新转换: report-2026.pdf
   ✅ 转换文件已恢复: converted/2026/03/report-2026.md

✅ 已批准: pending-threat-20260313-001
   • 情报卡片已生成: threat-20260313-001
   • 输出位置: ./intelligence/threat-intelligence/20260313-ransomware-trend.md
   • 批准原因已记录（正样本反馈）
```

### 步骤 A3：拒绝审核（`--review reject <pending_id> --reason`）

1. **查找待审核项**
   - 从 `state.review.pending` 中查找 `pending_id`
   - 如果不存在，报错退出

2. **更新状态文件**
   - 不调用 Agent（不生成情报卡片）
   - 在 `state.processed` 中更新：
     - `intelligence_id = null`
     - `intelligence_count = 0`
     - `review_status = "rejected"`
     - `reviewed_at`（当前时间）
     - `rejected_reason`
     - `reviewed_by = "user"`
   - 从 `state.review.pending` 中移除该待审核项

**输出示例**：
```
✅ 已拒绝: pending-emerging-20260313-002
   • 不生成情报卡片
   • 拒绝原因已记录（负样本反馈）
```

---

## 报告生成流程

当 `--report` 参数存在时，执行以下流程：

### 步骤 R1：调用扫描脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx reporting/scan-cards.ts \
  --period {report_type} \
  --param "{period_param}" \
  --output-dir {output}
```

### 步骤 R2：解析扫描结果

读取扫描脚本输出的 JSON 结果，提取情报卡片列表。

### 步骤 R3：检查卡片列表

| 条件 | 操作 |
|------|------|
| `cards.length == 0` | 输出"本周/月无情报卡片"，结束流程 |
| `cards.length > 0` | 继续生成报告 |

### 步骤 R4：调用情报简报 Agent

```
使用 Agent 工具，subagent_type="intelligence-briefing-writer"
参数: card_list（扫描结果）, output_dir, report_date（当前日期）
```

### 步骤 R5：显示报告位置和内容

1. 显示报告文件位置
2. 使用 Read 工具读取报告内容并展示给用户

```
✅ 情报简报已生成

报告文件: {output}/reports/{period}/{period_param}-briefing.md

--- 报告内容 ---

[展示报告 Markdown 内容]
```

---

## 去重机制

### 源文件去重（预处理阶段）

1. 计算新源文件的 MD5 哈希
2. 扫描 `converted/**/*.md` 文件 frontmatter 中的 `sourceHash`
3. 如果哈希已存在，标记为重复文件
4. 重复文件仍然归档（保留用户操作），但不重复转换

### 内容变更检测（情报提取阶段）

1. 计算转换文件的 content_hash（正文内容的 MD5）
2. 对比 `state.json` 中记录的 `content_hash`
3. 相同则跳过，不同则重新处理

---

## 状态文件设计（v2.0）

### 状态文件结构

**文件位置**：`.intel/state.json`

```json
{
  "$schema": "https://cyberstrat-forge.github.io/cyber-nexus/schemas/state.schema.json",
  "version": "2.1.0",
  "updated_at": "2026-03-13T15:25:00+08:00",

  "queue": {
    "processing": {}
  },

  "review": {
    "pending": [
      {
        "pending_id": "pending-threat-intelligence-20260313-001",
        "converted_file": "converted/2026/03/report-2026.md",
        "archived_source": "archive/2026/03/report-2026.pdf",
        "added_at": "2026-03-13T10:00:00Z",
        "reason": "检测到高风险威胁指标，需人工确认"
      }
    ]
  },

  "processed": {
    "converted/2026/03/report-2026.md": {
      "content_hash": "abc123def456789...",
      "source_hash": "fed987cba654321...",
      "processed_at": "2026-03-13T15:18:00+08:00",
      "intelligence_count": 2,
      "intelligence_ids": [
        "threat-intelligence-20260313-001",
        "threat-intelligence-20260313-002"
      ],
      "output_files": [
        "threat-intelligence/20260313-ransomware-trend.md",
        "threat-intelligence/20260313-apt-activity.md"
      ],
      "session": "20260313-151800",
      "archived_source": "archive/2026/03/report-2026.pdf",
      "archived_exists": true,
      "converted_exists": true,
      "review_status": null
    }
  },

  "stats": {
    "preprocess": {
      "scanned": 15,
      "converted": 14,
      "failed": 1,
      "duplicates": 2
    },
    "intelligence": {
      "processed": 14,
      "cards_generated": 12,
      "pending_review": 1,
      "no_value": 2,
      "failed": 0
    },
    "review": {
      "pending": 1,
      "approved": 0,
      "rejected": 0
    },
    "archive_dir": "archive/2026/03/",
    "converted_dir": "converted/2026/03/",
    "last_run": "2026-03-13T15:25:00+08:00"
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 状态文件格式版本（语义化版本，如 "2.1.0"） |
| `updated_at` | string | 最后更新时间（ISO 8601 格式） |
| `queue.processing` | object | 正在处理中的文件（键为文件路径） |
| `review.pending` | array | 待审核队列（未生成卡片） |
| `review.pending[].pending_id` | string | 临时 ID（格式：`pending-{domain-prefix}-{YYYYMMDD}-{seq}`） |
| `review.pending[].converted_file` | string | 转换文件路径 |
| `review.pending[].archived_source` | string | 归档文件路径 |
| `review.pending[].added_at` | string | 添加时间 |
| `review.pending[].reason` | string | 审核原因 |
| `processed` | object | 已处理文件映射（键为文件路径，值为处理结果） |
| `processed[].content_hash` | string | 转换文件内容 MD5 哈希（用于变更检测） |
| `processed[].source_hash` | string | 源文件 MD5 哈希（用于去重） |
| `processed[].processed_at` | string | 处理完成时间 |
| `processed[].intelligence_count` | number | 生成的情报卡片数量（不设上限） |
| `processed[].intelligence_ids` | array | 情报卡片 ID 列表 |
| `processed[].output_files` | array | 输出文件路径列表 |
| `processed[].session` | string | 会话 ID（YYYYMMDD-HHMMSS） |
| `processed[].archived_source` | string | 归档源文件路径 |
| `processed[].archived_exists` | boolean | 归档文件是否存在 |
| `processed[].converted_exists` | boolean | 转换文件是否存在 |
| `processed[].review_status` | string/null | 审核状态（`approved`/`rejected`/`pending`/null） |
| `stats` | object | 统计信息 |
| `stats.preprocess` | object | 预处理统计（scanned, converted, failed, duplicates） |
| `stats.intelligence` | object | 情报提取统计（processed, cards_generated, pending_review, no_value, failed） |
| `stats.review` | object | 审核统计（pending, approved, rejected） |
| `stats.archive_dir` | string | 当前归档目录 |
| `stats.converted_dir` | string | 当前转换目录 |
| `stats.last_run` | string | 最后运行时间 |

---

## 边缘情况处理

| 场景 | 处理策略 | 说明 |
|------|---------|------|
| **转换失败** | 保留源文件在 `inbox/`，不归档 | 用户可见，便于排查 |
| **归档文件被删除** | 记录警告，不影响其他文件处理 | 状态文件中的路径失效，但不影响流程 |
| **转换文件被删除** | 审核时从 `archive/` 恢复并重新转换 | 自动恢复，无需用户干预 |
| **同名文件** | 基于哈希判断：相同 = 跳过，不同 = 覆盖 | 避免冲突 |
| **用户删除 `inbox/`** | 向后兼容，支持根目录文件 | 不强制使用 `inbox/` |
| **状态文件损坏** | 备份旧文件，创建新状态文件 | 从现有文件重建 |
| **Agent 超时** | 重试一次，然后标记为失败 | 记录失败原因 |

---

## 错误处理

| 错误 | 操作 |
|------|------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Agent 返回 error | 记录错误信息，标记为失败 |
| Agent 超时 | 重试一次，然后标记为失败 |
| 状态文件读取失败 | 备份旧文件，创建新状态 |

## 关联 Skills

`intelligence-analyzer` agent 预加载以下 skills：
- **cybersecurity-domain-knowledge** - 七大情报领域定义和关键词
- **intelligence-analysis-methodology** - 战略价值判断标准和提取原则
- **intelligence-output-templates** - 情报卡片模板

## Schema 校验

使用 `validate-json.ts` 脚本进行 JSON Schema 校验：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts

# 校验 Agent 返回结果
npx tsx validate-json.ts agent-result ./temp/result.json

# 校验状态文件
npx tsx validate-json.ts state ./.intel/state.json
```

**校验时机**：

| 时机 | Schema | 说明 |
|------|--------|------|
| Agent 返回后 | `agent-result` | 校验轻量返回格式 |
| 启动时 | `state` | 校验现有状态文件 |
| 写入前 | `state` | 校验新状态 |

**支持的 Schema**：

| Schema 名称 | 文件 | 说明 |
|------------|------|------|
| `agent-result` | `agent-result.schema.json` | Agent 返回结果格式 |
| `state` | `state.schema.json` | 状态文件格式 |
| `intelligence-output` | `intelligence-output.schema.json` | 情报卡片输出格式 |
| `themes-config` | `themes-config.schema.json` | 主题配置格式 |
| `theme-state` | `theme-state.schema.json` | 主题状态格式 |

## 注意事项

- Agent 负责完整的文件处理流程（分析、写入情报卡片、返回结果）
- 命令层统一更新 state.json，确保状态一致性
- 删除源文件或转换文件后，情报卡片仍保留（frontmatter 包含追溯信息）
- 重新加入历史文件时会检测重复（基于转换文件 frontmatter 的 sourceHash）
- 建议将 `.intel/` 添加到 `.gitignore`
- 转换失败的文件保留在 `inbox/`，查看 `.error.md` 了解原因
- 情报卡片数量不设上限，根据源文档实际内容和情报价值决定（详见 `intelligence-analysis-methodology` skill）
- 情报卡片文件命名格式：`{YYYYMMDD}-{subject}-{feature}.md`
  - `YYYYMMDD`：情报日期（源文件发布日期）
  - `subject`：主体/对象（简短英文 kebab-case）
  - `feature`：核心特征/动作（简短英文 kebab-case）
  - 示例：`20260301-lockbit-ransomware-surge.md`
  - 详细规则参见 `intelligence-output-templates/references/templates.md` 中的 File Naming Rules