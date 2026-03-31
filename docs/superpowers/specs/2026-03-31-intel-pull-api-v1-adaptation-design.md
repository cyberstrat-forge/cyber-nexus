# intel-pull 适配 cyber-pulse API v1 设计文档

> 版本: 1.0
> 日期: 2026-03-31
> 作者: Claude

---

## 概述

本文档描述 intel-pull 命令适配 cyber-pulse API v1 的设计方案，包括 API 变更、输出格式统一、预处理脚本适配等内容。

---

## 背景与目标

### 背景

cyber-pulse 项目发布了业务 API v1，相比之前 intel-pull 使用的 API 版本，有以下主要变化：

- 端点路径变更
- ID 格式变化
- 字段名称调整
- 分页响应结构变化

### 目标

1. 适配新 API，确保 intel-pull 正常工作
2. 统一 intel-pull 输出与 intel-distill 预处理的文件格式
3. 简化用户配置流程
4. 保持向后兼容

---

## API 变更对照

### 端点变化

| 功能 | 旧端点 | 新端点 |
|------|--------|--------|
| 列表 | `GET /api/v1/contents` | `GET /api/v1/items` |
| 单条 | `GET /api/v1/contents/{id}` | ❌ 已移除 |

### 参数变化

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cursor` | string | - | 游标位置，格式 `item_{8位hex}` |
| `from` | string | `latest` | 起始方向：`latest` 或 `beginning` |
| `limit` | int | 50 | 每页数量，范围 1-100 |
| `since` | datetime | - | 发布时间起点（ISO 8601） |
| `until` | datetime | - | 发布时间终点（ISO 8601） |

**约束**：`cursor` 和 `from` 不能同时使用

### 响应结构变化

```json
// 新响应结构
{
  "data": [...],
  "next_cursor": "item_b2c3d4e5",
  "has_more": true,
  "count": 50,
  "server_timestamp": "2026-03-30T10:00:00Z"
}
```

### 字段映射

| 新 API 字段 | intel-pull 输出字段 |
|-------------|---------------------|
| `id` | `item_id` |
| `title` | `title` |
| `author` | `author` |
| `published_at` | `published_at` |
| `body` | 正文内容 |
| `url` | `url` |
| `completeness_score` | `completeness_score` |
| `tags` | `tags` |
| `word_count` | `word_count` |
| `fetched_at` | `first_seen_at` |
| `source.source_id` | `source_id` |
| `source.source_name` | `source_name` |
| `source.source_url` | `source_url` |
| `source.source_tier` | `source_tier` |
| `source.source_score` | `source_score` |

---

## 统一 Frontmatter 格式

### 设计目标

intel-pull 输出的文件与 intel-distill 预处理后的文件采用统一格式，两种来源（cyber-pulse API 和本地文档）使用相同字段结构。

### Frontmatter 结构

```yaml
---
# ============================================
# 第一组：核心标识（必须填写）
# ============================================
item_id: "item_a1b2c3d4"              # 唯一标识符
source_type: "cyber-pulse"            # 来源类型：cyber-pulse | local
first_seen_at: "2026-03-30T09:00:00Z" # 采集/入库时间

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
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `item_id` | string | ✅ | 唯一标识。cyber-pulse: `item_xxxxxxxx`；本地: `local_YYYYMMDD_xxxxxxxx` |
| `source_type` | string | ✅ | `cyber-pulse` 或 `local` |
| `first_seen_at` | datetime | ✅ | 入库时间 |
| `title` | string | ✅ | 文档标题 |
| `url` | string | ❌ | 原文链接 |
| `author` | string | ❌ | 作者 |
| `tags` | array | ❌ | 标签列表 |
| `published_at` | datetime | ❌ | 原文发布时间 |
| `source_id` | string | ❌ | 情报源 ID |
| `source_name` | string | ❌ | 情报源名称 |
| `source_url` | string | ❌ | 情报源 URL |
| `source_tier` | string | ❌ | 情报源等级（T0-T3） |
| `source_score` | number | ❌ | 情报源评分（0-100） |
| `completeness_score` | number | ❌ | 内容完整度（0-1） |
| `word_count` | number | ❌ | 正文字数 |
| `content_hash` | string | ✅ | 正文 MD5 哈希（预处理填充） |
| `archived_path` | string | ❌ | 归档路径（本地文件有，cyber-pulse 为空） |

