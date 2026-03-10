---
name: intel-distill
description: Extract strategic intelligence from source documents and generate intelligence cards
argument-hint: "[--source <目录>] [--output <目录>]"
allowed-tools: ["Read", "Write", "Grep", "Glob", "Bash", "Agent"]
---

## 命令概述

执行情报提取工作流：扫描源文档，分析战略价值，并在输出目录生成情报卡片。

## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <dir>` | 否 | 包含文档的源目录（默认：当前目录） |
| `--output <dir>` | 否 | 情报卡片输出目录（默认：当前目录） |
| `--help` | 否 | 显示使用帮助 |

```bash
# 处理当前目录下的所有文档
/intel-distill

# 处理指定目录下的文档
/intel-distill --source ./docs

# 指定输出位置
/intel-distill --source ./docs --output ./intelligence

# 显示帮助
/intel-distill --help
```

## 帮助信息

如果用户输入 `--help` 参数，读取并显示帮助文档：

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

### 管理目录（隐藏）

```
{output_dir}/.intel/
├── state.json              # 状态管理
└── history/                # 历史归档（按月）
```

## 执行流程

### 步骤 1：初始化路径

```
source_dir = --source 参数或当前目录
output_dir = --output 参数或 source_dir 或当前目录
intel_dir = output_dir/.intel/
state_file = intel_dir/state.json
```

| 参数情况 | 情报卡片输出位置 | 状态文件位置 |
|---------|-----------------|-------------|
| 无参数 | `./` | `./.intel/state.json` |
| `--source ./docs` | `./docs/` | `./docs/.intel/state.json` |
| `--output ./intel` | `./intel/` | `./intel/.intel/state.json` |
| `--source ./docs --output ./intel` | `./intel/` | `./intel/.intel/state.json` |

### 步骤 2：加载或创建状态文件

读取 `state.json`，如不存在则创建默认结构。

**校验现有 state.json**：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
npx tsx validate-json.ts state {output_dir}/.intel/state.json
```

**处理校验结果**：

| 退出码 | 处理方式 |
|--------|----------|
| 0 | 加载现有状态 |
| 1 | 备份为 `.broken`，创建新文件 |
| 2 | 安装依赖后重试，仍失败则跳过校验 |

**状态文件字段**：

| 字段 | 说明 |
|------|------|
| `queue.pending` | 待处理文件列表 |
| `queue.processing` | 正在处理的文件 |
| `queue.failed` | 失败的文件及错误信息 |
| `processed` | 已完成文件的元数据 |
| `stats` | 统计信息 |

详细结构参见 `schemas/state.schema.json`。

### 步骤 3：扫描源目录

```bash
glob pattern: **/*.{md,txt,pdf,docx}
```

### 步骤 4：构建处理队列

对每个扫描到的文件：
- 已处理且无变更 → 跳过
- 已处理且有变更 → 加入 pending
- 之前失败且 retries < 1 → 加入 pending（重试）
- 新文件 → 加入 pending

### 步骤 5：逐个处理文件

#### 5.1 移入 processing 状态

更新 `state.json`，记录 `started_at`、`session`、`mtime`，立即写入。

#### 5.2 生成会话 ID

```
session_id = YYYYMMDD-HHMMSS 格式
```

#### 5.3 调用情报分析 Agent

```
使用 Agent 工具，subagent_type="intelligence-analyzer"
参数: source, output, session_id
```

Agent 职责：读取文件 → 提取日期 → 分析内容 → 生成卡片 → 检测冲突 → 写入文件 → 返回状态

#### 5.4 校验 Agent 返回结果

```bash
npx tsx validate-json.ts agent-result {output_dir}/.intel/temp/{session_id}.json
```

| 退出码 | 处理方式 |
|--------|----------|
| 0 | 继续更新状态 |
| 1 | 记录错误，重试一次 |
| 2 | 安装依赖后重试 |

#### 5.5 处理返回结果

**成功**：更新 `processed` 和 `stats`

**失败**：更新 `queue.failed`

返回格式参见 `agents/references/json-format.md`。

#### 5.6 写入状态

更新 `state.json` 前校验，失败则中止写入。

### 步骤 6：重试失败文件

对 `queue.failed` 中 `retries < 1` 的文件重试一次。

### 步骤 7：归档历史数据（可选）

每月初归档上月 `processed` 数据到 `history/`。

### 步骤 8：生成汇总报告

输出处理统计、输出位置、失败文件。

## 错误处理

| 错误 | 操作 |
|------|------|
| 文件未找到 | 记录警告，跳过文件 |
| 权限被拒绝 | 记录错误，标记为失败 |
| Agent 返回 error | 记录错误信息，标记为失败 |
| Agent 超时 | 重试一次，然后标记为失败 |
| Schema 校验失败 | 记录错误详情，重试一次，然后标记为失败 |

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
- 建议将 `.intel/` 添加到 `.gitignore`