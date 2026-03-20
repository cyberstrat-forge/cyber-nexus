# intel-pull 命令设计文档

**版本**: v1.1
**日期**: 2026-03-20
**作者**: 老罗
**状态**: 待批准

---

## 1. 概述

### 1.1 目标与定位

`intel-pull` 是 market-radar 插件的新命令，负责从 cyber-pulse 情报服务 API 拉取标准化情报内容，存储为本地 Markdown 文件，供 `intel-distill` 命令进一步处理。

**职责分离**：
- `intel-pull`：从远程 API 拉取情报 → 写入 `inbox/`
- `intel-distill`：处理 `inbox/` → 生成情报卡片

### 1.2 与 cyber-pulse 的关系

```
cyber-pulse (情报采集系统)
    ↓ Pull API (cursor-based)
intel-pull (情报拉取命令)
    ↓ 写入 inbox/
intel-distill (情报提取命令)
    ↓ 处理并移动
intelligence/ (情报卡片)
```

---

## 2. 命令参数

### 2.1 参数定义

```bash
/intel-pull [选项]
```

| 参数 | 说明 |
|------|------|
| `--source <name>` | 指定情报源名称（默认使用 default_source） |
| `--all` | 顺序拉取所有配置的情报源 |
| `--output <dir>` | 输出目录（默认 `inbox/`） |
| `--since <datetime>` | 拉取指定时间后的数据（ISO 8601 格式） |
| `--id <content_id>` | 拉取单条指定情报 |
| `--list-sources` | 列出所有已配置的情报源 |
| `--add-source` | 交互式添加情报源 |
| `--remove-source <name>` | 删除指定情报源 |
| `--set-default <name>` | 设置默认情报源 |
| `--help` | 显示帮助信息 |

### 2.2 使用示例

```bash
# 增量拉取（默认源）
/intel-pull

# 指定源拉取
/intel-pull --source cloud

# 拉取所有源
/intel-pull --all

# 时间范围拉取
/intel-pull --since "2026-03-01"

# 单条拉取
/intel-pull --id "cnt_20260319143052_a1b2c3d4"

# 指定输出目录
/intel-pull --output ./docs/inbox

# 源管理
/intel-pull --list-sources
/intel-pull --add-source
/intel-pull --remove-source cloud
/intel-pull --set-default cloud
```

---

## 3. 配置管理

### 3.1 配置文件

**位置**：`plugins/market-radar/.claude-plugin/pulse-sources.json`

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

### 3.2 环境变量

API Key 通过环境变量存储，确保安全性：

```bash
# .bashrc / .zshrc
export CYBER_PULSE_LOCAL_KEY=cp_live_xxx
export CYBER_PULSE_CLOUD_KEY=cp_live_yyy
```

### 3.3 配置文件不存在时的行为

显示错误提示和配置示例：

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

---

## 4. 状态管理

### 4.1 状态文件

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

### 4.2 状态字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `pulse.cursors` | object | 各情报源的游标（content_id） |
| `pulse.last_pull` | object | 各情报源的最后拉取时间 |

**设计说明**：
- 复用 `.intel/state.json`，避免多个状态文件
- `pulse` 字段独立，不影响 intel-distill 现有字段
- 版本号升级为 `2.2.0`（新增 pulse 字段）

### 4.3 去重策略

**仅依赖 cursor 实现增量拉取**：

- cursor 保证只请求新数据
- 不做文件去重检查（inbox 文件会被 intel-distill 移动）
- 同名文件直接覆盖（幂等操作）

---

## 5. 输出文件格式

### 5.1 文件命名

**格式**：`{YYYYMMDD}-{content_id后8位}.md`

**示例**：`20260319-a1b2c3d4.md`

- `YYYYMMDD`：从 `first_seen_at` 提取
- `content_id后8位`：如 `cnt_20260319143052_a1b2c3d4` → `a1b2c3d4`

### 5.2 文件内容

```markdown
---
content_id: "cnt_20260319143052_a1b2c3d4"
canonical_hash: "abc123def456..."
first_seen_at: "2026-03-19T14:30:52Z"
last_seen_at: "2026-03-19T15:45:00Z"
source_count: 3
pulse_source: "local"
sourceHash: ""
archivedSource: ""
convertedFile: ""
---

# {normalized_title}

{normalized_body}
```

### 5.3 Frontmatter 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `content_id` | string | cyber-pulse 内容 ID |
| `canonical_hash` | string | 去重哈希值 |
| `first_seen_at` | string | 首次发现时间 |
| `last_seen_at` | string | 最后发现时间 |
| `source_count` | number | 来源数量 |
| `pulse_source` | string | 拉取源名称 |
| `sourceHash` | string | 留空（驼峰命名，兼容 intel-distill） |
| `archivedSource` | string | 留空（驼峰命名，兼容 intel-distill） |
| `convertedFile` | string | 留空（驼峰命名，兼容 intel-distill） |

**字段填充说明**：
- `sourceHash`、`archivedSource`、`convertedFile` 由 intel-distill 处理时填充
- intel-pull 从 API 获取的数据无法提供这些字段，故留空

---

## 6. 执行流程

