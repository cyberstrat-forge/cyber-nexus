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

## 目录结构（v2.0）

### 推荐目录布局

```
{source_dir}/
├── inbox/                          # ⭐️ 待处理文档（推荐入口）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   └── vendor-news.pdf
│
├── archive/                        # ⭐️ 已归档文档（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.pdf
│           ├── report-2026.pdf.meta  # ⭐️ 元数据文件
│           ├── ai-article.docx
│           └── vendor-news.pdf
│
├── converted/                      # ⭐️ 转换后的 Markdown（按年月组织）
│   └── 2026/
│       └── 03/
│           ├── report-2026.md
│           ├── ai-article.md
│           └── vendor-news.md
│
├── intelligence/                   # 情报卡片输出
│   ├── Threat-Landscape/
│   ├── Industry-Analysis/
│   └── ...
│
└── .intel/                         # ⭐️ 管理目录（隐藏）
    └── state.json                  # ⭐️ 状态文件 v2.0
```

### 目录说明

| 目录 | 说明 | 文件命名规则 |
|------|------|-------------|
| `inbox/` | 待处理文档目录 | 保持原名 |
| `archive/YYYY/MM/` | 已归档文档目录 | 保持原名 |
| `archive/YYYY/MM/*.meta` | 归档文件元数据 | `{filename}.meta` |
| `converted/YYYY/MM/` | 转换后的 Markdown | 保持原名（仅改扩展名） |
| `.intel/` | 管理目录 | - |
| `.intel/state.json` | 状态文件 v2.0 | - |

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

| 条件 | 执行模式 |
|------|---------|
| `--review` 参数存在 | **审核模式** → 执行审核流程 |
| `--report` 参数存在 | **报告模式** → 执行报告生成流程 |
| 两者都不存在 | **提取模式** → 执行情报提取流程 |

---

## 审核模式流程

当 `--review` 参数存在时，执行以下流程：

### A1：列出待审核（`--review list`）

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

💡 操作:
   /intel-distill --review approve <pending_id> --reason "原因"
   /intel-distill --review reject <pending_id> --reason "原因"
```

### A2：批准审核（`--review approve <pending_id> --reason`）

1. **查找待审核项**
   - 从 `state.review.pending` 中查找 `pending_id`
   - 如果不存在，报错退出

2. **检查转换文件**
   - 检查 `converted_file` 是否存在
   - 如果不存在，执行转换文件恢复流程

3. **调用 Agent 生成情报卡片**
   - 调用 `intelligence-analyzer` Agent
   - 参数：`source`、`output`、`session_id`、`archived_source`、`source_hash`

4. **更新状态文件**
   - 在 `state.processed` 中更新 `intelligence_id`、`review_status = "approved"`
   - 从 `state.review.pending` 中移除该待审核项

**输出示例**：
```
✅ 已批准: pending-threat-20260313-001
   • 情报卡片已生成: threat-20260313-001
   • 输出位置: ./intelligence/Threat-Landscape/threat-20260313-001.md
   • 批准原因已记录
```

### A3：拒绝审核（`--review reject <pending_id> --reason`）

1. **查找待审核项**
2. **更新状态文件**
   - 不调用 Agent（不生成情报卡片）
   - `intelligence_id = null`、`review_status = "rejected"`
   - 从 `state.review.pending` 中移除

**输出示例**：
```
✅ 已拒绝: pending-emerging-20260313-002
   • 不生成情报卡片
   • 拒绝原因已记录
```

---

## 报告生成流程

当 `--report` 参数存在时，执行以下流程：

### R1：调用扫描脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx reporting/scan-cards.ts \
  --period {report_type} \
  --param "{period_param}" \
  --output-dir {output}
```

### R2：解析扫描结果

### R3：检查卡片列表

| 条件 | 操作 |
|------|------|
| `cards.length == 0` | 输出"本周/月无情报卡片"，结束流程 |
| `cards.length > 0` | 继续生成报告 |

### R4：调用情报简报 Agent

```
使用 Agent 工具，subagent_type="intelligence-briefing-writer"
参数: card_list（扫描结果）, output_dir, report_date（当前日期）
```

### R5：显示报告位置

```
报告文件位置：{output}/reports/{period}/{period_param}-briefing.md
```

---

## 情报提取流程

### 步骤 1：首次运行检测

**目的**：引导用户使用 `inbox/` 目录。

