# intel-distill 职责分离与状态管理优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成剩余的职责分离优化工作：增强中断恢复能力、同步 Agent ID 格式示例、补充中断恢复文档。

**Architecture:** 
- 保持现有架构设计（Agent 写入卡片、脚本管理状态、实时扫描模式）
- 增强 scan-queue.ts 的中断恢复检测
- 同步 Agent 返回示例中的 ID 格式
- 补充中断恢复机制文档

**Tech Stack:** TypeScript

**Design Spec:** `docs/superpowers/specs/2026-04-07-intel-distill-responsibility-separation-design.md`

---

## 已完成的修改（PR #84/#86）

| 修改项 | 状态 | PR |
|--------|------|-----|
| update-state.ts 移除 content_hash/source_hash 验证 | ✅ 已完成 | #86 |
| intel-distill.md 步骤 8.5 JSON 格式简化 | ✅ 已完成 | #86 |
| 命令层与 Agent 职责边界明确 | ✅ 已完成 | #84 |

---

## 待实现的修改

| 任务 | 目标 | 优先级 |
|------|------|--------|
| Task 1: 增强中断恢复 | scan-queue.ts 自动检测不一致状态 | 🔴 高 |
| Task 2: 同步 Agent ID 格式 | 更新返回示例中的 ID 格式 | 🟡 中 |
| Task 3: 补充文档 | 添加中断恢复机制说明 | 🟡 中 |
| Task 4: 版本发布 | 更新版本号和 CHANGELOG | 🟢 低 |

---

## 文件结构

```
plugins/market-radar/
├── scripts/preprocess/
│   └── scan-queue.ts            # Task 1: 增强中断恢复
├── agents/
│   └── intelligence-analyzer.md # Task 2: 同步 ID 格式
└── commands/
    └── intel-distill.md         # Task 3: 补充文档
```

---

## Task 1: 增强 scan-queue.ts 中断恢复

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/scan-queue.ts`

**目标**：增加对中断导致状态不一致的自动检测。

**当前问题**：
```typescript
// 当前逻辑只检查 processedStatus === 'passed'
if (processedStatus === 'passed') {
  if (cardExists && hashMatches) {
    alreadyProcessed++;
    continue;
  }
}
// 其他情况（包括中断后的 null）都会重新处理
```

- [ ] **Step 1: 新增 ScanQueueResult 输出字段**

修改第 51-60 行，增加 `auto_fix` 字段：

```typescript
export interface ScanQueueResult {
  source_dir: string;
  total: number;
  already_processed: number;
  needs_processing: number;
  pending_review: number;
  queue: QueueItem[];
  threshold: number;
  recommendation: 'glob' | 'script';
  auto_fix?: Array<{         // 新增
    file: string;
    current_status: string | null;
    suggested_status: 'passed';
  }>;
}
```

- [ ] **Step 2: 初始化 autoFixItems**

在 `scanAndBuildQueue` 函数中，第 218 行附近，初始化变量：

```typescript
// Build queue
const queue: QueueItem[] = [];
let alreadyProcessed = 0;
let needsProcessing = 0;
let pendingReview = 0;
const autoFixItems: ScanQueueResult['auto_fix'] = [];  // 新增
```

- [ ] **Step 3: 增强状态检测逻辑**

修改第 248-278 行，在检查 pending review 之后、检查 processed_status 之前，增加情报卡片存在检查：

```typescript
// Check if in pending review - 保持不变
if (pendingReviewSet.has(relativePath)) {
  queue.push({
    file: relativePath,
    content_hash: contentHash,
    source_hash: sourceHash,
    archived_source: archivedSource,
    status: 'pending_review',
  });
  pendingReview++;
  continue;
}

// 【新增】检查情报卡片是否存在（无论 processed_status）
// 这是中断恢复的关键：如果卡片存在且内容匹配，视为已处理
const recordedHash = convertedToHash.get(relativePath);
if (recordedHash && recordedHash === contentHash) {
  // 情报卡片存在且内容匹配
  // recordedHash 是情报卡片中记录的 converted_content_hash
  // contentHash 是转换文件当前内容的实时计算哈希
  if (processedStatus !== 'passed' && processedStatus !== 'rejected') {
    // 中断导致的状态不一致，记录修复建议
    autoFixItems.push({
      file: relativePath,
      current_status: processedStatus,
      suggested_status: 'passed'
    });
  }
  alreadyProcessed++;
  continue;
}

// Check processed_status
if (processedStatus === 'rejected') {
  // Skip rejected files
  alreadyProcessed++;
  continue;
}

if (processedStatus === 'passed') {
  // 已在上面处理过，如果走到这里说明卡片不存在或内容不匹配
  // 需要重新处理
}