### 6.1 参数解析与模式判断

```
解析命令参数，确定执行模式：

| 条件 | 执行模式 |
|------|----------|
| `--list-sources` | 列出源模式 |
| `--add-source` | 添加源模式 |
| `--remove-source <name>` | 删除源模式 |
| `--set-default <name>` | 设置默认源模式 |
| `--id <content_id>` | 单条拉取模式 |
| `--since <datetime>` | 时间范围拉取模式 |
| 默认 | 增量拉取模式 |
```

### 6.2 检查脚本依赖

在执行脚本前，检查 `node_modules` 是否存在：

```bash
检查 ${CLAUDE_PLUGIN_ROOT}/scripts/node_modules 目录是否存在
```

**如果不存在**，提示用户安装依赖并退出：

```
⚠️  脚本依赖未安装

请先安装依赖：
cd ${CLAUDE_PLUGIN_ROOT}/scripts && npm install

安装完成后重新执行命令。
```

### 6.3 配置检查流程

```
1. 检查配置文件是否存在
   - 不存在 → 显示错误提示和配置示例，退出

2. 解析配置文件
   - 格式错误 → 显示错误信息，退出

3. 检查环境变量
   - 未设置 → 显示需要设置的环境变量名，退出
```

### 6.4 增量拉取流程

```
1. 加载状态文件（不存在则创建默认结构）
2. 获取对应源的 cursor
3. 调用 API：GET /content?cursor={cursor}&limit=100
4. 遍历返回数据，写入 Markdown 文件
5. 更新状态文件 cursor
6. 如果 has_more=true，重复步骤 3-5
7. 输出拉取统计报告
```

### 6.5 时间范围拉取流程

```
1. 调用 API：GET /content?since={since}&limit=100
2. 遍历返回数据，写入 Markdown 文件
3. 如果 has_more=true，使用返回的 next_cursor 继续请求：
   GET /content?since={since}&cursor={next_cursor}&limit=100
4. 重复步骤 2-3 直到 has_more=false
5. 不更新本地 cursor（cursor 仅用于增量模式）
6. 输出拉取统计报告
```

### 6.6 单条拉取流程

```
1. 调用 API：GET /content/{content_id}
2. 写入 Markdown 文件
3. 输出结果
```

### 6.7 `--all` 多源拉取流程

```
1. 遍历配置中的所有源
2. 对每个源执行增量拉取流程
3. 记录每个源的执行结果（成功/失败/部分成功）
4. 仅更新成功拉取的源的 cursor
5. 失败的源保留原有 cursor，下次拉取时可重试
6. 一个源失败不影响其他源继续
7. 最终输出汇总报告
```

---

## 7. 源管理功能

### 7.1 列出源（`--list-sources`）

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

### 7.2 添加源（`--add-source`）

**交互流程**：

```
📦 添加情报源

源名称: cloud
API URL: https://pulse.example.com
环境变量名 [CYBER_PULSE_CLOUD_KEY]:

✅ 已添加源 "cloud"
⚠️  请设置环境变量: export CYBER_PULSE_CLOUD_KEY=cp_live_xxx
```

### 7.3 删除源（`--remove-source <name>`）

```
✅ 已删除源 "cloud"
```

### 7.4 设置默认源（`--set-default <name>`）

```
✅ 已将 "cloud" 设置为默认源
```

---

## 8. 错误处理

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

### 8.1 网络请求配置

| 参数 | 值 | 说明 |
|------|-----|------|
| 连接超时 | 10 秒 | 建立连接的超时时间 |
| 请求超时 | 30 秒 | 单次请求的总超时时间 |
| 重试次数 | 1 次 | 超时后重试一次 |
| 重试间隔 | 2 秒 | 重试前等待时间 |

---

## 9. 输出示例

### 9.1 增量拉取

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

### 9.2 多源拉取

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

## 10. 技术实现

### 10.1 架构设计

采用与 `intel-distill` 一致的架构：命令 + TypeScript 脚本

```
plugins/market-radar/
├── commands/
│   └── intel-pull.md          # 命令定义
├── scripts/
│   └── pulse/
│       ├── index.ts           # 主入口
│       ├── api-client.ts      # API 客户端
│       ├── config.ts          # 配置管理
│       ├── state.ts           # 状态管理
│       └── types.ts           # 类型定义
└── schemas/
    └── pulse-sources.schema.json  # 配置文件 Schema
```

### 10.2 依赖

```json
{
  "dependencies": {
    "undici": "^6.0.0"
  }
}
```

---

## 11. 与 cyber-pulse API 对应

| intel-pull 参数 | cyber-pulse API |
|------------------|-----------------|
| 默认（增量） | `GET /content?cursor={cursor}&limit=100` |
| `--since` | `GET /content?since={since}&limit=100` |
| `--id` | `GET /content/{content_id}` |

---

## 修订记录

| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| v1.0 | 2026-03-20 | 老罗 | 初始版本 |
| v1.1 | 2026-03-20 | 老罗 | 根据 spec review 修复：统一状态文件位置、驼峰命名 frontmatter、补充依赖检查/分页处理/超时重试/多源状态更新策略 |