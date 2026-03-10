---
name: intel-distill
description: Extract strategic intelligence from source documents and generate intelligence cards
argument-hint: "[--source <目录>] [--output <目录>]"
allowed-tools: ["Read", "Write", "Grep", "Glob", "Bash", "Agent"]
---

## 命令概述

执行情报提取工作流：扫描源文档，分析战略价值，并在输出目录生成情报卡片。

## 参数

| 参数 | 必填 | 说明 |
|-----------|----------|-------------|
| `--source <dir>` | 否 | 包含文档的源目录（默认：当前目录） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：当前目录） |

## 目录结构

### 输出目录（用户可见）
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

### 管理目录（隐藏，存放状态）
```
{output_dir}/.intel/
├── state.json              # 统一状态管理
└── history/                # 历史元数据（按月归档）
    ├── 2026-03.json
    ├── 2026-02.json
    └── ...
```

## 执行流程

### 步骤 1：初始化路径

```
# 源目录：优先使用 --source，否则为当前目录
source_dir = --source 参数或当前目录

# 输出目录：优先使用 --output，否则使用 source_dir，最终兜底为当前目录
if --output 参数存在:
    output_dir = --output 参数值
elif --source 参数存在:
    output_dir = --source 参数值
else:
    output_dir = 当前目录

# 管理目录：始终在输出目录下
intel_dir = output_dir/.intel/
state_file = intel_dir/state.json
```

**输出规则说明**：

| 参数情况 | 情报卡片输出位置 | 状态文件位置 |
|---------|-----------------|-------------|
| 无参数 | `./` | `./.intel/state.json` |
| `--source ./docs` | `./docs/` | `./docs/.intel/state.json` |
| `--output ./intel` | `./intel/` | `./intel/.intel/state.json` |
| `--source ./docs --output ./intel` | `./intel/` | `./intel/.intel/state.json` |

### 步骤 2：加载或创建状态文件

读取 `state.json`，如不存在则创建默认结构：

```json
{
  "version": "1.0",
  "updated_at": "2026-03-09T20:30:00Z",

  "queue": {
    "pending": [],
    "processing": {},
    "failed": {}
  },

  "processed": {},

  "stats": {
    "total_files": 0,
    "total_intelligence": 0,
    "last_run": null
  }
}
```

**状态文件字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `queue.pending` | 数组 | 待处理文件列表 |
| `queue.processing` | 对象 | 正在处理的文件 |
| `queue.failed` | 对象 | 失败的文件及错误信息 |
| `processed` | 对象 | 已完成文件的元数据 |
| `stats` | 对象 | 统计信息 |

### 步骤 3：扫描源目录

递归扫描 `source_dir` 查找支持的文件：

- **Markdown**: `*.md`
- **文本**: `*.txt`
- **PDF**: `*.pdf`
- **Word**: `*.docx`

使用 Glob 查找所有匹配文件：
```
glob pattern: **/*.{md,txt,pdf,docx}
```

### 步骤 4：构建处理队列

对每个扫描到的文件，检查其状态：

```python
for file in scanned_files:
    mtime = get_file_mtime(file)

    if file in state.processed:
        # 已处理过，检查是否有变更
        stored_mtime = state.processed[file].source_mtime
        if mtime <= stored_mtime:
            continue  # 无变更，跳过
        else:
            # 有变更，需要重新处理
            state.queue.pending.append({"path": file, "mtime": mtime})
    elif file in state.queue.failed:
        # 之前失败过，加入重试
        if state.queue.failed[file].retries < 1:
            state.queue.pending.append({"path": file, "mtime": mtime})
    else:
        # 新文件
        state.queue.pending.append({"path": file, "mtime": mtime})
```

### 步骤 5：逐个处理文件

对 `queue.pending` 中的每个文件：

#### 5.1 移入处理中状态

```json
// 更新 state.json
{
  "queue": {
    "pending": [...],  // 从中移除该文件
    "processing": {
      "docs/report1.md": {
        "started_at": "2026-03-09T10:30:00Z",
        "session": "20260309-103000",
        "mtime": 1709987400
      }
    },
    "failed": {}
  }
}
```

立即写入 `state.json`（确保状态持久化）。

#### 5.2 处理文件格式

| 格式 | 操作 |
|--------|--------|
| `.md`, `.txt` | 直接读取 |
| `.pdf` | 智能分页读取（先检查页数） |
| `.docx` | 使用 pandoc 转换为 markdown 后读取 |

**对于 docx 文件：**
```bash
pandoc source.docx -t markdown -o temp.md
```

如果 pandoc 不可用，记录错误并标记为失败。

#### 5.3 调用情报分析 Agent

启动 `intelligence-analyzer` agent，传入：
- 文件路径（如需转换则先转换）
- 会话 ID

```
使用 Agent 工具，subagent_type="intelligence-analyzer"
提示词："分析文件: {file_path}。会话 ID: {session_id}"
```

#### 5.4 处理 Agent 输出

解析 agent 返回的 JSON：

**如果 `has_strategic_value: false`：**
- 记录为已完成，0 个情报项
- 不生成情报卡片

**如果 `has_strategic_value: true`：**
- 对 `intelligence_items` 中的每个项：
  1. 生成带 frontmatter + content 的 markdown 文件
  2. 写入 `{output_dir}/{domain}/{filename}`（用户可见）
  3. 处理文件名冲突（追加序号）

#### 5.5 更新状态（成功）

