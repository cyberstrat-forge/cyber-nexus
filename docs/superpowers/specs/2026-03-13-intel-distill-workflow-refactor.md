# Intel-Distill 工作流重构设计方案

## 📋 文档说明

本文档是 `market-radar` 插件中 `intel-distill` 命令的工作流重构**设计方案**，用于指导 Claude Code AI 助手理解并执行重构工作。

**文档类型**：设计规范（Design Specification）
**目标受众**：Claude Code AI 助手
**适用范围**：`market-radar` 插件开发

---

## 🎯 设计目标

本次重构旨在解决以下三个核心问题：

### Issue #22：情报卡片持久化

**问题描述**：
当前情报卡片依赖于源文件和转换后的中间文件（`.md`），当用户删除这些文件时，可能导致情报卡片丢失或处理异常。

**设计目标**：
- 情报卡片一旦生成，应完全独立于源文件和中间产物
- 删除源文件、转换文件、归档文件后，情报卡片仍应保留
- 支持增量处理，重新加入历史文件时能够检测重复

### Issue #21：优化处理逻辑

**问题描述**：
1. 无价值文件会被重复处理，浪费计算资源
2. 审核机制不清晰，无法区分"自动生成待审核"和"用户标记待审核"

**设计目标**：
- 无价值文件应永久跳过，不重复处理
- 审核机制清晰：待审核时不生成卡片，批准后才生成，拒绝后不生成
- 提供审核管理命令（`--review list|approve|reject`）
- 审核原因应反馈给 Agent，作为正/负样本

### Issue #25：重构 inbox 目录结构

**问题描述**：
当前 `intel-distill` 命令没有专门的 inbox 目录设计，源文档和已处理文档混在一起，导致：
- 目录混乱，无法区分待处理和已处理文档
- 磁盘占用大，长期使用后文档大量积累
- 归档缺失，无自动归档机制

**设计目标**：
- 支持待处理/已归档分离的三层目录结构
- 提供独立的 `inbox/` 目录作为推荐入口
- 归档到 `archive/YYYY/MM/` 按年月组织
- 向后兼容，支持根目录文件

---

## 🏗️ 架构设计

### 整体架构

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
│  • 保存转换文件到 converted/YYYY/MM/                       │
│  • 保存元数据到 .meta 文件                                  │
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
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              审核层（Review Layer）- 独立命令                 │
├─────────────────────────────────────────────────────────────┤
│  • /intel-distill --review list                            │
│    - 列出所有待审核任务                                     │
│    - 显示 pending_id、来源文件、转换文件、原因              │
│                                                             │
│  • /intel-distill --review approve <pending_id> --reason   │
│    - 检查转换文件是否存在                                   │
│    - 如果不存在，从 archive/ 恢复并重新转换                 │
│    - 调用 Agent 生成情报卡片                                │
│    - 更新 state.processed（分配正式 intelligence_id）       │
│    - 从 review.pending 移除                                 │
│                                                             │
│  • /intel-distill --review reject <pending_id> --reason    │
│    - 不调用 Agent（不生成情报卡片）                         │
│    - 更新 state.processed（intelligence_id = null）         │
│    - 记录拒绝原因（负样本反馈）                             │
│    - 从 review.pending 移除                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构设计

### 推荐目录布局

```
{source_dir}/
├── inbox/                          # ⭐️ 待处理文档（推荐入口）
│   ├── report-2026.pdf
│   ├── ai-article.docx
│   └── vendor-news.pdf
│
├── archive/                        # ⭐️ 已归档文档（按年月组织，保持原名）
│   └── 2026/
│       └── 03/
│           ├── report-2026.pdf
│           ├── report-2026.pdf.meta  # ⭐️ 元数据文件
│           ├── ai-article.docx
│           ├── ai-article.docx.meta
│           └── vendor-news.pdf
│
├── converted/                      # ⭐️ 转换后的 Markdown（按年月组织，保持原名）
│   └── 2026/
│       └── 03/
│           ├── report-2026.md
│           ├── ai-article.md
│           └── vendor-news.md
│
└── .intel/                         # ⭐️ 管理目录（隐藏）
    └── state.json                  # ⭐️ 状态文件
```