### 来源差异

| 字段 | cyber-pulse | 本地文档 |
|------|-------------|----------|
| `item_id` | `item_a1b2c3d4` | `local_20260330_a1b2c3d4` |
| `source_type` | `cyber-pulse` | `local` |
| `first_seen_at` | API `fetched_at` | 预处理时间 |
| `title` | API 提供 | 从文件名提取 |
| `url` | API 提供 | 空 |
| `source_*` | API 提供 | 空 |
| `completeness_score` | API 提供 | 空 |
| `content_hash` | 预处理计算 | 预处理计算 |
| `archived_path` | 空 | `archive/2026/03/xxx.pdf` |

---

## intel-pull 命令设计

### 参数列表

| 参数 | 说明 |
|------|------|
| 无参数 | 增量同步（使用状态文件 cursor） |
| `--init` | 首次同步/重新同步（`from=beginning`，清空 cursor） |
| `--since <datetime>` | 时间起点 |
| `--until <datetime>` | 时间终点 |
| `--preview` | 预览最新（不更新状态文件） |
| `--source <name>` | 指定源（默认使用 default_source） |
| `--all` | 拉取所有源 |
| `--output <dir>` | 输出目录（默认 `./inbox/`） |
| `--list-sources` | 列出已配置的情报源 |
| `--add-source` | 交互式添加情报源 |
| `--remove-source <name>` | 删除指定情报源 |
| `--set-default <name>` | 设置默认情报源 |

### 参数组合规则

| 命令 | API 调用 | cursor 行为 |
|------|----------|-------------|
| `/intel-pull` | `cursor={saved}` | 读取 + 更新 |
| `/intel-pull --init` | `from=beginning` | 清空 + 重建 |
| `/intel-pull --since "2026-03-01"` | `since=...` | 不更新 |
| `/intel-pull --since "..." --until "..."` | `since=...&until=...` | 不更新 |
| `/intel-pull --preview` | 无参数 | 不更新 |

### 多源管理

- 默认行为：拉取 `default_source` 指定的源
- `--source <name>`：拉取指定源
- `--all`：顺序拉取所有配置的源

### 输出目录

- 默认：`./inbox/`
- `--output <dir>`：指定输出目录

---

## 配置文件设计

### 文件位置

```
plugins/market-radar/.claude-plugin/pulse-sources.json
```

### 文件结构

```json
{
  "sources": [
    {
      "name": "cyber-pulse",
      "url": "https://pulse.example.com",
      "api_key": "cp_live_a1b2c3d4e5f6789012345678abcdef01"
    }
  ],
  "default_source": "cyber-pulse"
}
```

### 添加源工作流

```
$ /intel-pull --add-source

添加新的情报源
----------------

源名称 (如: cyber-pulse): my-source
API URL (如: https://api.example.com): https://pulse.example.com
API Key: cp_live_a1b2c3d4e5f6789012345678abcdef01

成功添加源: my-source
```

---

## 预处理脚本适配

### 识别逻辑

预处理脚本检测 `source_type === 'cyber-pulse'` 的 Markdown 文件，执行特殊处理分支。

### 验证规则

**必要字段**（必须存在且值不为空）：

- `item_id`
- `source_type`
- `first_seen_at`
- `title`

### 处理流程对比

| 步骤 | cyber-pulse 文件 | 本地文档 |
|------|------------------|----------|
| 扫描 | ✅ 扫描 inbox/ | ✅ 扫描 inbox/ |
| 格式检测 | Markdown + `source_type: cyber-pulse` | PDF/DOCX/TXT |
| 格式转换 | ❌ 跳过 | ✅ 执行 |
| 内容清洗 | ❌ 跳过 | ✅ 执行 |
| 归档源文件 | ❌ 无源文件 | ✅ 移动到 archive/ |
| 计算 content_hash | ✅ | ✅ |
| 填充 archived_path | ❌ 保持为空 | ✅ 填充 |
| 移动到 converted/ | ✅ 移动文件 | ✅ 移动文件 |

