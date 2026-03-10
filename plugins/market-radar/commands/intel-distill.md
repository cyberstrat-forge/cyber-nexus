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
| `--help` | 否 | 显示使用帮助 |

## 帮助信息

如果用户输入 `--help` 参数，读取并显示 `references/intel-distill-guide.md` 的内容：

```
使用 Read 工具读取：
${CLAUDE_PLUGIN_ROOT}/commands/references/intel-distill-guide.md

将内容展示给用户，无需执行后续流程。
```

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

读取 `state.json`，如不存在则创建默认结构。

**校验现有 state.json**：

如果 `state.json` 存在，使用校验脚本验证其结构：

```bash
# 调用校验脚本
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx validate-json.ts state {output_dir}/.intel/state.json
```

**处理校验结果**：

```
if 退出码 == 0:
    # 校验通过，继续加载 state.json
    加载现有状态

elif 退出码 == 1:
    # 校验失败，数据格式错误
    记录警告: "state.json 格式异常，将重新初始化"
    备份损坏文件:
        mv state.json state.json.broken
    创建新的默认 state.json

elif 退出码 == 2:
    # 校验工具不可用（依赖未安装）
    尝试安装依赖:
        cd ${CLAUDE_PLUGIN_ROOT}/scripts && npm install
    重新执行校验
    如仍失败，跳过校验，直接加载 state.json（降级处理）
```

**默认结构**：

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
        # 之前失败过，检查重试次数
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

#### 5.2 生成会话 ID

```
session_id = YYYYMMDD-HHMMSS 格式
例如: 20260310-103000
```

#### 5.3 调用情报分析 Agent

启动 `intelligence-analyzer` agent，传入源文件路径、输出目录和会话 ID：

```
使用 Agent 工具，subagent_type="intelligence-analyzer"
提示词：
"分析文件并生成情报卡片:

source: {file_path}
output: {output_dir}
session_id: {session_id}

请按照以下流程执行:
1. 读取源文件
2. 提取发布日期（从 frontmatter / PDF元数据 / 文件名 / 文件系统）
3. 分析战略价值
4. 生成情报卡片（按领域模板）
5. 写入输出目录
6. 返回轻量状态 JSON"
```

**Agent 完整职责**：

| 步骤 | 说明 |
|------|------|
| 读取文件 | 支持 .md, .txt, .pdf, .docx |
| 提取日期 | 从 frontmatter / PDF元数据 / 文件名 / 文件系统 |
| 分析内容 | 评估战略价值、领域分类 |
| 生成卡片 | 按 output-templates skill 中的模板 |
| 检测冲突 | 使用 Glob 检查现有文件，必要时追加序号 |
| 写入文件 | 使用 Write 工具写入情报卡片 |
| 返回状态 | 轻量 JSON（不含情报内容） |

#### 5.4 校验 Agent 返回结果

Agent 返回轻量 JSON 后，进行校验：

**步骤 1：保存 Agent 输出到临时文件**

```
将 agent 返回的 JSON 保存到临时文件：
{output_dir}/.intel/temp/{session_id}.json
```

**步骤 2：调用校验脚本**

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx validate-json.ts agent-result {output_dir}/.intel/temp/{session_id}.json
```

**步骤 3：处理校验结果**

| 退出码 | 含义 | 处理方式 |
|--------|------|----------|
| 0 | 校验通过 | 继续处理状态更新 |
| 1 | 校验失败 | 记录错误，触发重试 |
| 2 | 工具不可用 | 尝试安装依赖后重试，仍失败则跳过校验 |

**校验失败处理**：

```
if 校验失败:
    解析校验错误输出
    记录到 state.queue.failed:
    {
      "file.pdf": {
        "error": "Agent result validation failed",
        "validation_errors": [
          "status: required field missing",
          "source_file: required field missing"
        ],
        "failed_at": "2026-03-10T10:40:00Z",
        "retries": 0,
        "mtime": 1709987500
      }
    }

    if retries < 1:
        # 自动重试一次
        retries += 1
        移回 queue.pending
        重新处理
    else:
        # 已重试过，保留在 failed
        不再处理
```

#### 5.5 处理 Agent 返回结果

**成功且有情报**（status=success, has_strategic_value=true）：

```json
// Agent 返回
{
  "status": "success",
  "source_file": "docs/report.md",
  "has_strategic_value": true,
  "intelligence_count": 2,
  "output_files": [
    "Industry-Analysis/20260301-ai-security-market-growth.md",
    "Emerging-Tech/20260301-ai-agent-architecture-flaw.md"
  ],
  "source_meta": { "title": "...", "published": "2026-03-01" },
  "processing_notes": "成功提取 2 条情报"
}