### 目录说明

| 目录 | 说明 | 文件命名规则 | 用户可见性 |
|------|------|-------------|-----------|
| `inbox/` | 待处理文档目录 | 保持原名 | ✅ 可见 |
| `archive/YYYY/MM/` | 已归档文档目录 | 保持原名 | ✅ 可见 |
| `archive/YYYY/MM/*.meta` | 归档文件元数据 | `{filename}.meta` | ✅ 可见 |
| `converted/YYYY/MM/` | 转换后的 Markdown | 保持原名（仅改扩展名） | ✅ 可见 |
| `.intel/` | 管理目录 | - | ❌ 隐藏 |
| `.intel/state.json` | 状态文件 | - | ❌ 隐藏 |

---

## 🔄 工作流设计

### 工作流概述

完整的工作流分为**一次执行**和**独立审核**两个阶段：

1. **阶段 1：完整执行**（`/intel-distill --source ./docs`）
   - 预处理（扫描、转换、清洗、归档）
   - 情报提取（调用 Agent、生成/跳过/待审核）
   - 输出统计（预处理统计、情报提取统计、待审核列表）

2. **阶段 2：独立审核**（`/intel-distill --review approve|reject`）
   - 用户查看输出，了解待审核任务
   - 单独执行审核命令（批准/拒绝）
   - 批准时生成情报卡片，拒绝时不生成

### 阶段 1：完整执行流程

#### 步骤 1：首次运行检测

**目的**：引导用户使用 `inbox/` 目录，提升文件管理体验。

**触发条件**：
- 首次运行 `intel-distill` 命令
- 或 `inbox/` 目录不存在

**执行逻辑**：
1. 检测 `source_dir/inbox/` 目录是否存在
2. 如果不存在，显示引导信息
3. 询问用户是否创建 `inbox/` 目录
4. 如果用户确认，创建目录

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

#### 步骤 2：预处理

**目的**：将源文档转换为干净的 Markdown，并归档源文件。

**执行逻辑**：
1. **扫描待处理文件**
   - 优先扫描 `inbox/` 目录
   - 兼容扫描根目录（跳过 `inbox/`、`archive/`、`converted/`）
   - 支持的文件类型：`pdf`、`docx`、`md`、`txt`

2. **去重检查**
   - 计算每个源文件的 MD5 哈希
   - 从 `archive/**/*.meta` 文件中提取已知哈希
   - 如果哈希已存在，标记为重复文件
   - 重复文件仍然归档（保留用户操作）

3. **格式转换**
   - 调用转换脚本（`preprocess/index.ts`）
   - PDF/DOCX → Markdown
   - 应用清洗规则（删除图片链接、社交媒体元数据、连续空行等）

4. **归档源文件**
   - 移动源文件到 `archive/YYYY/MM/`
   - 保持原文件名（不添加后缀）
   - 如果文件已存在且哈希相同，跳过归档
   - 如果文件已存在但哈希不同，覆盖归档

5. **保存元数据**
   - 生成 `{filename}.meta` 文件
   - 记录：`sourceHash`、`originalPath`、`archivedAt`、`convertedPath`

**输出位置**：
- 转换文件：`converted/YYYY/MM/{filename}.md`
- 归档文件：`archive/YYYY/MM/{filename}.{ext}`
- 元数据文件：`archive/YYYY/MM/{filename}.{ext}.meta`

#### 步骤 3：情报提取

**目的**：从转换后的 Markdown 中提取战略情报，并生成情报卡片。

**执行逻辑**：
1. **扫描转换文件**
   - 递归扫描 `converted/**/*.md`
   - 获取所有转换后的 Markdown 文件

2. **构建处理队列**
   - 计算每个转换文件的 `content_hash`（MD5）
   - 与 `state.processed` 中的记录比对
   - 如果 `content_hash` 相同且已处理，跳过
   - 否则加入待处理队列

3. **调用 Agent 处理**
   - 对每个待处理文件，调用 `intelligence-analyzer` Agent
   - Agent 读取转换后的 Markdown
   - Agent 分析内容，判断战略价值
   - Agent 返回处理结果（三种情况）

