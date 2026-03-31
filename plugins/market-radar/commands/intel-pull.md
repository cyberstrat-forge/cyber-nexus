---
name: intel-pull
description: Pull intelligence content from cyber-pulse API and save as Markdown files
argument-hint: "[--source <name>] [--all] [--output <dir>] [--since <datetime>] [--until <datetime>] [--init] [--preview] [--list-sources] [--add-source] [--remove-source <name>] [--set-default <name>]"
allowed-tools: Read, Write, Grep, Glob, Bash, Agent
---

## 命令概述

从 cyber-pulse 情报服务 API 拉取标准化情报内容，存储为本地 Markdown 文件，供 `intel-distill` 命令进一步处理。

**职责分离**：
- `intel-pull`：从远程 API 拉取情报 → 写入 `inbox/`
- `intel-distill`：处理 `inbox/` → 生成情报卡片

```
cyber-pulse (情报采集系统)
    ↓ Pull API (cursor-based)
intel-pull (情报拉取命令)
    ↓ 写入 inbox/
intel-distill (情报提取命令)
    ↓ 处理并移动
intelligence/ (情报卡片)
```

## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <name>` | 否 | 指定情报源名称（默认使用 default_source） |
| `--all` | 否 | 顺序拉取所有配置的情报源 |
| `--output <dir>` | 否 | 输出目录（默认 `inbox/`） |
| `--since <datetime>` | 否 | 拉取指定发布时间起点后的数据（ISO 8601 格式） |
| `--until <datetime>` | 否 | 拉取指定发布时间终点前的数据（ISO 8601 格式） |
| `--init` | 否 | 首次同步/重新同步，从开头遍历历史数据 |
| `--preview` | 否 | 预览最新一页（仅 50 条，不更新状态文件） |
| `--list-sources` | 否 | 列出所有已配置的情报源 |
| `--add-source` | 否 | 交互式添加情报源 |
| `--remove-source <name>` | 否 | 删除指定情报源 |
| `--set-default <name>` | 否 | 设置默认情报源 |
| `--help` | 否 | 显示帮助信息 |

```bash
# === 增量拉取模式 ===

# 增量拉取（默认源，使用状态文件中的 cursor）
/intel-pull

# 指定源拉取
/intel-pull --source cloud

# 拉取所有源
/intel-pull --all

# === 首次/重新同步模式 ===

# 首次同步（从头遍历历史数据）
/intel-pull --init

# === 时间范围拉取模式 ===

# 时间范围拉取（仅指定起点）
/intel-pull --since "2026-03-01"

# 时间范围拉取（指定起点和终点）
/intel-pull --since "2026-03-01" --until "2026-03-31"

# === 预览模式 ===

# 预览最新一页数据（不更新状态文件）
/intel-pull --preview

# === 其他选项 ===

# 指定输出目录
/intel-pull --output ./docs/inbox

# === 源管理模式 ===

# 列出所有源
/intel-pull --list-sources

# 交互式添加源
/intel-pull --add-source

# 删除源
/intel-pull --remove-source cloud

# 设置默认源
/intel-pull --set-default cloud

# 显示帮助
/intel-pull --help
```

## 帮助信息

如果用户输入 `--help` 参数，读取并显示帮助文档：

```
使用 Read 工具读取：
${CLAUDE_PLUGIN_ROOT}/commands/references/intel-pull-guide.md

将内容展示给用户，无需执行后续流程。
```

---

## 执行流程

### 步骤 0：参数解析与模式判断

解析命令参数，确定执行模式：

| 条件 | 执行模式 | 后续流程 |
|------|---------|---------|
| `--list-sources` | 列出源模式 | 执行源列表显示（步骤 L1） |
| `--add-source` | 添加源模式 | 执行交互式添加（步骤 A1-A3） |
| `--remove-source <name>` | 删除源模式 | 执行源删除（步骤 D1-D2） |
| `--set-default <name>` | 设置默认源模式 | 执行默认源设置（步骤 S1-S2） |
| `--preview` | 预览模式 | 执行预览拉取（步骤 P5） |
| `--init` | 首次同步模式 | 执行首次同步（步骤 P4） |
| `--since` 或 `--until` | 时间范围拉取模式 | 执行时间范围拉取（步骤 P3） |
| 默认 | 增量拉取模式 | 执行增量拉取（步骤 P1-P2） |

```
┌─────────────────────────────────────────────────────────────┐
│                      参数解析                                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        ↓          ↓          ↓          ↓          ↓
    --list-sources  --add-source  --remove-source  --set-default  默认/其他
        │          │          │          │          │
        ↓          ↓          ↓          ↓          ↓
    列出源模式  添加源模式  删除源模式  设置默认源  拉取模式
                                                   │
                                   ┌───────┬───────┼───────┬───────┐
                                   ↓       ↓       ↓       ↓       ↓
                               --preview --init  --since  --until  默认增量
                                   │       │       │       │       │
                                   ↓       ↓       ↓       ↓       ↓
                               预览模式 首次同步 时间范围 时间范围 增量拉取
```

