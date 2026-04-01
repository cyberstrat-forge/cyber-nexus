# intel-pull 增量同步实现设计

> 版本: 1.0
> 日期: 2026-04-01
> 相关设计: [cyber-pulse API 设计](../../../cyber-pulse/docs/superpowers/specs/2026-04-01-incremental-sync-design.md)

---

## 概述

适配 cyber-pulse API v1 增量同步参数，简化 intel-pull 命令，专注于用户核心工作流：**首次全量同步 + 后续增量同步**。

---

## 变更概述

### API 变更

| 项目 | 旧版本 | 新版本 |
|------|--------|--------|
| 全量同步参数 | `from=beginning` | `since=beginning` |
| 增量同步参数 | `cursor={id}` | `since={datetime}` |
| 分页参数 | `cursor={id}` | `cursor={id}`（需配合 since） |
| 响应字段 | `next_cursor` | `last_item_id` + `last_fetched_at` |

### 状态变更

| 项目 | 旧版本 | 新版本 |
|------|--------|--------|
| 游标字段 | `cursor` | `last_fetched_at` + `last_item_id` |
| 状态版本 | `2.3.0` | `3.0.0` |

### 命令变更

| 参数 | 变更 | 代码处理 |
|------|------|---------|
| `--preview` | **废弃** | 删除参数定义和处理逻辑 |
| `--since` | **废弃**（原时间范围过滤） | 删除参数定义和处理逻辑 |
| `--until` | **废弃** | 删除参数定义和处理逻辑 |
| `--init` | 保留 | 更新 API 调用为 `since=beginning` |
| `--source` | 保留 | 无变更 |
| `--output` | 保留 | 无变更 |
| `--list-sources` | 保留 | 无变更 |
| `--add-source` | 保留 | 无变更 |
| `--remove-source` | 保留 | 无变更 |
| `--set-default` | 保留 | 无变更 |

### API 客户端方法变更

| 方法 | 变更 | 替代方案 |
|------|------|---------|
| `listContent(cursor?, limit)` | **修改** | `listContent(since?, cursor?, limit)` |
| `listContentFromBeginning(limit)` | **修改** | 内部调用 `listContent('beginning', undefined, limit)` |
| `listContentRange(since, until?, cursor?, limit)` | **删除** | 不再支持时间范围过滤 |

---

## cyber-pulse API 对接

### 参数映射

| intel-pull 命令 | API 调用 | 用途 |
|-----------------|----------|------|
| `/intel-pull --init` | `GET /items?since=beginning&limit=50` | 全量同步起点 |
| `/intel-pull` | `GET /items?since={last_fetched_at}&limit=50` | 增量同步起点 |
| 分页继续 | `GET /items?since={ts}&cursor={last_item_id}&limit=50` | 分页继续 |

> **注意**：API 无参数场景（`GET /items`，返回最新一页倒序）不适用于 intel-pull，已废弃的 `--preview` 功能曾使用此场景。

### API 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `since` | string | 否 | `beginning` 或 ISO 8601 时间戳 |
| `cursor` | string | 否 | 分页游标（`item_id`），必须配合 `since` |
| `limit` | int | 否 | 每页数量（1-100），默认 50 |

### API 参数语义

| `since` 值 | 行为 | 排序方向 | intel-pull 用途 |
|-----------|------|---------|-----------------|
| 不传 | 返回最新一页 | 倒序（新→旧） | ❌ 不使用（原 `--preview` 已废弃） |
| `beginning` | 从最早数据开始 | 正序（旧→新） | `--init` 全量同步 |
| `{datetime}` | 从指定时间开始 | 正序（旧→新） | 增量同步 |

**约束**：`cursor` 必须与 `since` 配合使用，不支持单独使用。

### API 响应结构

