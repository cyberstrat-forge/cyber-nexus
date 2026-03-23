---
name: intel-pull
description: Pull intelligence content from cyber-pulse API and save as Markdown files
argument-hint: "[--source <name>] [--all] [--output <dir>] [--since <datetime>] [--id <content_id>] [--list-sources] [--add-source] [--remove-source <name>] [--set-default <name>]"
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
| `--since <datetime>` | 否 | 拉取指定时间后的数据（ISO 8601 格式） |
| `--id <content_id>` | 否 | 拉取单条指定情报 |
| `--list-sources` | 否 | 列出所有已配置的情报源 |
| `--add-source` | 否 | 交互式添加情报源 |
| `--remove-source <name>` | 否 | 删除指定情报源 |
| `--set-default <name>` | 否 | 设置默认情报源 |
| `--help` | 否 | 显示帮助信息 |

```bash
# === 增量拉取模式 ===

# 增量拉取（默认源）
/intel-pull

# 指定源拉取
/intel-pull --source cloud

# 拉取所有源
/intel-pull --all

# === 时间范围拉取模式 ===

# 时间范围拉取
/intel-pull --since "2026-03-01"

# 指定输出目录
/intel-pull --output ./docs/inbox

# === 单条拉取模式 ===

# 单条拉取
/intel-pull --id "cnt_20260319143052_a1b2c3d4"

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
| `--id <content_id>` | 单条拉取模式 | 执行单条拉取（步骤 P5-P6） |
| `--since <datetime>` | 时间范围拉取模式 | 执行时间范围拉取（步骤 P3-P4） |
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

┌────────┬─────────────────────────┬──────────┐
│ 名称   │ URL                     │ API Key  │
├────────┼─────────────────────────┼──────────┤
│ local* │ http://localhost:8000   │ ✅ 已设置 │
│ cloud  │ https://pulse.example.com │ ❌ 未设置 │
└────────┴─────────────────────────┴──────────┘
* 默认源

环境变量：
  CYBER_PULSE_LOCAL_KEY=cp_live_***（已设置）
  CYBER_PULSE_CLOUD_KEY=（未设置）
```

### 步骤 A1-A3：添加源（`--add-source`）

调用脚本执行交互式添加：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --add-source
```

**交互流程**：

```
📦 添加情报源

源名称: cloud
API URL: https://pulse.example.com
环境变量名 [CYBER_PULSE_CLOUD_KEY]:

✅ 已添加源 "cloud"
⚠️  请设置环境变量: export CYBER_PULSE_CLOUD_KEY=cp_live_xxx
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

请创建配置文件并设置环境变量：

1. 创建配置文件：
   {
     "sources": [
       {
         "name": "local",
         "url": "http://localhost:8000",
         "key_ref": "CYBER_PULSE_LOCAL_KEY"
       }
     ],
     "default_source": "local"
   }

2. 设置环境变量：
   export CYBER_PULSE_LOCAL_KEY=cp_live_xxx

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
3. 调用 API：`GET /api/v1/contents?cursor={cursor}&limit=100`
4. 解析响应：`response.data` 为内容列表，`response.meta` 包含分页信息
5. 遍历返回数据，写入 Markdown 文件
6. 更新状态文件 cursor
7. 如果 `meta.has_more=true`，重复步骤 3-5
8. 输出拉取统计报告

### 步骤 P3：时间范围拉取（`--since`）

