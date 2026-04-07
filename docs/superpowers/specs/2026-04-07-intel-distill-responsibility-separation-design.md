# intel-distill 职责分离与状态管理优化设计

> **版本**: 1.1.0
> **日期**: 2026-04-07
> **状态**: 设计阶段
> **更新**: 补充字段名一致性、数据来源分析、新旧方案对比

## 1. 背景与问题

### 1.1 问题发现

通过 PR #84、#85、#86 的审查，发现 `intel-distill` 命令存在多个设计与实现不一致的问题：

| # | 问题 | 级别 | 影响 |
|---|------|------|------|
| 1 | update-state.ts 验证未使用的字段 | 🔴 严重 | 按文档调用会失败 |
| 2 | 数据流断层（scan-queue → Agent → update-state） | 🔴 严重 | 命令层无法获取必要数据 |
| 3 | Agent 示例 ID 格式不一致 | 🟡 中等 | 误导开发者 |
| 4 | 职责边界定义不清晰 | 🟡 中等 | 维护困难 |
| 5 | 中断恢复缺陷 | 🟡 中等 | 可能重复处理 |

### 1.2 根因分析

**核心矛盾**：PR #84/#85/#86 修改了设计意图，但代码与文档未完全同步。

```
                    scan-queue.ts 输出
                           │
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
    content_hash      source_hash     archived_source
         │                 │                 │
    用于变更检测       用于去重         待审核时需要
    (scan-queue 内部)  (scan-queue 内部)  (update-state 需要)
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                    未传递给后续环节
                           │
                           ↓
              update-state.ts 要求验证 ❌
              Agent 不返回这些字段 ❌
```

---

## 2. 设计原则

### 2.1 确定的核心原则

| 原则 | 决定 | 理由 |
|------|------|------|
| 状态管理责任 | **脚本负责** | 状态管理是确定性操作，适合脚本；Agent 可能失败/重试，不应直接修改状态 |
| 卡片写入责任 | **Agent 直接写入** | Agent 生成内容，由 Agent 写入符合直觉；写入失败时 Agent 可返回错误 |
| 待处理队列 | **不持久化** | 通过 frontmatter 追踪，scan-queue 实时扫描；避免状态双写问题 |

### 2.2 设计哲学

1. **YAGNI**：不引入不必要的复杂度（如队列持久化）
2. **职责清晰**：每个组件做且只做一件事
3. **自愈能力**：系统能自动检测并修复不一致状态
4. **最小改动**：优先修复核心问题，避免大规模重构

---

## 3. 组件职责边界

### 3.1 职责矩阵

| 操作 | Agent | Script | 命令层 |
|------|-------|--------|--------|
| 读取转换文件 | ✅ 执行 | - | - |
| 分析内容、判断价值 | ✅ 执行 | - | - |
| 生成情报卡片内容 | ✅ 执行 | - | - |
| 写入情报卡片文件 | ✅ 执行 | - | - |
| 扫描文件、计算 hash | ❌ | ✅ 执行 | 调用 |
| 更新转换文件 frontmatter | ❌ | ✅ 执行 | 调用 |
| 更新 pending.json | ❌ | ✅ 执行 | 调用 |
| 流程编排、批量调度 | ❌ | ❌ | ✅ 执行 |

### 3.2 组件职责详解

#### scan-queue.ts

**职责**：扫描转换文件，构建处理队列

**输入**：
- `converted/**/*.md` - 转换文件目录
- `pending.json` - 待审核队列
- `intelligence/**/*.md` - 情报卡片目录（用于变更检测）

**输出**：
```json
{
  "source_dir": "/path/to/root",
  "total": 100,
  "already_processed": 85,
  "needs_processing": 10,
  "pending_review": 5,
  "queue": [
    {
      "file": "converted/2026/04/xxx.md",
      "content_hash": "abc123...",
      "source_hash": "def456...",
      "archived_source": "archive/2026/04/xxx.pdf",
      "status": "needs_processing"
    }
  ]
}
```

**内部使用**：
- `content_hash`：变更检测（对比情报卡片的 `converted_content_hash`）
- `source_hash`：去重（跳过已处理的相同源文件）

**中断恢复增强**：
- 检查情报卡片是否存在（无论 `processed_status` 是什么）
- 存在且匹配 → 跳过，自动修复不一致状态

#### intelligence-analyzer (Agent)

**职责**：分析文档，提取情报，生成卡片

**输入参数**：
- `source`：转换文件路径
- `output`：情报卡片输出目录

