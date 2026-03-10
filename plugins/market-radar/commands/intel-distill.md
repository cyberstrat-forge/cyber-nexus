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

#### 4.1 计算文件内容 Hash

使用 MD5 算法计算文件内容哈希：

```bash
# macOS / Linux 通用
md5sum <file_path> 2>/dev/null || md5 -q <file_path>
```

**Hash 存储位置**：`processed[filepath].content_hash`

#### 4.2 变更检测逻辑

对每个扫描到的文件计算当前 content_hash，与 `state.json` 中记录比对：

| 条件 | 操作 |
|------|------|
| content_hash 相同 | 跳过（无变更） |
| content_hash 不同 | 加入 pending（内容变更） |
| 新文件（无记录） | 加入 pending |
| 之前失败且 retries < 1 | 加入 pending（重试） |

**注意**：`source_mtime` 字段保留用于参考，但变更检测以 `content_hash` 为准。

### 步骤 5：逐个处理文件

#### 5.1 移入 processing 状态

更新 `state.json`，记录 `started_at`、`session`、`content_hash`，立即写入。

#### 5.2 生成会话 ID

```
session_id = YYYYMMDD-HHMMSS 格式
```

#### 5.2.5 预处理清洗（Markdown 降噪）

对源文档使用清洗脚本去除噪声 token，减少 Agent 分析时的无效输入：

```bash
bash ${CLAUDE_PLUGIN_ROOT}/tools/clean-markdown.sh "{file_path}" > "{cleaned_path}"
```

**清洗规则：**
- 删除图片链接（`![Image](url)`、`[![...](url)](url)`），包括引用块内的
- 删除社交媒体嵌入元数据（头像 URL、`@handle`、`Post your reply` 等平台 UI 残留）
- 删除独立的社交平台链接行
- 折叠 3+ 连续空行为 1 行
- **保留**：引用块文字内容、有语义的图片 alt text

**效果**：平均减少约 8% 的 token 输入，社交媒体来源文件可减少 20-35%。100 样本测试验证零信息损失。

如果脚本不可用或执行失败，跳过此步骤，使用原始文本继续处理（降级策略）。

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

**成功**：更新 `processed` 和 `stats`，删除临时文件 `.intel/temp/{session_id}.json`

**失败**：更新 `queue.failed`，保留临时文件供排查

返回格式参见 `agents/references/json-format.md`。

#### 5.6 写入状态

更新 `state.json` 前校验，失败则中止写入。

### 步骤 6：重试失败文件

对 `queue.failed` 中 `retries < 1` 的文件重试一次。

### 步骤 7：归档历史数据

#### 7.1 归档触发条件

每次运行时检查 `processed` 条目，自动归档满足以下条件的记录：

```
processed_at 超过 30 天 → 自动归档
```

#### 7.2 归档操作

1. 将符合条件的条目追加到 `history/YYYY-MM.json`
2. 从 `state.json` 的 `processed` 中移除已归档条目
3. 更新 `stats` 中的 `total_files` 计数

**归档文件结构**：

```
{output_dir}/.intel/
├── state.json              # 当前状态（仅保留 30 天内数据）
└── history/
    ├── 2026-01.json        # 2026年1月归档
    ├── 2026-02.json        # 2026年2月归档
    └── ...
```

#### 7.3 归档文件格式

归档文件使用与 `state.json` 相同的 Schema，仅包含 `processed` 字段。

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