4. **处理三种情况**

   **情况 1：明确有价值**
   - 条件：`has_strategic_value = true`
   - 动作：
     - 生成情报卡片（输出到 `intelligence/{domain}/`）
     - 分配正式 `intelligence_id`
     - 更新 `state.processed`
     - `review_status = null`（无需审核）

   **情况 2：明确无价值**
   - 条件：`has_strategic_value = false`
   - 动作：
     - 不生成情报卡片
     - 更新 `state.processed`
     - `intelligence_id = null`
     - `intelligence_count = 0`
     - `review_status = null`（无需审核）

   **情况 3：需要用户复核**
   - 条件：`has_strategic_value = null`（或 `undefined`）
   - 动作：
     - 不生成情报卡片
     - 添加到 `state.review.pending` 队列
     - 分配临时 `pending_id`（格式：`pending-{domain}-{timestamp}`）
     - 更新 `state.processed`
     - `intelligence_id = null`
     - `review_status = "pending"`

5. **更新状态文件**
   - 更新 `state.processed`（处理结果）
   - 更新 `state.review.pending`（待审核队列）
   - 更新 `state.stats`（统计信息）

#### 步骤 4：统一输出统计

**目的**：向用户展示完整的处理结果，包括待审核任务。

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
• 生成情报卡片: 3 个  ⭐️（已批准的）
• 待用户复核: 2 个    ⭐️（未生成，等待批准）
• 无价值文件: 1 个
• 处理失败: 0 个
• 情报卡片位置: ./intelligence/

【审核任务】⭐️
• 待人工复核: 2 个文件（未生成情报卡片）

  1. pending-threat-20260313-001
     来源: report-2026.md
     原因: 检测到高风险威胁指标，需人工确认

  2. pending-emerging-20260313-002
     来源: ai-article.md
     原因: AI 安全新技术，需人工评估价值

💡 操作提示:
   /intel-distill --review list
   /intel-distill --review approve <pending_id> --reason "原因"
   /intel-distill --review reject <pending_id> --reason "原因"
════════════════════════════════════════════════════════
```

---

### 阶段 2：独立审核流程

#### 审核命令 1：列出待审核

**命令**：`/intel-distill --review list`

**目的**：显示所有待审核任务的详细信息。

**执行逻辑**：
1. 读取 `state.review.pending` 队列
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

#### 审核命令 2：批准审核

**命令**：`/intel-distill --review approve <pending_id> --reason "情报准确"`

**目的**：批准待审核任务，生成情报卡片。

**执行逻辑**：
1. **查找待审核项**
   - 从 `state.review.pending` 中查找 `pending_id`
   - 如果不存在，报错退出

2. **检查转换文件**
   - 检查 `converted_file` 是否存在
   - 如果不存在，执行转换文件恢复流程：
     - 从 `archived_source` 复制归档文件到临时位置
     - 重新执行转换（调用 `preprocess/index.ts`）
     - 保存转换文件到原路径
     - 验证转换结果

3. **调用 Agent 生成情报卡片**
   - 调用 `intelligence-analyzer` Agent
   - 参数：`converted_file`、`review_decision = "approved"`、`review_reason`
   - Agent 读取转换文件，生成情报卡片
   - Agent 返回正式 `intelligence_id`

4. **更新状态文件**
   - 在 `state.processed` 中更新：
     - `intelligence_id`（正式 ID）
     - `review_status = "approved"`
     - `reviewed_at`（当前时间）
     - `approved_reason`
     - `reviewed_by = "user"`
   - 从 `state.review.pending` 中移除该待审核项
   - 更新 `state.stats.review.approved++`

**输出示例**：
```
⚠️  转换文件不存在: converted/2026/03/report-2026.md
   尝试从归档文件恢复...
   重新转换: report-2026.pdf
   ✅ 转换文件已恢复: converted/2026/03/report-2026.md

✅ 已批准: pending-threat-20260313-001
   • 情报卡片已生成: threat-20260313-001
   • 输出位置: ./intelligence/Threat-Landscape/threat-20260313-001.md
   • 批准原因已记录（正样本反馈）