**返回格式**（简化版）：
```json
{
  "status": "success",
  "source_file": "converted/2026/04/xxx.md",
  "has_strategic_value": true,
  "intelligence_count": 2,
  "intelligence_ids": ["threat-20260407-xxx"],
  "output_files": ["intelligence/Threat-Landscape/2026/04/20260407-xxx.md"],
  "domain": "Threat-Landscape",
  
  "review_reason": "检测到高风险威胁指标",
  "archived_source": "archive/2026/04/xxx.pdf"
}
```

**返回字段说明**：

| 字段 | 必填 | 说明 |
|------|------|------|
| `source_file` | ✅ | 转换文件路径 |
| `has_strategic_value` | ✅ | true/false/null |
| `intelligence_count` | ✅ | 生成的情报卡片数量 |
| `intelligence_ids` | ✅ | 情报卡片 ID 列表 |
| `output_files` | ✅ | 输出文件路径列表 |
| `domain` | 条件 | 主领域（pending 时用于生成 pending_id） |
| `review_reason` | 条件 | 审核原因（has_strategic_value=null 时必填） |
| `archived_source` | 条件 | 归档路径（pending 时记录，用于后续审核恢复） |

**不返回**：
- `content_hash`：scan-queue 已计算，update-state 不需要
- `source_hash`：同上

#### update-state.ts

**职责**：更新转换文件 frontmatter 和 pending.json

**输入格式**（简化版）：
```json
[
  {
    "source_file": "converted/2026/04/xxx.md",
    "has_strategic_value": true,
    "intelligence_count": 2,
    "intelligence_ids": ["threat-20260407-xxx"],
    "output_files": ["intelligence/Threat-Landscape/2026/04/20260407-xxx.md"]
  }
]
```

**执行内容**：
1. 根据 `has_strategic_value` 设置 `processed_status`：
   - `true` → `passed`
   - `false` → `rejected`
   - `null` → 添加到 `pending.json` 的 `review.items`
2. 记录 `processed_at` 时间戳
3. 如有待审核项，写入 `review.items`

**不验证**：
- `content_hash`：未使用，无需验证
- `source_hash`：未使用，无需验证

---

## 4. 数据流设计

### 4.1 完整数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 1: scan-queue.ts                                                   │
│                                                                         │
│ 输入: converted/*.md, pending.json, intelligence/**/*.md               │
│ 输出: queue[]                                                           │
│                                                                         │
│ 内部计算:                                                                │
│   • content_hash = MD5(转换文件内容)                                    │
│   • source_hash = frontmatter.sourceHash                               │
│   • 变更检测 = content_hash vs 情报卡片.converted_content_hash          │
│   • 去重 = source_hash 已存在于已处理文件                               │
│                                                                         │
│ 中断恢复:                                                                │
│   • 检查情报卡片是否存在（无论 processed_status）                        │
│   • 存在且匹配 → 标记为已处理                                            │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ↓ queue[] 保存到内存
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 2: 命令层批量调度                                                  │
│                                                                         │
│ 队列管理:                                                                │
│   • 保存 queue[] 到内存                                                 │
│   • 每批取出 5 个文件                                                   │
│   • 并行调度 5 个 Agent                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ↓                                       ↓
┌─────────────────────┐               ┌─────────────────────┐
│ 步骤 3: Agent       │               │ 步骤 4: 收集结果    │
│                     │               │                     │
│ 参数:               │               │ 从 Agent 返回获取:  │
│   source (from queue)│              │   source_file       │
│   output            │──────────────→│   has_strategic_value│
│                     │               │   intelligence_ids  │
│ 执行:               │               │   output_files      │
│   读取转换文件      │               │   domain            │
│   分析判断价值      │               │   review_reason     │
│   生成卡片内容      │               │   archived_source   │
│   写入情报卡片      │               │                     │
│   返回 JSON 结果    │               │ 从内存 queue 获取:  │
│                     │               │   (如 Agent 未返回) │
│ 不更新:             │               │   archived_source   │
│   frontmatter       │               │                     │
│   pending.json      │               │                     │
└─────────────────────┘               └─────────────────────┘
                                                │
                                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 5: update-state.ts                                                 │
│                                                                         │
│ 输入: Agent 返回结果数组                                                 │
│                                                                         │
│ 执行:                                                                   │
│   • 更新转换文件 frontmatter: processed_status, processed_at            │
│   • 更新 pending.json: review.items (如有待审核项)                       │
│                                                                         │
│ 不验证:                                                                 │
│   • content_hash (未使用)                                               │
│   • source_hash (未使用)                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 字段生命周期

