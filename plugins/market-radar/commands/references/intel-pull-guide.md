# /intel-pull 命令使用指南

> 从 cyber-pulse 情报服务拉取标准化情报内容

---

## 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--source <name>` | 否 | 指定情报源名称 | default_source |
| `--all` | 否 | 顺序拉取所有配置的情报源 | - |
| `--output <dir>` | 否 | 输出目录 | `inbox/` |
| `--since <datetime>` | 否 | 拉取指定时间后的数据（ISO 8601 格式） | - |
| `--id <content_id>` | 否 | 拉取单条指定情报 | - |
| `--list-sources` | 否 | 列出所有已配置的情报源 | - |
| `--add-source` | 否 | 交互式添加情报源 | - |
| `--remove-source <name>` | 否 | 删除指定情报源 | - |
| `--set-default <name>` | 否 | 设置默认情报源 | - |
| `--help` | 否 | 显示此帮助信息 | - |

---

## 快速开始

### 1. 配置情报源

首次使用前需要配置情报源。创建配置文件：

**位置**：`plugins/market-radar/.claude-plugin/pulse-sources.json`

```json
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
```

设置环境变量：

```bash
export CYBER_PULSE_LOCAL_KEY=cp_live_xxx
```

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

### 场景 1：增量拉取（推荐）

```bash
# 使用默认源增量拉取
/intel-pull

# 指定源增量拉取
/intel-pull --source cloud
```

增量拉取会记住上次拉取位置（cursor），只获取新数据。

### 场景 2：时间范围拉取

```bash
# 拉取指定日期后的数据
/intel-pull --since "2026-03-01"

# 拉取最近一周的数据
/intel-pull --since "2026-03-13T00:00:00Z"
```

**注意**：时间范围拉取不会更新 cursor。

### 场景 3：单条拉取

```bash
# 拉取指定 ID 的情报
/intel-pull --id "cnt_20260319143052_a1b2c3d4"
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
{YYYYMMDD}-{content_id后8位}.md
```

**示例**：`20260319-a1b2c3d4.md`

### 文件结构

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

# 标题

正文内容...
```

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

### Q: 如何重新拉取所有数据？

时间范围拉取模式不更新 cursor，可以指定起始时间：

```bash
/intel-pull --since "2026-01-01"
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