---

## 源管理模式

### 步骤 L1：列出源（`--list-sources`）

调用脚本列出所有配置的情报源：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --list-sources
```

**输出示例**：

```
📡 已配置的情报源

┌─────────────┬─────────────────────────┬──────────┐
│ 名称        │ URL                     │ API Key  │
├─────────────┼─────────────────────────┼──────────┤
│ cyber-pulse*│ https://pulse.example.com│ ✅ 已设置 │
│ local       │ http://localhost:8000   │ ❌ 未设置 │
└─────────────┴─────────────────────────┴──────────┘
* 默认源
```

### 步骤 A1-A3：添加源（`--add-source`）

调用脚本执行交互式添加：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --add-source
```

**交互流程**：

```
添加新的情报源
----------------

源名称 (如: cyber-pulse): my-source
API URL (如: https://api.example.com): https://pulse.example.com
API Key: cp_live_a1b2c3d4e5f6789012345678abcdef01

成功添加源: my-source
```

### 步骤 D1-D2：删除源（`--remove-source <name>`）

调用脚本删除指定源：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --remove-source {name}
```

**输出示例**：

```
✅ 已删除源 "cloud"
```

### 步骤 S1-S2：设置默认源（`--set-default <name>`）

调用脚本设置默认源：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --set-default {name}
```

**输出示例**：

```
✅ 已将 "cloud" 设置为默认源
```

---

## 拉取模式

### 步骤 P0：检查脚本依赖

在执行脚本前，检查 `node_modules` 是否存在：

```bash
检查 ${CLAUDE_PLUGIN_ROOT}/scripts/node_modules 目录是否存在
```

**如果不存在**，提示用户安装依赖并退出：

```
⚠️  脚本依赖未安装

请先安装依赖：
cd ${CLAUDE_PLUGIN_ROOT}/scripts && pnpm install

安装完成后重新执行命令。
```

### 步骤 P1：检查配置文件

检查配置文件是否存在：

**配置文件位置**：`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/pulse-sources.json`

**如果不存在**，显示错误提示和配置示例，退出：

```
⚠️  未找到情报源配置文件

配置文件位置：plugins/market-radar/.claude-plugin/pulse-sources.json

请创建配置文件：

{
  "sources": [
    {
      "name": "cyber-pulse",
      "url": "https://pulse.example.com",
      "api_key": "cp_live_xxx"
    }
  ],
  "default_source": "cyber-pulse"
}

完成后重新执行命令。
```

### 步骤 P2：增量拉取（默认模式）

调用脚本执行增量拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 加载状态文件（不存在则创建默认结构）
2. 获取对应源的 cursor
3. 调用 API：`GET /api/v1/items?cursor={cursor}&limit=50`
4. 解析响应：`response.data` 为内容列表，`response.next_cursor` 包含下一页游标
5. 遍历返回数据，写入 Markdown 文件
6. 更新状态文件 cursor
7. 如果 `has_more=true`，使用 `next_cursor` 重复步骤 3-5
8. 输出拉取统计报告

### 步骤 P3：时间范围拉取（`--since` / `--until`）

