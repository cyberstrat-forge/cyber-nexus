# /intel-pull 命令使用指南

> 从 cyber-pulse 情报服务拉取标准化情报内容

---

## 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--source <name>` | 否 | 指定情报源名称 | default_source |
| `--all` | 否 | 顺序拉取所有配置的情报源 | - |
| `--output <dir>` | 否 | 输出目录 | `inbox/` |
| `--init` | 否 | 全量同步（从头开始，忽略 cursor） | - |
| `--list-sources` | 否 | 列出所有已配置的情报源 | - |
| `--add-source` | 否 | 交互式添加情报源 | - |
| `--remove-source <name>` | 否 | 删除指定情报源 | - |
| `--set-default <name>` | 否 | 设置默认情报源 | - |

---

## 快速开始

### 1. 配置情报源

首次使用前需要配置情报源。创建配置文件：

**位置**：`{root_dir}/.intel/pulse-sources.json`（项目根目录下）

```json
{
  "sources": [
    {
      "name": "local",
      "url": "http://localhost:8000",
      "api_key": "cp_live_xxx"
    }
  ],
  "default_source": "local"
}
```

> 配置文件与 `state.json` 同目录，插件升级时不会被覆盖。

### 2. 拉取情报

```bash
# 增量拉取（推荐）
/intel-pull

# 拉取所有源
/intel-pull --all

# 指定输出目录
/intel-pull --output ./docs/inbox
```

### 3. 处理情报

使用 `/intel-distill` 命令处理拉取的情报：

```bash
/intel-distill --source ./inbox --output ./intelligence
```

---

## 使用场景

### 场景 1：首次全量同步

```bash
# 使用 --init 参数进行全量同步
/intel-pull --init

# 指定源全量同步
/intel-pull --source cloud --init
```

`--init` 参数会忽略已保存的 cursor，从头开始拉取所有数据。适用于：
- 首次使用
- 数据迁移
- 重建本地数据

### 场景 2：日常增量同步（推荐）

```bash
# 使用默认源增量拉取
/intel-pull

# 指定源增量拉取
/intel-pull --source cloud
```

增量拉取会记住上次拉取位置（cursor），只获取新数据。这是最高效的日常使用方式。

### 场景 3：状态丢失处理

如果 cursor 状态丢失或需要重新同步，可以使用 `--init` 参数：

```bash
# 重新全量同步
/intel-pull --init

# 然后正常增量同步
/intel-pull
```

### 场景 4：多源拉取

```bash
# 拉取所有配置的源
/intel-pull --all
```

每个源独立处理，一个源失败不影响其他源。

---

## 源管理

### 列出所有源

```bash
/intel-pull --list-sources
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
```

### 添加源

```bash
/intel-pull --add-source
```

按提示输入源名称、URL 和环境变量名。

### 删除源

```bash
/intel-pull --remove-source cloud
```

### 设置默认源

```bash
/intel-pull --set-default cloud
```

---

## 输出文件格式

### 文件命名

```
{YYYYMMDD}-{item_id后8位}.md
```

**示例**：`20260319-a1b2c3d4.md`

### 文件结构

```markdown
---
item_id: "item_a1b2c3d4"
source_type: "cyber-pulse"
first_seen_at: "2026-03-19T14:30:52Z"
title: "安全漏洞分析报告"
url: "https://example.com/article"
author: "Security Team"
tags: ["vulnerability", "CVE"]
published_at: "2026-03-19T14:00:00Z"
completeness_score: 85
source_id: "src_a1b2c3d4"
source_name: "安全客"
source_tier: "T1"
source_score: 85
content_hash: ""
archived_file: ""
---

# 标题

正文内容...
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `item_id` | 唯一标识（格式：`item_{hash前8位}`） |
| `source_type` | 固定值 `cyber-pulse`，用于识别 |
| `first_seen_at` | 首次采集时间（ISO 8601） |
| `title` | 文档标题 |
| `url` | 原文链接 |
| `author` | 作者 |
| `tags` | 标签数组 |
| `published_at` | 原文发布时间 |
| `completeness_score` | 完整度评分 0-100 |
| `source_id` | 情报源 ID |
| `source_name` | 情报源名称 |
| `source_tier` | 情报源等级 T0-T3 |
| `source_score` | 情报源评分 0-100 |
| `content_hash` | 预处理后填充 |
| `archived_file` | 预处理后填充 |

---

## 工作流集成

### 典型工作流

```bash
# 1. 拉取情报
/intel-pull --output ./docs/inbox

# 2. 处理情报
/intel-distill --source ./docs/inbox --output ./docs

# 3. 查看结果
ls ./docs/intelligence/
```

### 自动化工作流

可以结合 cron 或其他调度工具定时执行：

```bash
# 每小时拉取一次
0 * * * * claude /intel-pull --all --output /path/to/inbox
```

---

## 前置要求

### 必需依赖

- **Node.js 18+** 和 **pnpm**：用于脚本执行
  ```bash
  # 首次使用前安装依赖
  cd plugins/market-radar/scripts && pnpm install
  ```

### 网络要求

- 能够访问 cyber-pulse API 端点
- API Key 有效且有访问权限

---

## 常见问题

### Q: 如何检查配置是否正确？

```bash
/intel-pull --list-sources
```

查看 API Key 列是否显示"已设置"。

### Q: 拉取失败怎么办？

检查以下项：
1. 网络连接是否正常
2. API URL 是否正确
3. API Key 是否有效
4. 环境变量是否设置

### Q: 增量同步和全量同步的区别？

| 模式 | 参数 | 说明 |
|------|------|------|
| 增量同步 | 无特殊参数 | 只拉取 cursor 之后的新数据 |
| 全量同步 | `--init` | 从头拉取所有数据，重置 cursor |

日常使用推荐增量同步，效率更高。

### Q: cursor 存储在哪里？

cursor 存储在每个情报源的配置中（`pulse-sources.json`），格式为：

```json
{
  "name": "local",
  "url": "http://localhost:8000",
  "key_ref": "CYBER_PULSE_LOCAL_KEY",
  "cursor": "item_abc123"
}
```

### Q: 如何重新拉取所有数据？

使用 `--init` 参数进行全量同步：

```bash
/intel-pull --init
```

### Q: 输出目录不存在会自动创建吗？

是的，脚本会自动创建输出目录。

### Q: 与 intel-distill 的关系？

```
intel-pull → 拉取情报到 inbox/
intel-distill → 处理 inbox/ 生成情报卡片
```

两个命令配合使用，实现完整的情报处理流程。

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| `CONFIG_NOT_FOUND` | 配置文件不存在 |
| `CONFIG_PARSE_ERROR` | 配置文件格式错误 |
| `ENV_VAR_NOT_SET` | 环境变量未设置 |
| `API_CONNECTION_FAILED` | API 连接失败 |
| `API_AUTH_FAILED` | API 认证失败 |
| `API_TIMEOUT` | API 请求超时 |
| `SOURCE_NOT_FOUND` | 指定的源不存在 |
| `CONTENT_NOT_FOUND` | 指定的 content_id 不存在 |

---

## 相关资源

- 详细执行流程：`commands/intel-pull.md`
- intel-distill 命令：`commands/references/intel-distill-guide.md`
- cyber-pulse API 文档：参考 API 提供方文档
- 更新日志：`plugins/market-radar/CHANGELOG.md`