// 更新状态
{
  "processed": {
    "docs/report.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-10T10:35:00Z",
      "intelligence_count": 2,
      "output_files": [
        "Industry-Analysis/20260301-ai-security-market-growth.md",
        "Emerging-Tech/20260301-ai-agent-architecture-flaw.md"
      ],
      "session": "20260310-103000"
    }
  },
  "stats": {
    "total_files": +1,
    "total_intelligence": +2,
    "last_run": "2026-03-10T10:35:00Z"
  }
}
```

**成功但无情报**（status=success, has_strategic_value=false）：

```json
// Agent 返回
{
  "status": "success",
  "source_file": "docs/general-notes.md",
  "has_strategic_value": false,
  "source_meta": { "title": "...", "published": "2026-03-05" },
  "processing_notes": "未发现战略价值信息"
}

// 更新状态
{
  "processed": {
    "docs/general-notes.md": {
      "source_mtime": 1709987400,
      "processed_at": "2026-03-10T10:35:00Z",
      "intelligence_count": 0,
      "output_files": [],
      "session": "20260310-103000"
    }
  }
}
```

**失败**（status=error）：

```json
// Agent 返回
{
  "status": "error",
  "source_file": "docs/report.docx",
  "has_strategic_value": false,
  "source_meta": { "title": null, "published": null },
  "error_code": "CONVERSION_FAILED",
  "error_message": "pandoc not available for docx conversion",
  "processing_notes": "无法转换 docx 文件"
}

// 更新状态
{
  "queue": {
    "processing": {},
    "failed": {
      "docs/report.docx": {
        "error": "CONVERSION_FAILED: pandoc not available for docx conversion",
        "failed_at": "2026-03-10T10:40:00Z",
        "retries": 0,
        "mtime": 1709987500
      }
    }
  }
}
```

#### 5.6 更新状态并写入

每次状态变更后，立即写入 `state.json`。

**写入前校验**：

```bash
# 1. 保存新状态到临时文件
# {output_dir}/.intel/temp/state-new.json

# 2. 调用校验脚本
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx validate-json.ts state {output_dir}/.intel/temp/state-new.json

# 3. 根据校验结果处理
if 退出码 == 0:
    # 校验通过，替换原文件
    mv temp/state-new.json state.json
else:
    # 校验失败，保留原文件
    记录错误: "状态数据异常，中止写入"
    抛出异常，停止处理
```

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
- docs/report.docx: CONVERSION_FAILED（已重试一次）

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
      {"path": "docs/report1.md", "mtime": 1709987400}
    ],
    "processing": {},
    "failed": {
      "docs/report2.docx": {
        "error": "CONVERSION_FAILED: pandoc not available",
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
        "Emerging-Tech/20260309-ai-agent-vulnerability-detection.md"
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

## 错误处理

| 错误 | 操作 |
|-------|--------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Agent 返回 error | 记录错误信息，标记为失败 |
| Agent 超时 | 重试一次，然后标记为失败 |
| JSON 解析失败 | 重试一次，然后标记为失败 |
| Schema 校验失败 | 记录校验错误详情，重试一次，然后标记为失败 |

## 关联 Skills

`intelligence-analyzer` agent 预加载以下 skills：
- **domain-knowledge** - 七大情报领域定义和关键词
- **analysis-methodology** - 战略价值判断标准和提取原则
- **output-templates** - 七大领域的前台模板和正文模板

详细的 markdown 模板和领域特定字段，参见 `skills/output-templates/references/templates.md`。

## Schema 校验

项目使用 TypeScript + Ajv 进行 JSON Schema 校验。

### 校验脚本

位置：`scripts/validate-json.ts`

**使用方式**：

```bash
# 安装依赖（首次使用）
cd ${CLAUDE_PLUGIN_ROOT}/scripts && npm install

# 校验 agent 返回结果
npx tsx validate-json.ts agent-result ./temp/result.json