调用脚本执行时间范围拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --since "{datetime}" [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 调用 API：`GET /api/v1/contents?since={since}&limit=100`
2. 解析响应：`response.data` 为内容列表，`response.meta` 包含分页信息
3. 遍历返回数据，写入 Markdown 文件
4. 如果 `meta.has_more=true`，使用返回的 `meta.next_cursor` 继续请求
5. 不更新本地 cursor（cursor 仅用于增量模式）
6. 输出拉取统计报告

### 步骤 P4：`--all` 多源拉取

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

### 步骤 P5：单条拉取（`--id`）

调用脚本执行单条拉取：

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts
pnpm exec tsx pulse/index.ts --id "{content_id}" [--source {name}] [--output {dir}]
```

**脚本执行逻辑**：

1. 调用 API：`GET /api/v1/contents/{content_id}`
2. API 直接返回内容对象（不包装）
3. 写入 Markdown 文件
4. 输出结果

### 步骤 P6：输出拉取报告

**增量拉取报告**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

源: local (http://localhost:8000)
模式: 增量拉取

【拉取统计】
• 新增情报: 15 条
• 写入位置: ./inbox/

【状态更新】
• cursor: cnt_20260320150000_xxx
• 更新时间: 2026-03-20T15:30:00Z

💡 提示: 使用 /intel-distill 处理情报

════════════════════════════════════════════════════════
```

**多源拉取报告**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

【local】✅ 成功
• 新增情报: 15 条

【cloud】❌ 失败
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
      "name": "local",
      "url": "http://localhost:8000",
      "key_ref": "CYBER_PULSE_LOCAL_KEY"
    },
    {
      "name": "cloud",
      "url": "https://pulse.example.com",
      "key_ref": "CYBER_PULSE_CLOUD_KEY"
    }
  ],
  "default_source": "local"
}
```

### 环境变量

API Key 通过环境变量存储，确保安全性：

```bash
# .bashrc / .zshrc
export CYBER_PULSE_LOCAL_KEY=cp_live_xxx
export CYBER_PULSE_CLOUD_KEY=cp_live_yyy
```

---

## 状态管理

### 状态文件

**位置**：`{output_dir}/.intel/state.json`

与 `intel-distill` 共享同一状态文件，在现有结构中新增 `pulse` 字段：

```json
{
  "version": "2.2.0",
  "updated_at": "2026-03-20T15:30:00+08:00",

  "pulse": {
    "cursors": {
      "local": "cnt_20260319143052_a1b2c3d4",
      "cloud": "cnt_20260318120000_xyz789"
    },
    "last_pull": {
      "local": "2026-03-20T10:00:00Z",
      "cloud": "2026-03-20T09:30:00Z"
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
| `pulse.cursors` | object | 各情报源的游标（content_id） |
| `pulse.last_pull` | object | 各情报源的最后拉取时间 |

**设计说明**：
- 复用 `.intel/state.json`，避免多个状态文件
- `pulse` 字段独立，不影响 intel-distill 现有字段
- 版本号升级为 `2.2.0`（新增 pulse 字段）

### 去重策略

**仅依赖 cursor 实现增量拉取**：
- cursor 保证只请求新数据
- 不做文件去重检查（inbox 文件会被 intel-distill 移动）
- 同名文件直接覆盖（幂等操作）

---

## 输出文件格式

### 文件命名

**格式**：`{YYYYMMDD}-{content_id后8位}.md`

**示例**：`20260319-a1b2c3d4.md`

- `YYYYMMDD`：从 `first_seen_at` 提取
- `content_id后8位`：如 `cnt_20260319143052_a1b2c3d4` → `a1b2c3d4`

### 文件内容

```markdown
---
content_id: "cnt_20260319143052_a1b2c3d4"
canonical_hash: "abc123def456..."
first_seen_at: "2026-03-19T14:30:52Z"
pulse_source: "local"
url: "https://example.com/article"
author: "Security Team"
tags: ["vulnerability", "CVE"]
published_at: "2026-03-19T14:00:00Z"
quality_score: 85
source_id: "src_a1b2c3d4"
source_name: "安全客"
source_tier: "T1"
sourceHash: ""
archivedSource: ""
convertedFile: ""
---

# {title}

{content}
```

### Frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `content_id` | string | cyber-pulse 内容 ID（来自 API `id` 字段） |
| `canonical_hash` | string | 去重哈希值 |
| `first_seen_at` | string | 采集时间（来自 API `fetched_at` 字段） |
| `pulse_source` | string | 拉取源名称 |
| `url` | string | 原始 URL（可选） |
| `author` | string | 作者（可选） |
| `tags` | array | 标签列表（可选） |
| `published_at` | string | 发布时间（可选） |
| `quality_score` | number | 质量评分 0-100（可选） |
| `source_id` | string | 情报源 ID（可选） |
| `source_name` | string | 情报源名称（可选） |
| `source_tier` | string | 情报源等级 T0-T3（可选） |
| `sourceHash` | string | 留空（驼峰命名，兼容 intel-distill） |
| `archivedSource` | string | 留空（驼峰命名，兼容 intel-distill） |
| `convertedFile` | string | 留空（驼峰命名，兼容 intel-distill） |

**字段映射说明**（API v1.3.0 → frontmatter）：
- `id` → `content_id`
- `title` → Markdown 标题
- `content` → Markdown 正文
- `fetched_at` → `first_seen_at`

---

## 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 配置文件不存在 | 显示配置示例和设置步骤，退出 |
| 配置文件格式错误 | 显示具体错误位置，退出 |
| 环境变量未设置 | 显示需要设置的环境变量名，退出 |
| API 连接失败 | 显示错误信息，建议检查网络/URL |
| API 认证失败 | 提示 API Key 无效，建议检查环境变量 |
| API 请求超时 | 重试 1 次（间隔 2 秒）；仍失败则记录错误，继续处理下一个源（`--all` 模式）或退出 |
| 响应数据过大 | 分批写入，避免内存溢出 |
| 源名称不存在 | 显示可用源列表，退出 |
| 单条拉取 404 | 提示 content_id 不存在，退出 |

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
| 默认（增量） | `GET /api/v1/contents?cursor={cursor}&limit=100` |
| `--since` | `GET /api/v1/contents?since={since}&limit=100` |
| `--id` | `GET /api/v1/contents/{content_id}` |

**API 响应格式（v1.3.0）**：

列表响应：
```json
{
  "data": [ /* PulseContent 数组 */ ],
  "meta": {
    "next_cursor": "cnt_xxx",
    "has_more": true
  }
}
```

单条响应：直接返回 `PulseContent` 对象（不包装）

---

## 注意事项

- 配置文件存储在插件目录，API Key 通过环境变量管理
- 状态文件与 intel-distill 共享，位于输出目录的 `.intel/` 下
- 输出文件兼容 intel-distill 的 frontmatter 格式
- 建议将 `.intel/` 添加到 `.gitignore`
- 使用 `/intel-distill` 处理拉取后的情报文件