**执行逻辑**：
1. 检测 `source_dir/inbox/` 目录是否存在
2. 如果不存在，显示引导信息
3. 询问用户是否创建 `inbox/` 目录

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
- 更新 `processed` 条目格式

### 步骤 4：预处理（格式转换与内容清洗）

#### 4.1 调用预处理脚本

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx preprocess/index.ts --source {source_dir}
```

**输出位置**：
- 归档文件：`{source_dir}/archive/YYYY/MM/`
- 转换文件：`{source_dir}/converted/YYYY/MM/`
- 元数据文件：`{source_dir}/archive/YYYY/MM/{filename}.meta`

#### 4.2 预处理逻辑

脚本会自动：
1. 优先扫描 `inbox/` 目录
2. 兼容扫描根目录
3. 检查已知源文件哈希，跳过重复文件
4. 执行格式转换和噪声清洗
5. 归档源文件
6. 保存元数据

### 步骤 5：扫描转换后的文件

从 `converted/YYYY/MM/` 目录扫描 Markdown 文件：

```bash
glob pattern: {source_dir}/converted/**/*.md
```

### 步骤 6：构建处理队列

#### 6.1 计算文件内容 Hash

使用 MD5 算法计算转换后文件的内容哈希。

#### 6.2 变更检测逻辑

| 条件 | 操作 |
|------|------|
| content_hash 相同 | 跳过（无变更） |
| content_hash 不同 | 加入 pending（内容变更） |
| 新文件（无记录） | 加入 pending |
| review_status = pending | 跳过（已在审核队列） |

### 步骤 7：逐个处理文件

#### 7.1 调用情报分析 Agent

```
使用 Agent 工具，subagent_type="intelligence-analyzer"
参数: source（转换文件路径）, output, session_id, archived_source, source_hash
```

#### 7.2 处理 Agent 返回结果

**情况 1：明确有价值（`has_strategic_value = true`）**
- 生成情报卡片
- 分配正式 `intelligence_id`
- `review_status = null`（无需审核）

**情况 2：明确无价值（`has_strategic_value = false`）**
- 不生成情报卡片
- `intelligence_id = null`
- `intelligence_count = 0`
- `review_status = null`

**情况 3：需要复核（`has_strategic_value = null`）**
- 不生成情报卡片
- 添加到 `state.review.pending` 队列
- 分配临时 `pending_id`（格式：`pending-{domain}-{timestamp}`）
- `review_status = "pending"`

### 步骤 8：统一输出统计

**输出格式**：
```
════════════════════════════════════════════════════════
📊 情报提取执行报告
════════════════════════════════════════════════════════

【预处理统计】
• 扫描到文件: 15 个
• 转换成功: 14 个
• 转换失败: 1 个
• 重复文件: 2 个（已跳过）
• 归档位置: ./archive/2026/03/
• 转换文件: ./converted/2026/03/

【情报提取统计】
• 处理文件: 14 个
• 生成情报卡片: 3 个  ⭐️（自动批准）
• 待用户复核: 2 个    ⭐️（等待审核）
• 无价值文件: 1 个

【审核任务】⭐️
• 待人工复核: 2 个文件

  1. pending-threat-20260313-001
     来源: report-2026.md
     原因: 检测到高风险威胁指标，需人工确认

💡 操作提示:
   /intel-distill --review list
   /intel-distill --review approve <pending_id> --reason "原因"
   /intel-distill --review reject <pending_id> --reason "原因"
════════════════════════════════════════════════════════
```

---

## 错误处理

| 错误 | 操作 |
|------|------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Agent 返回 error | 记录错误信息，标记为失败 |
| Agent 超时 | 重试一次，然后标记为失败 |

## 关联 Skills

`intelligence-analyzer` agent 预加载以下 skills：
- **domain-knowledge** - 七大情报领域定义和关键词
- **analysis-methodology** - 战略价值判断标准和提取原则
- **output-templates** - 情报卡片模板

## Schema 校验

| 时机 | Schema | 说明 |
|------|--------|------|
| Agent 返回后 | `agent-result.schema.json` | 校验轻量返回格式 |
| 启动时 | `state.schema.json` | 校验现有状态 |
| 写入前 | `state.schema.json` | 校验新状态 |

## 注意事项

- 处理是顺序执行的，而非并行
- Agent 负责完整的文件处理流程
- 状态变更后立即写入 `state.json`
- 删除源文件或转换文件后，情报卡片仍保留
- 重新加入历史文件时会检测重复
- 建议将 `.intel/` 和 `inbox/` 添加到 `.gitignore`