| 字段 | scan-queue | 命令层 | Agent | update-state |
|------|-----------|--------|-------|--------------|
| `file` | ✅ 输出 | ✅ 保存 | ✅ 使用 | ✅ 使用 |
| `content_hash` | ✅ 计算并使用 | - | ❌ 不传 | ❌ 不验证 |
| `source_hash` | ✅ 读取并使用 | - | ❌ 不传 | ❌ 不验证 |
| `archived_source` | ✅ 输出 | ✅ 保存 | ✅ 可返回 | ✅ 使用（pending 时） |
| `has_strategic_value` | - | - | ✅ 返回 | ✅ 使用 |
| `intelligence_ids` | - | - | ✅ 返回 | ✅ 使用 |
| `output_files` | - | - | ✅ 返回 | ✅ 使用 |

---

## 5. 中断恢复设计

### 5.1 中断场景分析

| 中断点 | Agent 状态 | 卡片状态 | frontmatter 状态 | 影响 |
|--------|-----------|---------|-----------------|------|
| Agent 执行中 | 部分完成 | 部分写入 | 未更新 | 下次运行重新处理 |
| Agent 完成，未收集结果 | 全部完成 | 已写入 | 未更新 | **不一致** |
| 已收集，未调用 update-state | 全部完成 | 已写入 | 未更新 | **不一致** |

### 5.2 自愈机制

**scan-queue.ts 增强逻辑**：

```typescript
// 原逻辑
if (processedStatus === 'rejected') {
  alreadyProcessed++;
  continue;
}
if (processedStatus === 'passed') {
  // 检查情报卡片
  if (cardExists && hashMatches) {
    alreadyProcessed++;
    continue;
  }
}
queue.push({...});  // 需要处理

// 新增：检查情报卡片是否存在（无论 processed_status）
const recordedHash = convertedToHash.get(relativePath);
if (recordedHash && recordedHash === contentHash) {
  // 情报卡片存在且内容匹配
  // recordedHash: 情报卡片中记录的 converted_content_hash
  // contentHash: 转换文件当前内容的实时计算哈希
  if (processedStatus !== 'passed' && processedStatus !== 'rejected') {
    // 记录修复建议（命令层可选择修复）
    autoFixItems.push({
      file: relativePath,
      current_status: processedStatus,
      suggested_status: 'passed'
    });
  }
  alreadyProcessed++;
  continue;
}
```

**效果**：
- 中断后重新运行，scan-queue 自动检测不一致
- 已存在情报卡片的文件被跳过
- 命令层可选择修复 frontmatter

---

## 6. 修改清单

### 6.1 update-state.ts

**修改内容**：移除 `content_hash`、`source_hash` 的必填验证

**修改位置**：
- 接口定义（第 42-53 行）
- 验证逻辑（第 71-78 行）
- 返回值构造（第 98-112 行）
- 文件头注释示例（第 19-32 行）

### 6.2 scan-queue.ts

**修改内容**：增加中断恢复检查逻辑

**修改位置**：
- `scanAndBuildQueue` 函数（第 194-304 行）

**新增输出**：
- `auto_fix` 数组：需要修复状态不一致的文件列表

### 6.3 intelligence-analyzer.md

**修改内容**：同步 ID 格式示例

**修改位置**：
- 第 451-454 行：`intelligence_ids` 示例
- 第 462-474 行：`cards` 数组示例

### 6.4 intel-distill.md

**修改内容**：明确数据流描述

**修改位置**：
- 步骤 8.5：明确 `archived_source` 的来源
- 新增：中断恢复机制说明

---

## 7. 向后兼容性

### 7.1 兼容性分析

| 修改 | 影响 | 兼容策略 |
|------|------|---------|
| update-state.ts 移除验证 | 已有调用可能传了这些字段 | 字段变为可选，已有调用仍能工作 |
| scan-queue.ts 新增 auto_fix 输出 | 输出格式变化 | 新增可选字段，不影响已有解析 |
| Agent ID 格式更新 | 示例变化 | 纯文档修改，无影响 |

### 7.2 版本号

本次修改为 bug 修复，建议版本号：`1.8.2` → `1.8.3`

---

## 8. 测试要点

### 8.1 正常流程测试

1. 执行 `/intel-distill`，验证完整流程
2. 验证 `update-state.ts` 能正确处理简化格式的 JSON
3. 验证 `scan-queue.ts` 输出包含必要字段

### 8.2 中断恢复测试

