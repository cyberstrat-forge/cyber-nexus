# 状态文件优化设计

> 基于 brainstorming 会话 2026-04-06

## 问题陈述

`state.json` 文件持续累积已处理文件元数据（1142+ 条记录），导致文件体积过大，影响 Agent 处理效率。

### 现状分析

| 组件 | 当前状态 | 问题 |
|------|---------|------|
| `processed` | 1142 条记录，每条约 12 字段 | 文件体积持续增长 |
| `review.pending` | 待审核队列 | 必要数据 |
| `stats` | 累计统计 | 可实时计算 |
| `pulse.cursors` | intel-pull cursor | 必要数据 |

### 核心洞察

1. **情报卡片 frontmatter 已包含追溯信息**：`archived_file`、`converted_file` 可用于反向查找
2. **去重已基于文件系统**：预处理扫描 `converted/` 的 `sourceHash` 实现源文件去重
3. **变更检测可通过情报卡片实现**：添加 `converted_content_hash` 字段

---

## 设计方案：基于文件的状态管理

### 核心思路

状态由文件系统自身维护，而非集中式 JSON 文件。

```
当前：state.json 累积所有历史 → 文件膨胀

新方案：
  ├── converted/**/*.md → sourceHash 去重
  ├── intelligence/**/*.md → converted_file + converted_content_hash 变更检测
  └── pending.json → 仅存储运行时状态（待审核 + cursor）
```

### 新的状态结构

**文件位置**：`.intel/pending.json`

```json
{
  "version": "1.0.0",
  "updated_at": "2026-04-06T12:00:00Z",
  "review": {
    "items": [
      {
        "pending_id": "pending-threat-20260406-001",
        "converted_file": "converted/2026/04/report.md",
        "archived_source": "archive/2026/04/report.pdf",
        "added_at": "2026-04-06T10:00:00Z",
        "reason": "检测到高风险威胁指标"
      }
    ]
  },
  "pulse": {
    "cursors": {
      "src_securityweekly": {
        "last_fetched_at": "2026-04-06T09:00:00Z",
        "last_item_id": "item_abc12345",
        "last_pull": "2026-04-06T10:00:00Z",
        "total_synced": 150
      }
    }
  }
}
```

### 情报卡片 frontmatter 变更

**新增字段**：`converted_content_hash`

```yaml
# 第二组：item 来源追溯
item_id: "item_a1b2c3d4"
...
archived_file: "[[archive/2026/04/report-2026.pdf]]"
converted_file: "[[converted/2026/04/report-2026.md]]"
converted_content_hash: "abc123def456..."  # 新增：转换文件的 content_hash
```

**用途**：
- 变更检测：对比转换文件当前 `content_hash` 与情报卡片记录值
- 内容更新时触发重新处理

### 转换文件 frontmatter 变更

**新增字段**：`processed_status`、`processed_at`

```yaml
---
sourceHash: "abc123..."
originalPath: "inbox/report.pdf"
archivedAt: "2026-04-06T10:00:00Z"
archivedSource: "archive/2026/04/report.pdf"
content_hash: "def456..."           # 已有
processed_status: "rejected"        # 新增：pending/passed/rejected
processed_at: "2026-04-06T10:30:00Z"  # 新增：处理时间
---
```

**字段说明**：

| 字段 | 值 | 说明 |
|------|-----|------|
| `processed_status` | `pending` | 待处理（新文件） |
| | `passed` | 已处理，生成了情报卡片 |
| | `rejected` | 已拒绝，不再处理 |
| `processed_at` | ISO 8601 时间戳 | 处理完成时间 |

**处理逻辑**：

| 转换文件状态 | 情报卡片状态 | 操作 |
|-------------|-------------|------|
| `processed_status` 不存在 | - | 新文件，需处理 |
| `processed_status: pending` | - | 待处理 |
| `processed_status: passed` | 有对应卡片 | 已处理，跳过 |
| `processed_status: rejected` | 无卡片 | 已拒绝，跳过 |

**更新时机**：
1. Agent 返回 `has_strategic_value = true` → 写入 `processed_status: "passed"`
2. Agent 返回 `has_strategic_value = false` → 写入 `processed_status: "rejected"`
3. 用户审核批准 → 写入 `processed_status: "passed"`
4. 用户审核拒绝 → 写入 `processed_status: "rejected"`

---

## 工作流变更

### 1. 预处理去重（不变）

```
扫描 converted/ 目录
提取 frontmatter.sourceHash
与新文件 hash 比较 → 去重
```

### 2. 情报提取去重（变更）