```

#### 审核命令 3：拒绝审核

**命令**：`/intel-distill --review reject <pending_id> --reason "情报来源不可靠"`

**目的**：拒绝待审核任务，不生成情报卡片。

**执行逻辑**：
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
   - 更新 `state.stats.review.rejected++`

**输出示例**：
```
✅ 已拒绝: pending-emerging-20260313-002
   • 不生成情报卡片
   • 拒绝原因已记录（负样本反馈）
```

---

## 📊 状态文件设计

### 状态文件结构

```json
{
  "version": "2.0.0",
  "updated_at": "2026-03-13T12:00:00Z",

  "queue": {
    "processing": {}
  },

  "review": {
    "pending": [
      {
        "pending_id": "pending-threat-20260313-001",
        "converted_file": "converted/2026/03/report-2026.md",
        "archived_source": "archive/2026/03/report-2026.pdf",
        "added_at": "2026-03-13T10:00:00Z",
        "reason": "检测到高风险威胁指标，需人工确认"
      }
    ]
  },

  "processed": {
    "converted/2026/03/report-2026.md": {
      "intelligence_id": "threat-20260313-001",
      "content_hash": "xyz789...",
      "intelligence_count": 2,
      "processed_at": "2026-03-13T10:00:00Z",
      "session_id": "20260313-100000",
      "archived_source": "archive/2026/03/report-2026.pdf",
      "archived_exists": true,
      "converted_exists": true,
      "review_status": "approved",
      "reviewed_at": "2026-03-13T11:00:00Z",
      "approved_reason": "情报准确，批准生成",
      "reviewed_by": "user"
    },
    "converted/2026/03/ai-article.md": {
      "intelligence_id": null,
      "content_hash": "abc123...",
      "intelligence_count": 0,
      "processed_at": "2026-03-13T10:05:00Z",
      "session_id": "20260313-100500",
      "archived_source": "archive/2026/03/ai-article.docx",
      "archived_exists": true,
      "converted_exists": true,
      "review_status": "rejected",
      "reviewed_at": "2026-03-13T11:05:00Z",
      "rejected_reason": "情报来源不可靠",
      "reviewed_by": "user"
    },
    "converted/2026/03/vendor-news.md": {
      "intelligence_id": "vendor-20260313-003",
      "content_hash": "def456...",
      "intelligence_count": 1,
      "processed_at": "2026-03-13T10:10:00Z",
      "session_id": "20260313-101000",
      "archived_source": "archive/2026/03/vendor-news.pdf",
      "archived_exists": true,
      "converted_exists": true,
      "review_status": null,
      "reviewed_by": null
    },
    "converted/2026/03/no-value.md": {
      "intelligence_id": null,
      "content_hash": "ghi789...",
      "intelligence_count": 0,
      "processed_at": "2026-03-13T10:15:00Z",
      "session_id": "20260313-101500",
      "archived_source": "archive/2026/03/no-value.pdf",
      "archived_exists": true,
      "converted_exists": true,
      "review_status": null,
      "reviewed_by": null
    }
  },

  "failed": {},

  "stats": {
    "preprocess": {
      "scanned": 15,
      "converted": 14,
      "failed": 1,
      "duplicates": 2
    },
    "intelligence": {
      "processed": 14,
      "cards_generated": 3,
      "pending_review": 2,
      "no_value": 1,
      "failed": 0
    },
    "review": {
      "pending": 2,
      "approved": 1,
      "rejected": 1
    },
    "archive_dir": "archive/2026/03/",
    "converted_dir": "converted/2026/03/",
    "last_run": "2026-03-13T12:00:00Z"
  }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | string | 状态文件格式版本（当前为 "2.0.0"） |
| `updated_at` | string | 最后更新时间（ISO 8601 格式） |
| `queue.processing` | object | 正在处理的文件队列 |
| `review.pending` | array | 待审核队列（未生成卡片） |
| `review.pending[].pending_id` | string | 临时 ID（格式：`pending-{domain}-{timestamp}`） |
| `review.pending[].converted_file` | string | 转换文件路径 |
| `review.pending[].archived_source` | string | 归档文件路径 |
| `review.pending[].added_at` | string | 添加时间 |
| `review.pending[].reason` | string | 审核原因 |
| `processed` | object | 已处理文件映射（key 为转换文件路径） |
| `processed[].intelligence_id` | string/null | 情报卡片 ID（正式 ID 或 null） |
| `processed[].content_hash` | string | 转换文件内容哈希（用于变更检测） |
| `processed[].intelligence_count` | number | 生成的情报卡片数量（0 表示无价值） |
| `processed[].processed_at` | string | 处理完成时间 |
| `processed[].session_id` | string | 会话 ID（格式：`YYYYMMDD-HHMMSS`） |
| `processed[].archived_source` | string | 归档文件路径 |
| `processed[].archived_exists` | boolean | 归档文件是否存在 |
| `processed[].converted_exists` | boolean | 转换文件是否存在 |
| `processed[].review_status` | string/null | 审核状态（`approved`/`rejected`/`pending`/null） |
| `processed[].reviewed_at` | string/null | 审核时间 |
| `processed[].approved_reason` | string/null | 批准原因（正样本反馈） |
| `processed[].rejected_reason` | string/null | 拒绝原因（负样本反馈） |
| `processed[].reviewed_by` | string/null | 审核人（`user` 或 null） |
| `failed` | object | 处理失败的文件 |
| `stats` | object | 统计信息 |
| `stats.preprocess.scanned` | number | 扫描到的文件数量 |
| `stats.preprocess.converted` | number | 转换成功的文件数量 |
| `stats.preprocess.failed` | number | 转换失败的文件数量 |
| `stats.preprocess.duplicates` | number | 重复文件数量 |
| `stats.intelligence.processed` | number | 处理的文件数量 |
| `stats.intelligence.cards_generated` | number | 生成的情报卡片数量 |
| `stats.intelligence.pending_review` | number | 待审核文件数量 |
| `stats.intelligence.no_value` | number | 无价值文件数量 |
| `stats.intelligence.failed` | number | 处理失败的文件数量 |
| `stats.review.pending` | number | 待审核数量 |
| `stats.review.approved` | number | 已批准数量 |
| `stats.review.rejected` | number | 已拒绝数量 |
| `stats.archive_dir` | string | 归档目录 |
| `stats.converted_dir` | string | 转换目录 |
| `stats.last_run` | string | 最后运行时间 |

---

## 📁 归档文件元数据设计

### 元数据文件格式

每个归档文件对应一个 `.meta` 元数据文件，格式如下：

```json
{
  "sourceHash": "abc123def456...",
  "originalPath": "inbox/report-2026.pdf",
  "archivedAt": "2026-03-13T10:00:00Z",
  "fileSize": 123456,
  "mimeType": "application/pdf",
  "conversionInfo": {
    "convertedPath": "converted/2026/03/report-2026.md",
    "convertedAt": "2026-03-13T10:00:00Z",
    "conversionSuccess": true
  }
}
```

### 元数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `sourceHash` | string | 源文件的 MD5 哈希（用于去重） |
| `originalPath` | string | 源文件的原始路径（相对于 `source_dir`） |
| `archivedAt` | string | 归档时间（ISO 8601 格式） |
| `fileSize` | number | 文件大小（字节） |
| `mimeType` | string | MIME 类型（如 `application/pdf`） |
| `conversionInfo` | object | 转换信息 |
| `conversionInfo.convertedPath` | string | 转换文件路径 |
| `conversionInfo.convertedAt` | string | 转换时间 |
| `conversionInfo.conversionSuccess` | boolean | 转换是否成功 |

---

## 🎯 核心机制设计

### 1. 完整执行链条

```
用户执行: /intel-distill --source ./docs
  ↓
阶段 1：首次运行检测（引导用户创建 inbox/ 目录）
  ↓
阶段 2：预处理（扫描 → 去重 → 转换 → 清洗 → 归档）
  ↓
阶段 3：情报提取（扫描转换文件 → 构建队列 → 调用 Agent → 处理三种情况）
  ↓
阶段 4：统一输出统计（预处理统计 + 情报提取统计 + 待审核列表）
  ↓
用户查看输出，了解待审核任务
  ↓
用户执行独立审核命令: /intel-distill --review approve|reject <pending_id> --reason "原因"
  ↓
阶段 5：审核处理（批准 → 生成卡片 / 拒绝 → 不生成卡片）
```

---

### 2. 关键特性

| 特性 | 设计要点 | 说明 |
|------|---------|------|
| **预处理归档** | 转换成功后立即归档到 `archive/YYYY/MM/` | 源文件保持原名，不添加后缀 |
| **统一状态管理** | 所有状态集中管理在 `state.json` | 无冗余队列，结构清晰 |
| **审核机制** | 待审核不生成卡片，批准后才生成，拒绝后不生成 | 临时 ID → 正式 ID |
| **文件命名** | 归档和转换文件保持原名 | 人类可读，易于理解 |
| **去重机制** | 基于源文件哈希，使用 `.meta` 元数据 | 避免重复处理 |
| **转换文件恢复** | 审核时转换文件不存在则从 `archive/` 恢复 | 自动恢复并重新转换 |
| **首次运行引导** | 检测 `inbox/` 目录，提示创建 | 提升用户体验 |

---

### 3. 边缘情况处理

| 场景 | 处理策略 | 说明 |
|------|---------|------|
| **转换失败** | 保留源文件在 `inbox/`，不归档 | 用户可见，便于排查 |
| **归档文件被删除** | 记录警告，不影响其他文件处理 | 状态文件中的路径失效，但不影响流程 |
| **转换文件被删除** | 审核时从 `archive/` 恢复并重新转换 | 自动恢复，无需用户干预 |
| **同名文件** | 基于哈希判断：相同 = 跳过，不同 = 覆盖 | 避免冲突 |
| **用户删除 `inbox/`** | 向后兼容，支持根目录文件 | 不强制使用 `inbox/` |

---

## ✅ 需求覆盖清单

| Issue | 需求描述 | 设计方案 | 状态 |
|-------|---------|---------|------|
| **#22 情报卡片持久化** | | | |
| 删除源文件后卡片保留 | 归档到 `archive/`，卡片在 `intelligence/` | ✅ 完全满足 |
| 删除转换文件后卡片保留 | 卡片独立于 `converted/` | ✅ 完全满足 |
| 删除 `converted/` 目录后卡片保留 | 卡片在独立目录 | ✅ 完全满足 |
| 重新加入历史文件检测重复 | 基于源文件哈希 + `.meta` 元数据 | ✅ 完全满足 |
| 情报卡片完全独立 | 卡片包含完整元数据 | ✅ 完全满足 |
| **#21 优化处理逻辑** | | | |
| 无价值文件永久跳过 | `intelligence_count = 0` + `content_hash` | ✅ 完全满足 |
| 审核机制清晰 | 只有 Agent 判断，待审核不生成卡片 | ✅ 完全满足 |
| 提供审核管理命令 | `--review approve|reject --reason` | ✅ 完全满足 |
| 审核原因反馈给 Agent | 批准/拒绝原因记录为正/负样本 | ✅ 完全满足 |
| 批准后生成卡片 | 调用 Agent 重新处理 | ✅ 完全满足 |
| 拒绝后不生成卡片 | 记录拒绝原因 | ✅ 完全满足 |
| **#25 重构 inbox 结构** | | | |
| 支持待处理/已归档分离 | `inbox/` + `archive/YYYY/MM/` | ✅ 完全满足 |
| 独立的 `inbox/` 目录 | 作为推荐入口 | ✅ 完全满足 |
| 归档到 `archive/YYYY/MM/` | 按年月组织 | ✅ 完全满足 |
| 向后兼容 | 支持根目录文件 | ✅ 完全满足 |
| 自动归档 | 预处理阶段自动归档 | ✅ 完全满足 |

---

## 📝 实施建议

### 第一阶段：目录结构改造（预计 1 天）

**目标**：实现 `inbox/`、`archive/`、`converted/` 三层目录结构

**任务清单**：
- [ ] 创建 `inbox/` 目录检测逻辑
- [ ] 修改扫描逻辑，支持 `inbox/` 和根目录
- [ ] 修改归档逻辑，按年月组织 `archive/YYYY/MM/`
- [ ] 修改转换逻辑，按年月组织 `converted/YYYY/MM/`
- [ ] 更新 `intel-distill.md` 命令文档

**交付物**：
- 目录结构改造完成
- 命令文档更新

---

### 第二阶段：状态文件升级（预计 0.5 天）

**目标**：升级 `state.json` 到 v2.0.0，支持审核队列

**任务清单**：
- [ ] 升级 `state.schema.json` 到 v2.0.0
- [ ] 添加 `archived_exists` 和 `converted_exists` 字段
- [ ] 添加 `review.pending` 队列
- [ ] 实现状态文件迁移逻辑（旧版本 → 新版本）

**交付物**：
- 状态文件 Schema 升级完成
- 迁移逻辑实现

---

### 第三阶段：情报卡片持久化（预计 1 天）

**目标**：实现情报卡片完全独立于源文件和中间产物

**任务清单**：
- [ ] 修改 `output-templates` Skill，添加元数据字段
- [ ] 修改 `intelligence-analyzer` Agent，生成元数据
- [ ] 修改扫描逻辑，从卡片读取元数据
- [ ] 实现重复检测机制

**交付物**：
- 情报卡片持久化实现完成
- 重复检测机制实现

---

### 第四阶段：审核机制（预计 1 天）

**目标**：实现完整的审核流程（待审核、批准、拒绝）

**任务清单**：
- [ ] 实现审核队列管理（`review.pending`）
- [ ] 实现审核命令（`--review list|approve|reject`）
- [ ] 实现转换文件恢复机制
- [ ] 实现批准/拒绝后的状态更新

**交付物**：
- 审核机制实现完成
- 转换文件恢复机制实现

---

### 第五阶段：首次运行引导（预计 0.5 天）

**目标**：实现 `inbox/` 目录检测和用户引导

**任务清单**：
- [ ] 实现 `inbox/` 目录检测逻辑
- [ ] 实现用户引导提示
- [ ] 实现交互式创建 `inbox/` 目录

**交付物**：
- 首次运行引导功能实现

---

### 第六阶段：测试验证（预计 1 天）

**目标**：全面测试重构后的功能

**任务清单**：
- [ ] 测试目录结构（`inbox/` + `archive/` + `converted/`）
- [ ] 测试归档流程（源文件 + 转换文件）
- [ ] 测试删除转换文件后的行为
- [ ] 测试审核命令（批准/拒绝）
- [ ] 测试转换文件恢复机制
- [ ] 测试首次运行引导

**交付物**：
- 测试报告
- 问题修复

---

## 🔗 相关文档

- [intel-distill 命令文档](/plugins/market-radar/commands/intel-distill.md)
- [state.schema.json](/plugins/market-radar/schemas/state.schema.json)
- [Issue #22: 情报卡片持久化](https://github.com/cyberstrat-forge/cyber-nexus/issues/22)
- [Issue #21: 优化处理逻辑](https://github.com/cyberstrat-forge/cyber-nexus/issues/21)
- [Issue #25: 重构 inbox 目录结构](https://github.com/cyberstrat-forge/cyber-nexus/issues/25)

---

## 📅 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-03-13 | 初始版本，完成完整设计方案 |
| | | |

---

## 📝 备注

1. **本文档是设计方案，不是实现代码**
   - 设计文档用于指导 AI 助手理解需求和架构
   - 实现时应参考具体的技术规范和代码规范

2. **向后兼容性**
   - 支持旧目录结构（根目录文件）
   - 支持旧状态文件格式（提供迁移逻辑）

3. **人类可读命名**
   - 归档文件和转换文件保持原名，不添加后缀
   - 便于用户理解和管理

4. **去重机制**
   - 基于源文件哈希，使用 `.meta` 元数据
   - 避免重复处理，提升效率

5. **审核流程**
   - 待审核不生成卡片，批准后才生成，拒绝后不生成
   - 审核原因作为正/负样本反馈给 Agent

6. **转换文件恢复**
   - 审核时转换文件不存在则从 `archive/` 恢复
   - 自动恢复并重新转换，无需用户干预