1. 批量处理过程中手动中断
2. 重新执行 `/intel-distill`
3. 验证已处理的文件被跳过
4. 验证状态不一致的文件被检测

### 8.3 边缘情况测试

1. Agent 返回 `has_strategic_value: null`（待审核）
2. Agent 返回 `archived_source`
3. 命令层从内存 queue 获取 `archived_source`

---

## 附录 A: 相关文件

- `plugins/market-radar/scripts/preprocess/update-state.ts`
- `plugins/market-radar/scripts/preprocess/scan-queue.ts`
- `plugins/market-radar/agents/intelligence-analyzer.md`
- `plugins/market-radar/commands/intel-distill.md`
- `plugins/market-radar/schemas/pending.schema.json`

## 附录 B: 相关 PR

- PR #84: 明确命令层与 Agent 职责边界
- PR #85: ID 格式改为基于文件名
- PR #86: 简化 Agent 返回格式（文档更新，代码未同步）

---

## 附录 C: 字段名一致性问题

### C.1 发现的不一致

| 位置 | 字段名 | 格式 | 说明 |
|------|--------|------|------|
| 代码实现（scan-queue.ts, preprocess/index.ts） | `archivedSource` | 驼峰 | ✅ 正确 |
| 代码实现（update-state.ts） | `archived_source` | 下划线 | ✅ 正确（JSON 输入格式） |
| 文档示例（intel-distill.md） | `archived_file` | 下划线 | ❌ 错误，应为 `archivedSource` |

### C.2 转换文件 frontmatter 实际字段

| 字段 | 存在？ | 说明 |
|------|--------|------|
| `sourceHash` | ✅ | 源文件 MD5 哈希（驼峰格式） |
| `archivedSource` | ✅ | 归档文件路径（驼峰格式） |
| `converted_file` | ✅ | 转换文件路径（WikiLink 格式） |
| `content_hash` | ❌ | **不存在**，需实时计算 |
| `processed_status` | ❌ | 处理后才添加 |

**结论**：文档描述的"从转换文件 frontmatter 提取 `content_hash`"是**错误的**，该字段需要实时计算。

---

## 附录 D: 新旧方案对比分析

### D.1 当前实现的问题

| 问题 | 描述 | 影响 |
|------|------|------|
| 验证未使用的字段 | `update-state.ts` 验证 `content_hash`/`source_hash`，但未使用 | 增加调用复杂度 |
| 数据来源描述错误 | 文档说从 frontmatter 提取 `content_hash`，但该字段不存在 | 误导开发者 |
| 中断恢复缺陷 | `processed_status = null` 时即使卡片存在也会重新处理 | 可能重复处理 |
| 字段名不一致 | 文档用 `archived_file`，代码用 `archivedSource` | 维护困难 |

### D.2 当前实现的可取设计

| 设计点 | 评价 | 说明 |
|--------|------|------|
| **职责分离原则** | ✅ 优秀 | Agent 不管理状态，脚本负责状态更新 |
| **Agent 直接写入** | ✅ 合理 | Agent 生成内容并由其写入，符合直觉 |
| **实时扫描模式** | ✅ 合理 | 不持久化队列，避免状态双写问题 |
| **基于 frontmatter 的状态追踪** | ✅ 优秀 | 状态随文件存在，不依赖外部数据库 |
| **变更检测机制** | ✅ 优秀 | `content_hash` 对比实现内容变更检测 |
| **去重机制** | ✅ 优秀 | `sourceHash` 实现源文件去重 |
| **审核机制** | ✅ 完整 | 待审核项记录在 `pending.json`，支持人工干预 |

### D.3 新方案改进点

| 改进点 | 当前实现 | 新方案 | 收益 |
|--------|---------|--------|------|
| `content_hash`/`source_hash` 验证 | 强制验证但未使用 | 移除验证 | 减少调用复杂度 |
| 数据来源描述 | 错误描述 | 明确来源 | 减少误解 |
| 中断恢复 | 无自动检测 | 自动检测并修复 | 提升可靠性 |
| 字段名一致性 | 不一致 | 统一 | 减少维护成本 |

### D.4 方案对比结论

**新方案并未推翻当前实现的核心设计，而是修复细节问题**：

1. **保持现有架构**：Agent 写入卡片、脚本管理状态、实时扫描模式
2. **修复验证问题**：移除未使用字段的验证
3. **增强中断恢复**：自动检测不一致状态
4. **修正文档错误**：同步字段名、明确数据来源

**当前实现的核心设计是正确的，问题出在细节执行层面。**