// pending, missing status, or needs reprocessing
queue.push({
  file: relativePath,
  content_hash: contentHash,
  source_hash: sourceHash,
  archived_source: archivedSource,
  status: 'needs_processing',
});
needsProcessing++;
```

**注意**：使用 `contentHash`（实时计算）而非 `convertedContentHash`（从 frontmatter 读取），确保检测的准确性。

- [ ] **Step 4: 返回时包含 auto_fix**

修改第 297-306 行的返回值：

```typescript
return {
  source_dir: resolvedSourceDir,
  total: relativeFiles.length,
  already_processed: alreadyProcessed,
  needs_processing: needsProcessing,
  pending_review: pendingReview,
  queue,
  threshold: RECOMMENDED_SCRIPT_THRESHOLD,
  recommendation,
  auto_fix: autoFixItems.length > 0 ? autoFixItems : undefined,
};
```

- [ ] **Step 5: 运行类型检查**

```bash
cd /Users/luoweirong/cyberstrat-forge/cyber-nexus/plugins/market-radar/scripts
pnpm exec tsc --noEmit
```

预期：无类型错误

- [ ] **Step 6: 提交修改**

```bash
git add plugins/market-radar/scripts/preprocess/scan-queue.ts
git commit -m "feat(market-radar): add auto-detection for interrupted state in scan-queue.ts"
```

---

## Task 2: 同步 Agent ID 格式示例

**Files:**
- Modify: `plugins/market-radar/agents/intelligence-analyzer.md`

**目标**：将返回示例中的 ID 格式从序号模式更新为文件名模式。

- [ ] **Step 1: 更新 intelligence_ids 示例**

修改第 454-457 行：

```json
"intelligence_ids": [
  "industry-20251013-cybersecurity-trends-2026",
  "emerging-20251013-ai-security-platform-rise"
],
```

- [ ] **Step 2: 更新 cards 数组中的 ID**

修改第 465-477 行：

```json
"cards": [
  {
    "intelligence_id": "industry-20251013-cybersecurity-trends-2026",
    "primary_domain": "Industry-Analysis",
    "secondary_domains": [],
    "output_file": "intelligence/Industry-Analysis/2025/10/20251013-cybersecurity-trends-2026.md",
    "title": "Gartner发布2026年网络安全规划指南：六大趋势定义未来方向"
  },
  {
    "intelligence_id": "emerging-20251013-ai-security-platform-rise",
    "primary_domain": "Emerging-Tech",
    "secondary_domains": [],
    "output_file": "intelligence/Emerging-Tech/2025/10/20251013-ai-security-platform-rise.md",
    "title": "AI安全平台（AISP）成为企业安全新焦点"
  }
],
```

- [ ] **Step 3: 提交修改**

```bash
git add plugins/market-radar/agents/intelligence-analyzer.md
git commit -m "fix(market-radar): sync intelligence_id format to filename-based pattern in agent examples"
```

---

## Task 3: 修正 intel-distill.md 文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-distill.md`

**目标**：修正转换文件格式文档错误，补充中断恢复机制说明，明确数据流描述。

### 3.1 修正转换文件格式文档

**问题**：第 205-234 行标题写的是"转换文件格式"，但示例显示的是情报卡片的 frontmatter。

- [ ] **Step 1: 修正转换文件格式示例**

修改第 209-234 行，将示例改为正确的转换文件 frontmatter：

```markdown
### 转换文件格式（v3.0）

转换后的 Markdown 文件包含 frontmatter 元数据：

```markdown
---
sourceHash: "abc123def456..."
originalPath: "inbox/report-2026.pdf"
archivedAt: "2026-03-15T10:00:00Z"
archivedSource: "archive/2026/04/report-2026.pdf"
processed_status: "pending"
processed_at: null
---

# 文档内容...
```

**转换文件 frontmatter 字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sourceHash` | string | ✅ | 源文件 MD5 哈希（用于去重） |
| `originalPath` | string | ✅ | 源文件原始路径 |
| `archivedAt` | datetime | ✅ | 归档时间（ISO 8601） |
| `archivedSource` | string | ✅ | 归档文件路径 |
| `processed_status` | string | ❌ | 处理状态：pending/passed/rejected |
| `processed_at` | datetime | ❌ | 处理时间（ISO 8601） |
| `content_hash` | string | ❌ | 转换文件内容哈希（处理后写入） |
```

**注意**：情报卡片的 frontmatter 格式参见 `intelligence-output-templates` skill。

### 3.2 添加中断恢复文档

- [ ] **Step 1: 添加中断恢复说明章节**

在步骤 6.4（判断逻辑）之后添加新章节：

```markdown
### 步骤 6.5：中断恢复机制

**自动检测**：scan-queue.ts 会自动检测中断导致的状态不一致：