```
当前流程：
  读取 state.processed → 判断是否已处理

新流程：
  扫描 converted/ 目录
  检查每个转换文件的 processed_status 字段：
    - 不存在或 pending → 加入处理队列
    - passed → 检查 intelligence/ 是否有对应卡片
    - rejected → 跳过（不再处理）

  对于 processed_status: passed 的文件：
    扫描 intelligence/ 目录
    提取所有 converted_file 字段 → 确认卡片存在
    对比 converted_content_hash → 检测内容变更
```

### 3. 待审核队列（变更）

```
当前：state.review.pending
新：pending.json → review.items

操作：
  - 列出待审核：读取 pending.json
  - 批准：读取 pending.json → 调用 Agent → 写入情报卡片 → 更新转换文件 processed_status: passed → 移除 pending
  - 拒绝：更新转换文件 processed_status: rejected → 移除 pending
```

### 4. 被拒绝记录去重（新增）

**问题**：用户拒绝待审核项后，如何避免重复提示？

**解决方案**：转换文件 frontmatter 的 `processed_status: rejected`

```
处理流程：
  1. 扫描转换文件时检查 processed_status
  2. 如果是 rejected，跳过该文件
  3. 如果文件内容变更（content_hash 变化），可选择：
     - 保留 rejected 状态（不重新处理）
     - 重置为 pending（允许重新处理）
```

### 4. intel-pull cursor（变更）

```
当前：state.pulse.cursors
新：pending.json → pulse.cursors

影响文件：
  - pulse/state.ts：修改 getStatePath() 和默认结构
```

---

## 文件修改范围

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `scripts/preprocess/index.ts` | 修改 | 添加 `processed_status: pending` 到 frontmatter |
| `scripts/preprocess/scan-queue.ts` | 重写 | 改为检查 processed_status + 扫描 intelligence/ |
| `scripts/preprocess/update-state.ts` | 重写 | 改为更新转换文件 processed_status + pending.json |
| `scripts/pulse/state.ts` | 修改 | 修改文件路径和默认结构 |
| `commands/intel-distill.md` | 修改 | 更新状态文件说明、流程文档 |
| `commands/intel-pull.md` | 修改 | 更新状态文件位置说明 |
| `agents/intelligence-analyzer.md` | 修改 | 添加 converted_content_hash 写入 |
| `skills/intelligence-output-templates/` | 修改 | 添加 converted_content_hash 字段 |
| `schemas/state.schema.json` | 删除 | 不再需要 |
| `schemas/pending.schema.json` | 新增 | 新的状态文件 schema |

---

## 迁移策略

### 首次运行检测

检测到旧 `state.json` 时执行迁移：

```
1. 读取 state.json
2. 提取 review.pending → 写入 pending.json 的 review.items
3. 提取 pulse.cursors → 写入 pending.json 的 pulse.cursors
4. 备份 state.json → state.json.bak
5. （可选）提示用户可删除备份文件
```

### 兼容性

- 旧 `state.json` 保留为 `.bak`
- 新版本自动迁移
- 无需用户手动干预

---

## 性能预期

| 指标 | 当前 | 优化后 |
|------|------|--------|
| state.json 大小 | ~200KB (1142条) | pending.json ~5KB (待审核项) |
| Agent 加载时间 | 较慢 | 显著改善 |
| 变更检测准确度 | 依赖 state | 基于文件系统，更可靠 |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 扫描 intelligence/ 性能 | 取决于卡片数量 | 可添加缓存索引 |
| 历史追溯需求 | processed 字段删除 | 情报卡片 frontmatter 包含完整追溯 |
| 迁移失败 | 状态丢失 | 保留 .bak 备份文件 |

---

## 后续优化（可选）

1. **添加 intelligence 索引**：如扫描性能仍有问题，可考虑轻量级索引文件
2. **stats 按需计算**：如需要累计统计，可在报告生成时实时计算

---

## 设计决策记录

| 决策 | 理由 |
|------|------|
| 删除 `processed` 字段 | 情报卡片 frontmatter 已有追溯信息，冗余 |
| 删除 `stats` 字段 | 可实时计算，无需持久化 |
| 保留 `pending.json` 文件 | 待审核队列和 cursor 需要持久化存储 |
| 添加 `converted_content_hash` | 实现基于文件系统的变更检测 |
| 添加 `processed_status` 到转换文件 | 解决被拒绝记录的去重问题，无需额外状态文件 |
| 迁移时保留旧 state.json 为 .bak | 安全备份，可回滚 |

---

## 复核检查清单

- [x] intel-distill 提取模式：去重检测基于文件系统
- [x] intel-distill 审核模式：pending.json 存储待审核项
- [x] intel-distill 报告模式：不涉及状态文件
- [x] intel-pull 增量同步：cursor 存储在 pending.json
- [x] intel-pull 源管理：不涉及状态文件
- [x] 被拒绝记录去重：转换文件 processed_status 字段
- [x] 变更检测：情报卡片 converted_content_hash 字段
- [x] 迁移策略：自动迁移 + 保留备份