调用脚本执行时间范围拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --since "{datetime}" [--until "{datetime}"] [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 构建请求参数：`since=...&until=...`
2. 调用 API：`GET /api/v1/items?since={since}&until={until}&limit=50`
3. 解析响应：`response.data` 为内容列表，`response.next_cursor` 包含下一页游标
4. 遍历返回数据，写入 Markdown 文件
5. 如果 `has_more=true`，使用 `next_cursor` 继续请求（保留时间参数）
6. 不更新本地 cursor（cursor 仅用于增量模式）
7. 输出拉取统计报告

### 步骤 P4：首次同步（`--init`）

调用脚本执行首次同步：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --init [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 清空状态文件中的 cursor
2. 调用 API：`GET /api/v1/items?from=beginning&limit=50`
3. 解析响应：`response.data` 为内容列表，`response.next_cursor` 包含下一页游标
4. 遍历返回数据，写入 Markdown 文件
5. 更新状态文件 cursor
6. 如果 `has_more=true`，使用 `next_cursor` 重复步骤 3-5
7. 输出拉取统计报告

### 步骤 P5：预览拉取（`--preview`）

调用脚本执行预览拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --preview [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 调用 API：`GET /api/v1/items?limit=50`（不传 cursor 或 from 参数）
2. 解析响应：获取最新一页数据
3. 遍历返回数据，写入 Markdown 文件
4. 不执行分页（仅一页）
5. 不更新状态文件 cursor
6. 输出拉取统计报告

### 步骤 P6：`--all` 多源拉取

调用脚本执行多源拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --all [--output {dir}]
```

**脚本执行逻辑**：

1. 遍历配置中的所有源
2. 对每个源执行增量拉取流程
3. 记录每个源的执行结果（成功/失败/部分成功）
4. 仅更新成功拉取的源的 cursor
5. 失败的源保留原有 cursor，下次拉取时可重试
6. 一个源失败不影响其他源继续
7. 输出汇总报告

### 步骤 P7：输出拉取报告

**增量拉取报告**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

源: cyber-pulse (https://pulse.example.com)
模式: 增量拉取

【拉取统计】
• 新增情报: 15 条
• 写入位置: ./inbox/

【状态更新】
• cursor: item_b2c3d4e5
• 更新时间: 2026-03-30T15:30:00Z

💡 提示: 使用 /intel-distill 处理情报

════════════════════════════════════════════════════════
```

**多源拉取报告**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

【cyber-pulse】✅ 成功
• 新增情报: 15 条

【local】❌ 失败
• 错误: API 连接超时

【汇总】
• 总计: 15 条
• 写入位置: ./inbox/

════════════════════════════════════════════════════════
```

---

## 配置管理

### 配置文件

**位置**：`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/pulse-sources.json`

```json
{
  "sources": [
    {
      "name": "cyber-pulse",
      "url": "https://pulse.example.com",
      "api_key": "cp_live_a1b2c3d4e5f6789012345678abcdef01"
    },
    {
      "name": "local",
      "url": "http://localhost:8000",
      "api_key": "cp_live_xxx"
    }
  ],
  "default_source": "cyber-pulse"
}
```

### API Key 管理

API Key 直接存储在配置文件中，简化用户配置流程：

- 配置文件位于插件目录，属于项目级配置
- 可通过 `--add-source` 交互式添加源时输入 API Key
- 支持多个情报源配置，每个源独立管理

---

## 状态管理

### 状态文件

**位置**：`{output_dir}/.intel/state.json`

与 `intel-distill` 共享同一状态文件，在现有结构中维护 `pulse` 字段：

```json
{
  "version": "2.2.0",
  "updated_at": "2026-03-30T15:30:00+08:00",

  "pulse": {
    "cursors": {
      "cyber-pulse": {
        "cursor": "item_b2c3d4e5",
        "last_pull": "2026-03-30T10:00:00Z"
      },
      "local": {
        "cursor": "item_a1b2c3d4",
        "last_pull": "2026-03-30T09:30:00Z"
      }
    }
  },

  "queue": { ... },
  "review": { ... },
  "processed": { ... },
  "stats": { ... }
}
```

### 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `pulse.cursors.{source}` | object | 各情报源的游标状态 |
| `pulse.cursors.{source}.cursor` | string | 游标位置（格式 `item_{8位hex}`） |
| `pulse.cursors.{source}.last_pull` | string | 最后拉取时间（ISO 8601） |

### cursor 更新规则

| 模式 | 首次请求参数 | 分页请求参数 | cursor 操作 |
|------|-------------|-------------|-------------|
| 增量（默认） | `cursor={saved}` | `cursor={next_cursor}` | 读取 → 更新 |
| `--init` | `from=beginning` | `cursor={next_cursor}` | 清空 → 重建 |
| `--since` | `since=...` | `since=...&cursor={next_cursor}` | 不更新 |
| `--preview` | 无参数 | 无分页 | 不更新 |

**设计说明**：
- 复用 `.intel/state.json`，避免多个状态文件
- `pulse` 字段独立，不影响 intel-distill 现有字段
- cursor 格式为 `item_{8位hex}`（如 `item_a1b2c3d4`）

### 去重策略

**仅依赖 cursor 实现增量拉取**：
- cursor 保证只请求新数据
- 不做文件去重检查（inbox 文件会被 intel-distill 移动）
- 同名文件直接覆盖（幂等操作）

---

## 输出文件格式

### 文件命名

**格式**：`{YYYYMMDD}-{item_id}.md`

**示例**：`20260330-item_a1b2c3d4.md`

- `YYYYMMDD`：从 `published_at` 提取（若无则使用 `first_seen_at`）
- `item_id`：API 返回的 ID，格式 `item_{8位hex}`

### 文件内容

```markdown
---
# ============================================
# 第一组：核心标识（必须填写）
# ============================================
item_id: "item_a1b2c3d4"
source_type: "cyber-pulse"
first_seen_at: "2026-03-30T09:00:00Z"

# ============================================
# 第二组：内容元数据
# ============================================
title: "某APT组织近期攻击活动分析"
url: "https://example.com/article"
author: "安全研究员"
tags: ["APT", "威胁情报"]
published_at: "2026-03-30T08:00:00Z"

# ============================================
# 第三组：来源信息
# ============================================
source_id: "src_abc12345"
source_name: "Security Weekly"
source_url: "https://example.com/feed.xml"
source_tier: "T1"
source_score: 75.0

# ============================================
# 第四组：质量指标
# ============================================
completeness_score: 0.85
word_count: 1500

# ============================================
# 第五组：处理追溯（预处理脚本填充）
# ============================================
content_hash: ""
archived_path: ""
---

# {title}

{body}
```

### Frontmatter 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `item_id` | string | ✅ | 唯一标识符（格式 `item_{8位hex}`） |
| `source_type` | string | ✅ | 来源类型，固定为 `cyber-pulse` |
| `first_seen_at` | datetime | ✅ | 采集时间（来自 API `fetched_at` 字段） |
| `title` | string | ✅ | 文档标题 |
| `url` | string | ❌ | 原文链接 |
| `author` | string | ❌ | 作者 |
| `tags` | array | ❌ | 标签列表 |
| `published_at` | datetime | ❌ | 原文发布时间 |
| `source_id` | string | ❌ | 情报源 ID（来自 `source.source_id`） |
| `source_name` | string | ❌ | 情报源名称（来自 `source.source_name`） |
| `source_url` | string | ❌ | 情报源 URL（来自 `source.source_url`） |
| `source_tier` | string | ❌ | 情报源等级 T0-T3（来自 `source.source_tier`） |
| `source_score` | number | ❌ | 情报源评分 0-100（来自 `source.source_score`） |
| `completeness_score` | number | ❌ | 内容完整度 0-1 |
| `word_count` | number | ❌ | 正文字数 |
| `content_hash` | string | ✅ | 正文 MD5 哈希（预处理脚本填充） |
| `archived_path` | string | ❌ | 归档路径（cyber-pulse 文件为空） |

**字段映射说明**（API v1 → frontmatter）：
- `id` → `item_id`
- `title` → Markdown 标题 + `title` 字段
- `body` → Markdown 正文
- `fetched_at` → `first_seen_at`
- `source.*` → 对应 `source_*` 字段

---

## 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 配置文件不存在 | 显示配置示例和设置步骤，退出 |
| 配置文件格式错误 | 显示具体错误位置，退出 |
| API Key 未配置 | 提示用户配置 API Key，退出 |
| API 连接失败 | 显示错误信息，建议检查网络/URL |
| API 认证失败 | 提示 API Key 无效，建议检查配置 |
| API 请求超时 | 重试 1 次（间隔 2 秒）；仍失败则记录错误，继续处理下一个源（`--all` 模式）或退出 |
| cursor 无效（404） | 清空 cursor，提示用户执行 `--init` |
| 响应数据过大 | 分批写入，避免内存溢出 |
| 源名称不存在 | 显示可用源列表，退出 |

### 网络请求配置

| 参数 | 值 | 说明 |
|------|-----|------|
| 连接超时 | 10 秒 | 建立连接的超时时间 |
| 请求超时 | 30 秒 | 单次请求的总超时时间 |
| 重试次数 | 1 次 | 超时后重试一次 |
| 重试间隔 | 2 秒 | 重试前等待时间 |

---

## 与 cyber-pulse API 对应

| intel-pull 参数 | cyber-pulse API |
|------------------|-----------------|
| 默认（增量） | `GET /api/v1/items?cursor={cursor}&limit=50` |
| `--init` | `GET /api/v1/items?from=beginning&limit=50` |
| `--since` | `GET /api/v1/items?since={since}&limit=50` |
| `--since --until` | `GET /api/v1/items?since={since}&until={until}&limit=50` |
| `--preview` | `GET /api/v1/items?limit=50` |

**API 响应格式（v1）**：

```json
{
  "data": [ /* PulseItem 数组 */ ],
  "next_cursor": "item_b2c3d4e5",
  "has_more": true,
  "count": 50,
  "server_timestamp": "2026-03-30T10:00:00Z"
}
```

**API 参数约束**：
- `cursor` 和 `from` 不能同时使用
- `cursor` 格式为 `item_{8位hex}`

---

## 注意事项

- 配置文件存储在插件目录，API Key 直接配置在文件中
- 状态文件与 intel-distill 共享，位于输出目录的 `.intel/` 下
- 输出文件采用统一 frontmatter 格式，兼容 intel-distill
- 建议将 `.intel/` 添加到 `.gitignore`
- 使用 `/intel-distill` 处理拉取后的情报文件
- cursor 格式为 `item_{8位hex}`（如 `item_a1b2c3d4`）