| 场景 | 检测方式 | 处理 |
|------|---------|------|
| Agent 写入卡片后被中断 | 情报卡片存在但 processed_status ≠ passed | 自动跳过，记录修复建议 |
| 批量处理中断 | 未处理的文件状态为 pending/null | 下次运行继续处理 |

**状态一致性保证**：

scan-queue.ts 在扫描时会检查情报卡片是否存在，无论 `processed_status` 是什么：

```
如果情报卡片存在 && 内容哈希匹配:
    视为已处理，跳过
    如果 processed_status 不是 passed/rejected:
        记录到 auto_fix 数组（状态不一致，建议修复）
```

**修复建议输出**（如果有状态不一致）：

```
⚠️ 检测到 5 个状态不一致的文件（有卡片但未标记）
   这些文件将被跳过，建议运行修复命令更新状态
```

**中断恢复流程**：

1. 用户执行 `/intel-distill`
2. scan-queue.ts 自动检测已存在的情报卡片
3. 中断的文件被自动跳过
4. 只处理真正需要处理的文件
```

- [ ] **Step 2: 更新步骤 8.5 说明**

在步骤 8.5 开头添加数据来源说明：

```markdown
**命令层职责**：

1. 从内存中保存的 scan-queue 结果获取 `archived_source`（如 Agent 未返回且需要）

2. 合并 Agent 结果，构造 JSON 数组
```

- [ ] **Step 3: 提交修改**

```bash
git add plugins/market-radar/commands/intel-distill.md
git commit -m "docs(market-radar): add interruption recovery mechanism documentation"
```

---

## Task 4: 版本发布

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`
- Modify: `plugins/market-radar/CHANGELOG.md`

**目标**：更新版本号，记录修复内容。

- [ ] **Step 1: 更新版本号**

将 `plugin.json` 中的版本从 `1.8.2` 更新为 `1.8.3`。

- [ ] **Step 2: 更新 CHANGELOG.md**

```markdown
## [1.8.3] - 2026-04-07

### Added

- scan-queue.ts 新增中断恢复自动检测，自动识别状态不一致的文件
- intel-distill 命令新增中断恢复机制文档

### Fixed

- 同步 intelligence-analyzer Agent 返回示例中的 ID 格式为文件名模式

### Changed

- 明确 archived_source 的数据来源（从内存 queue 获取）
```

- [ ] **Step 3: 提交版本更新**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json
git add plugins/market-radar/CHANGELOG.md
git commit -m "chore(market-radar): release v1.8.3 with interruption recovery enhancement"
```

---

## 自检清单

### 1. Spec Coverage 对照

| 设计需求 | 实现任务 | 状态 |
|---------|---------|------|
| ~~移除 content_hash/source_hash 验证~~ | ~~原 Task 1~~ | ✅ PR #86 已完成 |
| 增强中断恢复检测 | Task 1 | ✅ |
| 同步 Agent ID 格式示例 | Task 2 | ✅ |
| 修正转换文件格式文档 | Task 3.1 | ✅ |
| 补充中断恢复文档 | Task 3.2 | ✅ |
| 明确数据来源描述 | Task 3.2 | ✅ |
| 版本发布 | Task 4 | ✅ |

### 2. 问题覆盖验证

| 问题编号 | 问题描述 | 实现任务 |
|---------|---------|---------|
| 1 | update-state.ts 验证未使用字段 | ✅ PR #86 已修复 |
| 2 | 数据流断层 | Task 3.2 明确 archived_source 来源 |
| 3 | Agent ID 格式不一致 | Task 2 |
| 4 | 中断恢复缺陷 | Task 1 + Task 3.2 |
| 5（新发现）| 转换文件格式文档错误 | Task 3.1 |

### 2. Placeholder Scan

- ✅ 无 "TBD"、"TODO"、"implement later"
- ✅ 无 "add appropriate error handling"
- ✅ 无 "write tests for the above"
- ✅ 无 "similar to Task N"
- ✅ 所有代码步骤包含完整代码

### 3. Type Consistency

- ✅ ScanQueueResult 新增 auto_fix 字段，与现有接口兼容
- ✅ intelligence_id 格式统一为文件名模式
- ✅ archived_source 保持可选字段

### 4. 数据流验证

| 字段 | scan-queue | 命令层 | Agent | update-state |
|------|-----------|--------|-------|--------------|
| `file` | ✅ 输出 | ✅ 保存 | ✅ 使用 | ✅ 使用 |
| `content_hash` | ✅ 计算使用 | - | ❌ 不传 | ❌ 不验证 |
| `source_hash` | ✅ 读取使用 | - | ❌ 不传 | ❌ 不验证 |
| `archived_source` | ✅ 输出 | ✅ 保存 | ✅ 可返回 | ✅ 使用 |

---

## 执行选项

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**