```json
{
  "data": [
    {
      "id": "item_a1b2c3d4",
      "title": "某APT组织近期攻击活动分析",
      "author": "安全研究员",
      "published_at": "2026-03-30T08:00:00Z",
      "body": "本文分析了...",
      "url": "https://example.com/article/123",
      "completeness_score": 0.85,
      "tags": ["APT", "威胁情报"],
      "word_count": 1500,
      "fetched_at": "2026-03-30T09:00:00Z",
      "source": {
        "source_id": "src_abc12345",
        "source_name": "Security Weekly",
        "source_url": "https://example.com/feed.xml",
        "source_tier": "T1",
        "source_score": 75.0
      }
    }
  ],
  "last_item_id": "item_b2c3d4e5",
  "last_fetched_at": "2026-03-30T10:00:00.123Z",
  "has_more": true,
  "count": 50
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `last_item_id` | string | 本页最后一条的 ID，用于 cursor 分页 |
| `last_fetched_at` | string | 本页最后一条的 fetched_at，用于增量同步 |
| `has_more` | boolean | 是否有更多数据 |

### API 错误响应

| 状态码 | 说明 | intel-pull 处理 |
|--------|------|-----------------|
| 400 | 参数错误（cursor 格式无效等） | 显示错误信息，退出 |
| 401 | API Key 无效或权限不足 | 提示检查 API Key，退出 |

---

## 状态文件设计

### 文件位置

```
{output_dir}/.intel/state.json
```

### 结构

```json
{
  "version": "3.0.0",
  "updated_at": "2026-04-02T09:00:00+08:00",

  "pulse": {
    "cursors": {
      "cyber-pulse": {
        "last_fetched_at": "2026-04-01T10:00:00.123Z",
        "last_item_id": "item_0050",
        "last_pull": "2026-04-02T09:00:00Z",
        "total_synced": 501
      }
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `last_fetched_at` | string | 最后一条数据的 fetched_at，用于 `since` 参数 |
| `last_item_id` | string | 最后一条数据的 ID，用于 `cursor` 参数 |
| `last_pull` | string | 最后同步完成时间 |
| `total_synced` | int | 累计同步数量（统计用） |

### 状态更新规则

| 场景 | 状态操作 |
|------|---------|
| `--init` | 清空该源的同步状态后重建 |
| 增量同步 | 读取 → 更新 |
| 分页过程中 | 不更新（临时保存） |
| 同步完成 | 更新 `last_fetched_at` 和 `last_item_id` |

### 状态迁移策略

旧版本状态文件格式（v2.x）：

```json
{
  "pulse": {
    "cursors": {
      "cyber-pulse": {
        "cursor": "item_xxx",
        "last_pull": "..."
      }
    }
  }
}
```

迁移规则：

| 检测条件 | 迁移行为 |
|---------|---------|
| 版本 < 3.0.0 且存在 `cursor` 字段 | 提示用户执行 `--init` 重新全量同步 |
| 版本 >= 3.0.0 | 正常使用 |

**原因**：旧版 `cursor` 字段无法转换为 `last_fetched_at`（语义不同），需要重新同步。

---

## 执行流程

### 全量同步（`--init`）

```
1. 清空该源的同步状态
2. GET /items?since=beginning&limit=50
3. 写入文件，保存临时 last_item_id 和 last_fetched_at
4. 如果 has_more=true:
   GET /items?since=beginning&cursor={last_item_id}&limit=50
   重复步骤 3-4
5. 同步完成，保存 last_fetched_at 和 last_item_id
```

### 增量同步（无参数）

```
1. 读取该源的 last_fetched_at
2. 如果 last_fetched_at 不存在，提示用户先执行 --init
3. GET /items?since={last_fetched_at}&limit=50
4. 写入文件，保存临时 last_item_id 和 last_fetched_at
5. 如果 has_more=true:
   GET /items?since={last_fetched_at}&cursor={last_item_id}&limit=50
   重复步骤 4-5
6. 同步完成，更新 last_fetched_at 和 last_item_id
```

---

## 用户工作流

### 场景一：首次全量同步

```bash
/intel-pull --init
```

**输出示例**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

源: cyber-pulse
模式: 全量同步

【拉取统计】
• 新增情报: 501 条
• 写入位置: ./inbox/

【状态保存】
• last_fetched_at: 2026-04-01T10:00:00.123Z
• last_item_id: item_00501

════════════════════════════════════════════════════════
```

### 场景二：日常增量同步

```bash
/intel-pull
```

**输出示例**：

```
════════════════════════════════════════════════════════
📡 情报拉取报告
════════════════════════════════════════════════════════

源: cyber-pulse
模式: 增量同步

【拉取统计】
• 新增情报: 15 条
• 写入位置: ./inbox/

【状态更新】
• last_fetched_at: 2026-04-02T08:30:00.456Z
• last_item_id: item_00516

════════════════════════════════════════════════════════
```

### 场景三：状态丢失处理

当状态文件不存在或 `last_fetched_at` 为空时：

```
⚠️  未找到同步状态

可能原因：
• 首次使用，未执行过全量同步
• 状态文件被删除或损坏

解决方案：
• 执行全量同步: /intel-pull --init
```

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 配置文件不存在 | 显示配置示例和设置步骤，退出 |
| 状态文件不存在 | 提示用户执行 `--init` |
| `last_fetched_at` 不存在 | 提示用户执行 `--init` |
| API 返回空数据 | 正常完成，不更新状态 |
| API 返回 400 错误 | 显示错误信息（如 cursor 格式无效），退出 |
| API 返回 401 错误 | 提示检查 API Key 权限，退出 |

---

## 文件变更清单

### 需要修改的文件

| 文件 | 变更内容 |
|------|---------|
| `scripts/pulse/types.ts` | 1. 更新 `PulseListResponse`：`next_cursor` → `last_item_id` + `last_fetched_at`<br>2. 更新 `PulseCursorState`：添加 `last_fetched_at`、`last_item_id`、`total_synced`<br>3. 移除 `server_timestamp` 字段验证 |
| `scripts/pulse/api-client.ts` | 1. `listContent()` 改为 `listContent(since?, cursor?, limit?)`<br>2. `listContentFromBeginning()` 改为调用 `listContent('beginning')`<br>3. **删除** `listContentRange()` 方法 |
| `scripts/pulse/state.ts` | 1. 版本升级为 `3.0.0`<br>2. 添加 `last_fetched_at`、`last_item_id`、`total_synced` 字段支持<br>3. 添加旧版本状态迁移逻辑 |
| `scripts/pulse/index.ts` | 1. **删除** `--preview` 参数处理<br>2. **删除** `--since` 参数处理（时间范围）<br>3. **删除** `--until` 参数处理<br>4. 更新同步逻辑使用 `since` + `cursor` |
| `commands/intel-pull.md` | 更新命令文档，移除废弃参数说明 |
| `commands/references/intel-pull-guide.md` | 更新帮助文档，移除废弃参数说明 |

### 需要删除的代码

| 文件 | 删除内容 |
|------|---------|
| `scripts/pulse/api-client.ts` | `listContentRange()` 方法 |
| `scripts/pulse/index.ts` | `--preview` 参数定义和处理逻辑 |
| `scripts/pulse/index.ts` | `--since` 参数定义和处理逻辑 |
| `scripts/pulse/index.ts` | `--until` 参数定义和处理逻辑 |
| `scripts/pulse/index.ts` | `determinePullMode()` 中的 `preview`、`since` 分支 |

---

## 关联文档

- cyber-pulse API 设计：`cyber-pulse/docs/superpowers/specs/2026-04-01-incremental-sync-design.md`
- cyber-pulse Issue：[#98](https://github.com/cyberstrat-forge/cyber-pulse/issues/98)