### 去重逻辑

cyber-pulse 文件通过文件名去重（文件名包含唯一 `item_id`）：

```
检查 converted/YYYY/MM/{YYYYMMDD}-{item_id}.md 是否存在
    ├── 存在 → 跳过（重复）
    └── 不存在 → 正常处理
```

---

## 状态文件设计

### 保持原有结构

```json
{
  "pulse": {
    "cursors": {
      "local": {
        "cursor": "item_a1b2c3d4",
        "last_pull": "2026-03-30T10:00:00Z"
      }
    }
  }
}
```

### cursor 格式变化

| 版本 | cursor 格式 |
|------|-------------|
| 旧 | `cnt_YYYYMMDDHHMMSS_xxxxxxxx` |
| 新 | `item_{8位hex}` |

### cursor 更新规则

| 模式 | cursor 操作 |
|------|-------------|
| 增量（默认） | 读取 → 更新 |
| `--init` | 清空 → 重建 |
| `--since` | 不更新 |
| `--preview` | 不更新 |

---

## 改动清单

### 高优先级

| 文件 | 改动内容 |
|------|---------|
| `scripts/pulse/types.ts` | 更新 API 类型定义 |
| `scripts/pulse/api-client.ts` | 更新端点、参数、响应解析 |
| `scripts/pulse/index.ts` | 新增 `--init`、`--until`、`--preview` 参数，移除 `--id` |
| `scripts/pulse/output.ts` | 新的 frontmatter 格式、文件命名 |
| `scripts/pulse/config.ts` | `key_ref` → `api_key` |
| `scripts/preprocess/index.ts` | 新增 cyber-pulse 文件处理分支 |

### 中优先级

| 文件 | 改动内容 |
|------|---------|
| `scripts/pulse/state.ts` | cursor 更新逻辑调整 |
| `commands/intel-pull.md` | 更新命令文档 |
| `schemas/pulse-sources.schema.json` | 更新 Schema 定义 |

### 低优先级

| 文件 | 改动内容 |
|------|---------|
| `commands/references/intel-pull-guide.md` | 更新帮助文档 |

---

## 完整工作流

### 首次使用

```
1. 安装依赖
   cd plugins/market-radar/scripts && pnpm install

2. 添加情报源
   /intel-pull --add-source
   → 输入: 源名称、API URL、API Key

3. 首次同步
   /intel-pull --init
   → 从头遍历所有历史数据
   → 写入 inbox/
   → 保存 cursor
```

### 日常使用

```
1. 增量同步
   /intel-pull
   → 使用 cursor 增量拉取
   → 写入 inbox/
   → 更新 cursor

2. 情报处理
   /intel-distill --source ./docs
   → 预处理 inbox/ 文件
   → 移动到 converted/
   → 生成情报卡片
```

---

## 附录

### 文件命名规则

| 来源 | 格式 | 示例 |
|------|------|------|
| cyber-pulse | `{YYYYMMDD}-{item_id}.md` | `20260330-item_a1b2c3d4.md` |
| 本地文档 | `{YYYYMMDD}-{subject}.md` | `20260330-report-2026.md` |

### 目录结构

```
{source_dir}/
├── inbox/                    # 待处理文档
│   ├── 20260330-item_a1b2c3d4.md    # cyber-pulse 文件
│   └── report-2026.pdf              # 本地文档
├── archive/                  # 归档（仅本地文档）
│   └── 2026/03/
│       └── report-2026.pdf
├── converted/                # 转换后文件
│   └── 2026/03/
│       ├── 20260330-item_a1b2c3d4.md
│       └── report-2026.md
├── intelligence/             # 情报卡片输出
└── .intel/
    └── state.json            # 状态文件
```