```json
{
  "processed": {
    "docs/report1.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-09T10:35:00Z",
      "intelligence_count": 3,
      "output_files": [
        "Emerging-Tech/20260309-ai-security.md"
      ],
      "session": "20260309-103000"
    }
  },
  "queue": {
    "processing": {}  // 移除该文件
  },
  "stats": {
    "total_files": 1,
    "total_intelligence": 3,
    "last_run": "2026-03-09T10:35:00Z"
  }
}
```

立即写入 `state.json`。

#### 5.6 更新状态（失败）

```json
{
  "queue": {
    "processing": {},  // 移除该文件
    "failed": {
      "docs/encrypted.pdf": {
        "error": "Agent timeout",
        "failed_at": "2026-03-09T10:40:00Z",
        "retries": 0,
        "mtime": 1709987500
      }
    }
  }
}
```

立即写入 `state.json`。

### 步骤 6：重试失败文件

初始处理完成后，对 `queue.failed` 中 `retries < 1` 的文件重试一次：

1. 递增 `retries` 计数
2. 移回 `queue.pending`
3. 重新处理
4. 如再次失败，保留在 `queue.failed` 中

### 步骤 7：归档历史数据（可选）

每月初，将上月及更早的 `processed` 数据归档到 `history/`：

```json
// history/2026-02.json
{
  "month": "2026-02",
  "processed": {
    "jan-report.md": {
      "source_mtime": 1708000000,
      "processed_at": "2026-02-15T10:00:00Z",
      "intelligence_count": 2,
      "archived_at": "2026-03-01T00:00:00Z"
    }
  },
  "stats": {
    "files_processed": 12,
    "intelligence_extracted": 25
  }
}
```

归档后从 `state.json` 的 `processed` 中移除这些条目。

### 步骤 8：生成汇总报告

所有文件处理完成后，输出汇总：

```
## 情报提取完成

### 汇总
- **已处理**: 12 个文件
- **已跳过**（无变更）: 5 个文件
- **失败**: 1 个文件
- **情报项**: 18 条

### 输出位置
- Threat-Landscape: 3 张卡片
- Industry-Analysis: 5 张卡片
- Emerging-Tech: 8 张卡片
- Vendor-Intelligence: 2 张卡片

### 失败文件
- docs/encrypted.pdf: Agent timeout（已重试一次）

### 后续步骤
- 在输出目录查看待审核的情报卡片
- 添加新源文件后可再次运行 /intel-distill
```

## 状态文件完整结构

```json
{
  "version": "1.0",
  "updated_at": "2026-03-09T20:30:00Z",

  "queue": {
    "pending": [
      {"path": "docs/report1.md", "mtime": 1709987400},
      {"path": "docs/report2.pdf", "mtime": 1709987500}
    ],
    "processing": {
      "docs/report3.md": {
        "started_at": "2026-03-09T20:25:00Z",
        "session": "20260309-202500",
        "mtime": 1709987600
      }
    },
    "failed": {
      "docs/encrypted.pdf": {
        "error": "Agent timeout",
        "failed_at": "2026-03-09T20:20:00Z",
        "retries": 1,
        "mtime": 1709987300
      }
    }
  },

  "processed": {
    "ai-security-report-2026.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-09T20:15:00Z",
      "intelligence_count": 3,
      "output_files": [
        "Industry-Analysis/20260309-ai-security-market-growth.md",
        "Emerging-Tech/20260309-ai-agent-vulnerability-detection.md",
        "Policy-Regulation/20260309-china-ai-security-compliance.md"
      ],
      "session": "20260309-201500"
    }
  },

  "stats": {
    "total_files": 15,
    "total_intelligence": 28,
    "last_run": "2026-03-09T20:30:00Z"
  }
}
```

## 文件变更检测

使用文件修改时间（mtime）进行变更检测：

```bash
# 获取 mtime
stat -f %m file.md      # macOS
stat -c %Y file.md      # Linux
```

比较逻辑：
- 如果存储的 mtime < 当前 mtime → 文件已变更，重新处理
- 如果存储的 mtime == 当前 mtime → 跳过

## 文件名冲突处理

如果情报卡片文件已存在：

1. 检查内容是否相同（相同的 primary_entity、timeframe、key_facts）
2. 如果相同 → 跳过（重复）
3. 如果不同 → 追加序号：`20260309-ai-security-2.md`

## 错误处理

| 错误 | 操作 |
|-------|--------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Pandoc 不可用（docx） | 记录错误，跳过文件 |
| Agent 超时 | 重试一次，然后标记为失败 |
| Agent 输出无效 | 记录错误，标记为失败 |

## 关联 Skills

`intelligence-analyzer` agent 预加载以下 skills：
- **domain-knowledge** - 七大情报领域定义和关键词
- **analysis-methodology** - 战略价值判断标准和提取原则

详细的 markdown 模板和领域特定字段，参见 `skills/output-templates/references/templates.md`。

## 使用示例

```bash
# 处理当前目录下的所有文档，情报卡片输出到当前目录
/intel-distill

# 处理指定目录下的文档，情报卡片输出到源目录
/intel-distill --source ./docs

# 指定输出位置，情报卡片输出到 ./intelligence 目录
/intel-distill --source ./docs --output ./intelligence

# 重新处理所有文件（删除 .intel/state.json 或清空 processed 字段）
```

## 注意事项

- 处理是**顺序执行**的，而非并行（避免上下文问题）
- 大型 PDF 采用智能分页处理
- 状态维护在单个 `state.json` 文件中，每次状态变更立即写入
- 历史数据按月归档到 `history/` 目录
- **情报卡片**输出到用户可见目录（便于发现和访问）
- **管理文件**存放在 `.intel/` 隐藏目录（state.json、history/）
- 如果源文件在 git 仓库中，建议将 `.intel/` 添加到 `.gitignore`