# 校验 state.json
npx tsx validate-json.ts state ./.intel/state.json
```

### 校验时机

| 时机 | Schema | 说明 |
|------|--------|------|
| Agent 返回后 | `agent-result.schema.json` | 校验轻量返回格式，失败则重试 |
| 启动时 | `state.schema.json` | 校验现有状态，损坏则备份重建 |
| 写入前 | `state.schema.json` | 校验新状态，异常则中止 |

### 校验内容

**agent-result.schema.json**：
- status 字段（success/error）
- 必需字段完整性（source_file, has_strategic_value, source_meta, processing_notes）
- 成功时必需字段（intelligence_count, output_files）
- 错误时必需字段（error_code, error_message）

**state.schema.json**：
- 版本号格式（X.Y）
- 时间戳格式（ISO 8601）
- 队列结构（pending、processing、failed）
- 处理记录结构
- 统计信息结构

### 校验失败处理

| 场景 | 处理方式 |
|------|----------|
| Agent 返回校验失败 | 记录错误详情，自动重试 1 次 |
| state.json 启动校验失败 | 备份为 `.broken`，创建新文件 |
| state.json 写入前校验失败 | 中止写入，保留原文件 |

### 调用链流程图

```
/intel-distill
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤 2: 加载 state.json                                       │
│                                                              │
│  state.json 存在?                                            │
│     │                                                        │
│     ├─ 是 ──► npx tsx validate-json.ts state state.json      │
│     │              │                                         │
│     │              ├─ ✓ 通过 ──► 加载现有状态                  │
│     │              │                                         │
│     │              └─ ✗ 失败 ──► 备份为 .broken               │
│     │                              创建默认 state.json        │
│     │                                                        │
│     └─ 否 ──► 创建默认 state.json                             │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤 3-4: 扫描文件、构建队列                                   │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤 5: 处理每个文件                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 5.3 调用 intelligence-analyzer agent                    │ │
│  │     │                                                   │ │
│  │     │  参数: source, output, session_id                 │ │
│  │     │                                                   │ │
│  │     │  Agent 内部执行:                                   │ │
│  │     │  - 读取文件                                        │ │
│  │     │  - 提取日期                                        │ │
│  │     │  - 分析内容                                        │ │
│  │     │  - 生成卡片（按模板）                               │ │
│  │     │  - 检测冲突                                        │ │
│  │     │  - 写入文件                                        │ │
│  │     ▼                                                   │ │
│  │  返回轻量 JSON                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 5.4 校验 Agent 返回                                      │ │
│  │                                                         │ │
│  │  npx tsx validate-json.ts agent-result \                │
│  │      temp/{session}.json                                │ │
│  │     │                                                   │ │
│  │     ├─ ✓ 通过 ──► 更新状态                              │ │
│  │     │                                                   │ │
│  │     └─ ✗ 失败 ──► retries < 1?                          │ │
│  │                      │                                  │ │
│  │                      ├─ 是 ──► 重试                     │ │
│  │                      │                                  │ │
│  │                      └─ 否 ──► 记录到 failed            │ │
│  └────────────────────────────────────────────────────────┘ │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 5.5-5.6 更新状态、写入 state.json                        │ │
│  │                                                         │ │
│  │  更新 state 对象                                        │ │
│  │     │                                                   │ │
│  │     ▼                                                   │ │
│  │  保存到 temp/state-new.json                            │ │
│  │     │                                                   │ │
│  │     ▼                                                   │ │
│  │  npx tsx validate-json.ts state temp/state-new.json    │ │
│  │     │                                                   │ │
│  │     ├─ ✓ 通过 ──► 替换 state.json                       │ │
│  │     │                                                   │ │
│  │     └─ ✗ 失败 ──► 中止写入，保留原文件                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ 步骤 6-8: 重试、归档、生成报告                                 │
└─────────────────────────────────────────────────────────────┘
```

**校验脚本调用总结**：

| 步骤 | 调用命令 | 成功处理 | 失败处理 |
|------|----------|----------|----------|
| 2. 启动校验 | `npx tsx validate-json.ts state state.json` | 加载状态 | 备份重建 |
| 5.4 返回校验 | `npx tsx validate-json.ts agent-result temp/{session}.json` | 更新状态 | 重试/记录失败 |
| 5.6 写入前校验 | `npx tsx validate-json.ts state temp/state-new.json` | 替换文件 | 中止处理 |

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
- Agent 负责完整的文件处理流程（读取、分析、生成、写入）
- 状态维护在单个 `state.json` 文件中，每次状态变更立即写入
- 历史数据按月归档到 `history/` 目录
- **情报卡片**输出到用户可见目录（便于发现和访问）
- **管理文件**存放在 `.intel/` 隐藏目录（state.json、history/）
- 如果源文件在 git 仓库中，建议将 `.intel/` 添加到 `.gitignore`