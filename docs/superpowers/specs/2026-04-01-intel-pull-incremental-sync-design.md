# intel-pull 增量同步简化设计

> 版本: 1.0
> 日期: 2026-04-01
> 相关 Issue: [cyber-pulse #98](https://github.com/cyberstrat-forge/cyber-pulse/issues/98)

---

## 概述

简化 intel-pull 命令，专注于用户核心工作流：**首次全量同步 + 后续增量同步**。

---

## 背景

### 当前问题

cyber-pulse API 的 `cursor` 参数是向后遍历游标，不支持增量同步场景：

| 场景 | 当前实现 | 问题 |
|------|---------|------|
| 全量同步 | `from=beginning` + cursor | ✅ 正常 |
| 增量同步 | 无参数 + cursor | ❌ cursor 无法获取新数据 |

### 解决方案

cyber-pulse API 新增 `after` 参数，支持增量同步。

---

## 设计目标

1. **简化用户操作**：无参数 = 增量同步，`--init` = 全量同步
2. **状态最小化**：只保存 `last_item_id`
3. **废弃冗余功能**：移除时间范围过滤、预览等功能

---

## API 参数映射

### cyber-pulse API 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `after` | string | 获取指定 item_id 之后的新数据（增量同步）⭐ |
| `cursor` | string | 分页游标（向后遍历） |
| `from` | string | `beginning`（从头遍历）|
| `limit` | int | 每页数量（1-100） |

**约束**：`after`、`cursor`、`from` 三者互斥

### intel-pull 命令参数

| 命令 | API 调用 | 用途 |
|------|---------|------|
| `/intel-pull` | `?after={last_item_id}` | 增量同步 |
| `/intel-pull --init` | `?from=beginning` + cursor | 全量同步 |

---

## 状态文件设计

### 文件位置

```
{output_dir}/.intel/state.json
```

### 结构

```json
{
  "pulse": {
    "sources": {
      "{source_name}": {
        "last_item_id": "item_a1b2c3d4",
        "last_pull": "2026-04-01T10:00:00Z"
      }
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `last_item_id` | string | 最后拉取的 item_id，用于增量同步 |
| `last_pull` | string | 最后拉取时间（ISO 8601） |

---

## 执行流程

### 全量同步（`--init`）

```
1. 清空状态文件中的 last_item_id
2. 调用 API: GET /api/v1/items?from=beginning&limit=100
3. 遍历所有数据，写入文件
4. 使用 cursor 分页直到 has_more=false
5. 保存最后一条数据的 item_id 到状态文件
```

### 增量同步（无参数）

```
1. 读取状态文件中的 last_item_id
2. 如果 last_item_id 不存在，提示用户先执行 --init
3. 调用 API: GET /api/v1/items?after={last_item_id}&limit=100
4. 写入新数据
5. 更新 last_item_id 为最后一条数据的 id
```

---

## 废弃参数

| 参数 | 原用途 | 处理方式 |
|------|--------|---------|
| `--preview` | 预览最新数据 | 删除 |
| `--since` | 时间范围起点 | 删除 |
| `--until` | 时间范围终点 | 删除 |

---

## 文件变更

### 需要修改的文件

| 文件 | 变更内容 |
|------|---------|
| `scripts/pulse/index.ts` | 移除废弃参数，更新增量同步逻辑 |
| `scripts/pulse/api-client.ts` | 新增 `listContentAfter` 方法 |
| `scripts/pulse/state.ts` | 更新状态结构（cursor → last_item_id） |
| `commands/intel-pull.md` | 更新命令文档 |
| `commands/references/intel-pull-guide.md` | 更新帮助文档 |

### 需要删除的代码

- `--preview` 参数处理逻辑
- `--since`/`--until` 参数处理逻辑
- `listContentRange` API 方法
- 时间范围相关类型定义

---

## 迁移指南

### 状态文件迁移

旧版本状态文件可能包含：

```json
{
  "pulse": {
    "cursors": {
      "local": {
        "cursor": "item_xxx",
        "last_pull": "..."
      }
    }
  }
}
```

迁移策略：
1. 检测旧格式，提示用户执行 `--init` 重新全量同步
2. 新格式使用 `sources` 字段，不兼容旧格式

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| 状态文件不存在 | 提示用户执行 `--init` |
| `last_item_id` 不存在 | 提示用户执行 `--init` |
| API 返回空数据 | 正常完成，不更新状态 |

---

## 使用示例

### 首次使用

```bash
# 配置情报源
/intel-pull --add-source

# 全量同步
/intel-pull --init

# 输出
📡 情报拉取报告
════════════════════════════════════════════════════════
源: local (http://localhost:8000)
模式: 全量同步

【拉取统计】
• 新增情报: 150 条
• 写入位置: ./inbox/

【状态更新】
• last_item_id: item_xxx
• 更新时间: 2026-04-01T10:00:00Z
════════════════════════════════════════════════════════
```

### 日常使用

```bash
# 增量同步
/intel-pull

# 输出
📡 情报拉取报告
════════════════════════════════════════════════════════
源: local (http://localhost:8000)
模式: 增量同步

【拉取统计】
• 新增情报: 5 条
• 写入位置: ./inbox/

【状态更新】
• last_item_id: item_yyy
• 更新时间: 2026-04-02T10:00:00Z
════════════════════════════════════════════════════════
```