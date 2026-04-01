# intel-pull 增量同步实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 适配 cyber-pulse API v1 增量同步参数，简化 intel-pull 命令为两种核心工作流

**Architecture:** 
- API 客户端适配新参数（`since` + `cursor` 组合）
- 状态文件使用 `last_fetched_at` + `last_item_id` 替代旧版 `cursor`
- 移除废弃的时间范围过滤和预览功能

**Tech Stack:** TypeScript, Node.js 18+, undici, commander, ajv

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `scripts/pulse/types.ts` | 修改 | 更新 API 响应类型、状态类型 |
| `scripts/pulse/api-client.ts` | 修改 | 适配 `since` + `cursor` 参数 |
| `scripts/pulse/state.ts` | 修改 | 使用新状态字段，添加迁移逻辑 |
| `scripts/pulse/index.ts` | 修改 | 移除废弃参数，更新同步逻辑 |
| `commands/intel-pull.md` | 修改 | 更新命令文档 |
| `commands/references/intel-pull-guide.md` | 修改 | 更新帮助文档 |

---

### Task 1: 更新 API 响应类型定义

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/types.ts`

- [ ] **Step 1: 更新 PulseListResponse 类型**

将 `next_cursor` 和 `server_timestamp` 替换为新字段：

```typescript
/**
 * API list response (v1 format with incremental sync support)
 */
export interface PulseListResponse {
  /** List of content items */
  data: PulseContent[];
  /** Last item ID in current page, used for cursor pagination */
  last_item_id: string | null;
  /** Last item's fetched_at timestamp, used for incremental sync */
  last_fetched_at: string | null;
  /** Whether more items available */
  has_more: boolean;
  /** Number of items in current response */
  count: number;
}
```

- [ ] **Step 2: 更新 validateListResponse 函数**

移除对 `next_cursor` 和 `server_timestamp` 的验证，添加新字段验证：

```typescript
export function validateListResponse(response: unknown): response is PulseListResponse {
  if (!response || typeof response !== 'object') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      'API 返回无效响应: 响应为空或非对象',
      { response }
    );
  }

  const resp = response as Record<string, unknown>;

  if (!Array.isArray(resp.data)) {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效数据格式: data 应为数组，实际为 ${typeof resp.data}`,
      { dataType: typeof resp.data, response }
    );
  }

  // Validate last_item_id (string or null)
  if (resp.last_item_id !== null && typeof resp.last_item_id !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 last_item_id: 应为 string 或 null，实际为 ${typeof resp.last_item_id}`,
      { lastItemIdType: typeof resp.last_item_id, response }
    );
  }

  // Validate last_fetched_at (string or null)
  if (resp.last_fetched_at !== null && typeof resp.last_fetched_at !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 last_fetched_at: 应为 string 或 null，实际为 ${typeof resp.last_fetched_at}`,
      { lastFetchedAtType: typeof resp.last_fetched_at, response }
    );
  }

  if (typeof resp.has_more !== 'boolean') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 has_more: 应为 boolean，实际为 ${typeof resp.has_more}`,
      { hasMoreType: typeof resp.has_more, response }
    );
  }

  if (typeof resp.count !== 'number') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 count: 应为 number，实际为 ${typeof resp.count}`,
      { countType: typeof resp.count, response }
    );
  }

  return true;
}
```

- [ ] **Step 3: 更新 DEFAULT_LIMIT 常量**

```typescript
/** Default limit for API requests */
export const DEFAULT_LIMIT = 50;
```

- [ ] **Step 4: Commit**

```bash
git add plugins/market-radar/scripts/pulse/types.ts
git commit -m "refactor(market-radar): update PulseListResponse for incremental sync"
```

---

### Task 2: 更新状态类型定义

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/types.ts`

- [ ] **Step 1: 更新 PulseCursorState 类型**

添加新字段：

```typescript
/**
 * Cursor tracking for a single source (v3.0.0 format)
 */
export interface PulseCursorState {
  /** Last item's fetched_at timestamp, used for since parameter */
  last_fetched_at: string | null;
  /** Last item ID, used for cursor parameter */
  last_item_id: string | null;
  /** Last pull completion timestamp (ISO 8601) */
  last_pull: string | null;
  /** Total synced count (statistics) */
  total_synced: number;
}
```

- [ ] **Step 2: 更新 PullOptions 类型**

移除废弃字段：

```typescript
/**
 * Parsed CLI arguments (simplified)
 */
export interface PullOptions {
  /** Source name to pull from */
  source?: string;
  /** Pull from all sources */
  all: boolean;
  /** Output directory */
  output: string;
  /** Initialize mode - full sync from beginning */
  init: boolean;
  /** List sources mode */
  listSources: boolean;
  /** Add source mode */
  addSource: boolean;
  /** Remove source by name */
  removeSource?: string;
  /** Set default source */
  setDefault?: string;
}
```

- [ ] **Step 3: 更新 PullResult 类型**

简化 mode 类型：

```typescript
/**
 * Overall pull result
 */
export interface PullResult {
  /** Pull mode used */
  mode: 'init' | 'incremental' | 'all';
  /** Output directory */
  output_dir: string;
  /** Results per source */
  sources: PullSourceResult[];
  /** Total items pulled */
  total_count: number;
  /** Pull timestamp */
  pulled_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add plugins/market-radar/scripts/pulse/types.ts
git commit -m "refactor(market-radar): update types for incremental sync"
```

---

### Task 3: 更新 API 客户端

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/api-client.ts`

- [ ] **Step 1: 更新 ListQueryParams 接口**

```typescript
/**
 * Query parameters for list content API (v1 with incremental sync)
 */
interface ListQueryParams {
  /** Start point: 'beginning' or ISO 8601 timestamp */
  since?: string;
  /** Pagination cursor (item_id), must be used with since */
  cursor?: string;
  /** Items per page (1-100) */
  limit?: number;
}
```

- [ ] **Step 2: 更新 makeRequest 方法中的参数构建逻辑**

```typescript
private async makeRequest<T>(
  path: string,
  query?: ListQueryParams
): Promise<T> {
  const url = new URL(`${this.baseUrl}${path}`);
  if (query) {
    if (query.since) {
      url.searchParams.set('since', query.since);
    }
    if (query.cursor) {
      url.searchParams.set('cursor', query.cursor);
    }
    if (query.limit !== undefined) {
      url.searchParams.set('limit', String(query.limit));
    }
  }
  // ... rest of makeRequest unchanged
}
```

- [ ] **Step 3: 更新 listContent 方法签名和实现**

```typescript
/**
 * List content items with since and cursor parameters
 *
 * GET /api/v1/items?since={since}&cursor={cursor}&limit={limit}
 *
 * @param since - 'beginning' or ISO 8601 timestamp (optional)
 * @param cursor - Pagination cursor, must be used with since (optional)
 * @param limit - Number of items to return (default: 50)
 * @returns List response with data and pagination info
 */
async listContent(
  since?: string,
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PulseListResponse> {
  return this.makeRequest<PulseListResponse>('/api/v1/items', {
    since,
    cursor,
    limit,
  });
}
```

- [ ] **Step 4: 更新 listContentFromBeginning 方法**

改为调用 `listContent('beginning')`：

```typescript
/**
 * List content items from beginning (init mode)
 *
 * GET /api/v1/items?since=beginning&limit={limit}
 *
 * @param limit - Number of items to return (default: 50)
 * @returns List response with data and pagination info
 */
async listContentFromBeginning(
  limit: number = DEFAULT_LIMIT
): Promise<PulseListResponse> {
  return this.listContent('beginning', undefined, limit);
}
```

- [ ] **Step 5: 删除 listContentRange 方法**

删除整个 `listContentRange` 方法（约第 308-324 行）。

- [ ] **Step 6: Commit**

```bash
git add plugins/market-radar/scripts/pulse/api-client.ts
git commit -m "refactor(market-radar): update API client for since+cursor pagination"
```

---

### Task 4: 更新状态管理模块

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/state.ts`

- [ ] **Step 1: 更新版本号**

```typescript
/** Current state file version */
const STATE_VERSION = '3.0.0';
```

- [ ] **Step 2: 更新 DEFAULT_PULSE_STATE**

```typescript
/** Default pulse state structure */
const DEFAULT_PULSE_STATE: PulseState = {
  cursors: {},
};

/** Default cursor state for a single source */
const DEFAULT_CURSOR_STATE: PulseCursorState = {
  last_fetched_at: null,
  last_item_id: null,
  last_pull: null,
  total_synced: 0,
};
```

- [ ] **Step 3: 添加 getCursorState 函数**

```typescript
/**
 * Get cursor state for a source
 */
export function getCursorState(
  state: Record<string, unknown>,
  sourceName: string
): PulseCursorState {
  const pulseState = getPulseState(state);
  const cursorState = pulseState.cursors[sourceName];
  
  if (cursorState && typeof cursorState === 'object') {
    // Check for new format (has last_fetched_at)
    if ('last_fetched_at' in cursorState) {
      return cursorState as PulseCursorState;
    }
    // Old format detected (has cursor but no last_fetched_at)
    console.log(`[pulse] Old cursor format detected for ${sourceName}, migration required`);
    return DEFAULT_CURSOR_STATE;
  }
  
  return DEFAULT_CURSOR_STATE;
}
```

- [ ] **Step 4: 添加 setCursorState 函数**

```typescript
/**
 * Set cursor state for a source after successful sync
 */
export function setCursorState(
  state: Record<string, unknown>,
  sourceName: string,
  lastFetchedAt: string,
  lastItemId: string,
  syncedCount: number
): Record<string, unknown> {
  const pulseState = getPulseState(state);
  const prevCursor = pulseState.cursors[sourceName] || DEFAULT_CURSOR_STATE;
  const prevTotal = prevCursor.total_synced || 0;

  return {
    ...state,
    version: STATE_VERSION,
    updated_at: new Date().toISOString(),
    pulse: {
      ...pulseState,
      cursors: {
        ...pulseState.cursors,
        [sourceName]: {
          last_fetched_at: lastFetchedAt,
          last_item_id: lastItemId,
          last_pull: new Date().toISOString(),
          total_synced: prevTotal + syncedCount,
        },
      },
    },
  };
}
```

- [ ] **Step 5: 更新 clearCursor 函数为 clearCursorState**

```typescript
/**
 * Clear cursor state for a source (used by --init mode)
 */
export function clearCursorState(
  state: Record<string, unknown>,
  sourceName: string
): Record<string, unknown> {
  const pulseState = getPulseState(state);

  const newCursors = { ...pulseState.cursors };
  delete newCursors[sourceName];

  return {
    ...state,
    version: STATE_VERSION,
    updated_at: new Date().toISOString(),
    pulse: {
      ...pulseState,
      cursors: newCursors,
    },
  };
}
```

- [ ] **Step 6: 更新 migrateState 函数**

```typescript
function migrateState(state: Record<string, unknown>): Record<string, unknown> {
  const rawVersion = state.version;
  const version = typeof rawVersion === 'string' ? rawVersion : '1.0';

  if (version === STATE_VERSION) {
    return state;
  }

  console.log(`[pulse] Migrating state from version ${version} to ${STATE_VERSION}`);

  // Add pulse field if missing
  if (!state.pulse) {
    state.pulse = DEFAULT_PULSE_STATE;
  }

  // Check for old cursor format and reset
  const pulseState = state.pulse as Record<string, unknown>;
  if (pulseState.cursors && typeof pulseState.cursors === 'object') {
    const cursors = pulseState.cursors as Record<string, unknown>;
    for (const sourceName of Object.keys(cursors)) {
      const cursor = cursors[sourceName] as Record<string, unknown>;
      // Old format has 'cursor' field, new format has 'last_fetched_at'
      if ('cursor' in cursor && !('last_fetched_at' in cursor)) {
        console.log(`[pulse] Old cursor format detected for ${sourceName}, resetting`);
        cursors[sourceName] = DEFAULT_CURSOR_STATE;
      }
    }
  }

  state.version = STATE_VERSION;
  return state;
}
```

- [ ] **Step 7: 移除旧的 setCursor 函数，保留向后兼容的 getCursor**

更新原有的 `getCursor` 和 `setCursor` 函数以保持向后兼容（可标记为 deprecated）或直接替换为新函数。

- [ ] **Step 8: 更新模块导出**

确保导出新的函数：`getCursorState`, `setCursorState`, `clearCursorState`

- [ ] **Step 9: Commit**

```bash
git add plugins/market-radar/scripts/pulse/state.ts
git commit -m "refactor(market-radar): update state management for incremental sync"
```

---

### Task 5: 更新主入口脚本 - 移除废弃参数

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/index.ts`

- [ ] **Step 1: 更新导入**

添加新的状态函数导入：

```typescript
import {
  loadState,
  saveState,
  getCursorState,
  setCursorState,
  clearCursorState,
  ensureStateDir,
} from './state.js';
```

- [ ] **Step 2: 移除废弃的 CLI 参数定义**

删除 `--preview`, `--since`, `--until` 参数定义：

```typescript
program
  .name('pulse')
  .description('从 cyber-pulse API 拉取情报内容')
  .version('2.0.0')
  .option('-s, --source <name>', '指定情报源名称')
  .option('-a, --all', '拉取所有配置的情报源')
  .option('-o, --output <dir>', '输出目录', DEFAULT_OUTPUT_DIR)
  .option('--init', '全量同步（从头开始）')
  .option('--list-sources', '列出所有已配置的情报源')
  .option('--add-source', '交互式添加情报源')
  .option('--remove-source <name>', '删除指定情报源')
  .option('--set-default <name>', '设置默认情报源');
```

- [ ] **Step 3: 更新 PullOptions 类型**

移除废弃字段（已在 Task 2 Step 2 完成）：

```typescript
// PullOptions 类型已在 Task 2 更新，此处无需重复修改
```

- [ ] **Step 4: 更新 determinePullMode 函数**

移除 `preview` 和 `since` 模式：

```typescript
function determinePullMode(options: { init: boolean; all: boolean }): 'init' | 'incremental' | 'all' {
  if (options.init) {
    return 'init';
  }
  if (options.all) {
    return 'all';
  }
  return 'incremental';
}
```

- [ ] **Step 5: 移除废弃的参数验证逻辑**

删除以下验证代码：
- `--init` 和 `--since` 冲突检查
- `--preview` 与其他参数冲突检查
- `--until` 必须配合 `--since` 检查

- [ ] **Step 6: Commit**

```bash
git add plugins/market-radar/scripts/pulse/index.ts
git commit -m "refactor(market-radar): remove deprecated CLI parameters"
```

---

### Task 6: 更新主入口脚本 - 更新同步逻辑

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/index.ts`

- [ ] **Step 1: 更新 pullFromSource 函数**

核心逻辑变更：

```typescript
async function pullFromSource(
  source: PulseSource,
  options: { init: boolean; output: string },
  state: Record<string, unknown>
): Promise<{ success: boolean; count: number; lastFetchedAt: string | null; lastItemId: string | null; error?: string }> {
  try {
    const apiKey = getApiKey(source);
    const client = new PulseClient(source.url, apiKey);

    const mode = options.init ? 'init' : 'incremental';
    let items: PulseContent[] = [];
    let lastItemId: string | null = null;
    let lastFetchedAt: string | null = null;

    // Get or initialize sync state
    const cursorState = getCursorState(state, source.name);
    
    // For incremental mode, check if we have last_fetched_at
    if (mode === 'incremental' && !cursorState.last_fetched_at) {
      return {
        success: false,
        count: 0,
        lastFetchedAt: null,
        lastItemId: null,
        error: `未找到同步状态，请先执行 --init`
      };
    }

    // Determine since parameter
    const since = mode === 'init' ? 'beginning' : cursorState.last_fetched_at;
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await client.listContent(since, cursor, DEFAULT_LIMIT);
      validateListResponse(response);

      items.push(...response.data);
      lastItemId = response.last_item_id;
      lastFetchedAt = response.last_fetched_at;
      
      // Next page uses cursor
      cursor = response.has_more ? response.last_item_id : undefined;
      hasMore = response.has_more && cursor !== undefined;
    }

    // Write files
    await writeContentFiles(items, options.output, source.name);

    return {
      success: true,
      count: items.length,
      lastFetchedAt,
      lastItemId,
    };
  } catch (error) {
    const errorMessage = error instanceof PulseError 
      ? `${error.message} (code: ${error.code})`
      : error instanceof Error 
        ? error.message 
        : String(error);

    return {
      success: false,
      count: 0,
      lastFetchedAt: null,
      lastItemId: null,
      error: errorMessage,
    };
  }
}
```

- [ ] **Step 2: 更新 executePull 函数**

```typescript
async function executePull(options: { init: boolean; all: boolean; output: string; source?: string }): Promise<PullResult> {
  const mode = determinePullMode(options);
  const result: PullResult = {
    mode: mode === 'all' ? 'incremental' : mode,
    output_dir: path.resolve(options.output),
    sources: [],
    total_count: 0,
    pulled_at: new Date().toISOString(),
  };

  const config = loadConfig();
  const sources: PulseSource[] = options.all 
    ? config.sources 
    : [getSource(config, options.source)];

  ensureStateDir(options.output);
  let state = loadState(options.output);

  for (const source of sources) {
    // Clear cursor state for init mode
    if (options.init) {
      state = clearCursorState(state, source.name);
    }

    const sourceResult = await pullFromSource(source, options, state);
    
    if (sourceResult.success) {
      result.sources.push({
        source: source.name,
        success: true,
        count: sourceResult.count,
      });
      result.total_count += sourceResult.count;

      // Update cursor state
      if (sourceResult.lastFetchedAt && sourceResult.lastItemId) {
        state = setCursorState(
          state, 
          source.name, 
          sourceResult.lastFetchedAt, 
          sourceResult.lastItemId, 
          sourceResult.count
        );
      }
    } else {
      result.sources.push({
        source: source.name,
        success: false,
        count: 0,
        error: sourceResult.error,
      });
    }
  }

  saveState(state, options.output);
  return result;
}
```

- [ ] **Step 3: 更新 generateReport 函数**

更新报告以显示新的状态字段：

```typescript
function generateReport(result: PullResult): string {
  const lines: string[] = [
    '',
    '════════════════════════════════════════════════════════',
    '📡 情报拉取报告',
    '════════════════════════════════════════════════════════',
    '',
  ];

  const modeDescriptions: Record<string, string> = {
    incremental: '增量同步',
    init: '全量同步',
    all: '多源同步',
  };

  const config = loadConfig();
  for (const sourceResult of result.sources) {
    const source = getSource(config, sourceResult.source);

    lines.push(`源: ${source.name} (${source.url})`);
    lines.push(`模式: ${modeDescriptions[result.mode]}`);
    lines.push('');

    if (sourceResult.success) {
      lines.push('【拉取统计】');
      lines.push(`• 新增情报: ${sourceResult.count} 条`);
      lines.push(`• 写入位置: ${result.output_dir}`);
      lines.push('');

      // 读取状态显示
      const state = loadState(result.output_dir);
      const cursorState = getCursorState(state, source.name);
      if (cursorState.last_fetched_at && cursorState.last_item_id) {
        lines.push('【状态更新】');
        lines.push(`• last_fetched_at: ${cursorState.last_fetched_at}`);
        lines.push(`• last_item_id: ${cursorState.last_item_id}`);
        lines.push(`• 更新时间: ${result.pulled_at}`);
        lines.push('');
      }
    } else {
      lines.push('【拉取失败】');
      lines.push(`• 错误: ${sourceResult.error}`);
      lines.push('');
    }
  }

  if (result.total_count > 0) {
    lines.push('💡 提示: 使用 /intel-distill 处理情报');
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}
```

- [ ] **Step 4: 更新 action handler**

移除废弃参数的处理逻辑：

```typescript
.action(async (options) => {
  checkDependencies();

  try {
    // Source management modes (unchanged)
    if (options.listSources) { /* ... */ }
    if (options.addSource) { /* ... */ }
    if (options.removeSource) { /* ... */ }
    if (options.setDefault) { /* ... */ }

    // Pull mode - removed deprecated parameter validations
    const result = await executePull(options);
    console.log(generateReport(result));

    const hasFailure = result.sources.some((s) => !s.success);
    if (hasFailure) {
      process.exit(1);
    }
  } catch (error) {
    // ... error handling ...
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add plugins/market-radar/scripts/pulse/index.ts
git commit -m "refactor(market-radar): update sync logic for since+cursor pagination"
```

---

### Task 7: 更新命令文档

**Files:**
- Modify: `plugins/market-radar/commands/intel-pull.md`

- [ ] **Step 1: 更新 argument-hint**

```markdown
---
name: intel-pull
description: Pull intelligence content from cyber-pulse API with incremental sync support
argument-hint: "[--source <name>] [--all] [--output <dir>] [--init] [--list-sources] [--add-source] [--remove-source <name>] [--set-default <name>]"
allowed-tools: Read, Write, Grep, Glob, Bash, Agent
---
```

- [ ] **Step 2: 更新参数表**

移除废弃参数，更新说明：

```markdown
## 参数与使用示例

| 参数 | 必填 | 说明 |
|------|------|------|
| `--source <name>` | 否 | 指定情报源名称（默认使用 default_source） |
| `--all` | 否 | 顺序拉取所有配置的情报源 |
| `--output <dir>` | 否 | 输出目录（默认 `inbox/`） |
| `--init` | 否 | 全量同步，从头遍历所有历史数据 |
| `--list-sources` | 否 | 列出所有已配置的情报源 |
| `--add-source` | 否 | 交互式添加情报源 |
| `--remove-source <name>` | 否 | 删除指定情报源 |
| `--set-default <name>` | 否 | 设置默认情报源 |

```bash
# === 增量同步（默认模式） ===
/intel-pull

# === 全量同步 ===
/intel-pull --init

# === 指定输出目录 ===
/intel-pull --output ./docs/inbox

# === 源管理 ===
/intel-pull --list-sources
/intel-pull --add-source
/intel-pull --remove-source cloud
/intel-pull --set-default cloud
```
```

- [ ] **Step 3: 更新执行流程部分**

更新 API 调用和状态管理说明：

- 移除 `--preview`、`--since`、`--until` 相关流程
- 更新 API 调用为 `since` + `cursor` 格式
- 更新状态字段为 `last_fetched_at` 和 `last_item_id`

- [ ] **Step 4: 更新状态管理部分**

更新状态文件结构和字段说明以匹配新设计。

- [ ] **Step 5: 更新 API 对应表**

```markdown
## 与 cyber-pulse API 对应

| intel-pull 参数 | cyber-pulse API |
|------------------|-----------------|
| 默认（增量） | `GET /api/v1/items?since={last_fetched_at}&limit=50` |
| `--init` | `GET /api/v1/items?since=beginning&limit=50` |
| 分页继续 | `GET /api/v1/items?since={ts}&cursor={last_item_id}&limit=50` |

**API 响应格式（v1）**：

```json
{
  "data": [ /* PulseItem 数组 */ ],
  "last_item_id": "item_0050",
  "last_fetched_at": "2026-04-01T10:00:00Z",
  "has_more": true,
  "count": 50
}
```
```

- [ ] **Step 6: Commit**

```bash
git add plugins/market-radar/commands/intel-pull.md
git commit -m "docs(market-radar): update intel-pull command for incremental sync"
```

---

### Task 8: 更新帮助文档

**Files:**
- Modify: `plugins/market-radar/commands/references/intel-pull-guide.md`

- [ ] **Step 1: 更新参数说明**

移除废弃参数，简化说明：

```markdown
## 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--source <name>` | 否 | 指定情报源名称 | default_source |
| `--all` | 否 | 顺序拉取所有配置的情报源 | - |
| `--output <dir>` | 否 | 输出目录 | `inbox/` |
| `--init` | 否 | 全量同步（从头开始） | - |
| `--list-sources` | 否 | 列出所有已配置的情报源 | - |
| `--add-source` | 否 | 交互式添加情报源 | - |
| `--remove-source <name>` | 否 | 删除指定情报源 | - |
| `--set-default <name>` | 否 | 设置默认情报源 | - |
```

- [ ] **Step 2: 更新使用场景**

移除时间范围拉取和预览模式场景，保留：
- 场景 1：首次全量同步
- 场景 2：日常增量同步
- 场景 3：状态丢失处理

- [ ] **Step 3: 更新输出文件格式说明**

确保 frontmatter 字段说明与新 API 响应一致。

- [ ] **Step 4: 更新常见问题**

移除时间范围相关问题，添加增量同步相关问题。

- [ ] **Step 5: Commit**

```bash
git add plugins/market-radar/commands/references/intel-pull-guide.md
git commit -m "docs(market-radar): update intel-pull guide for incremental sync"
```

---

### Task 9: TypeScript 类型检查

**Files:**
- None (verification task)

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
cd plugins/market-radar/scripts
pnpm exec tsc --noEmit
```

Expected: No type errors

- [ ] **Step 2: 修复类型错误（如有）**

如果出现类型错误，检查并修复：
- 类型导入是否正确
- 函数签名是否匹配
- 可选参数处理是否正确

- [ ] **Step 3: Commit 修复（如有）**

```bash
git add plugins/market-radar/scripts/pulse/*.ts
git commit -m "fix(market-radar): resolve type errors in pulse module"
```

---

### Task 10: 功能测试

**Files:**
- None (verification task)

- [ ] **Step 1: 测试全量同步**

```bash
cd plugins/market-radar/scripts
pnpm exec tsx pulse/index.ts --init --output ./test-inbox
```

Expected:
- 成功拉取数据
- 状态文件包含 `last_fetched_at` 和 `last_item_id`

- [ ] **Step 2: 测试增量同步**

```bash
pnpm exec tsx pulse/index.ts --output ./test-inbox
```

Expected:
- 使用状态文件中的 `last_fetched_at`
- 成功拉取新数据（如有）

- [ ] **Step 3: 测试状态丢失场景**

```bash
rm -rf ./test-inbox/.intel
pnpm exec tsx pulse/index.ts --output ./test-inbox
```

Expected: 显示"未找到同步状态"提示

- [ ] **Step 4: 测试废弃参数**

```bash
pnpm exec tsx pulse/index.ts --preview
pnpm exec tsx pulse/index.ts --since "2026-01-01"
```

Expected: 显示"未知选项"错误

- [ ] **Step 5: 清理测试目录**

```bash
rm -rf ./test-inbox
```

---

### Task 11: 更新版本号

**Files:**
- Modify: `plugins/market-radar/.claude-plugin/plugin.json`

- [ ] **Step 1: 更新插件版本**

```json
{
  "name": "market-radar",
  "version": "1.5.0",
  ...
}
```

- [ ] **Step 2: 同步 marketplace.json**

更新 `marketplace.json` 中的版本号。

- [ ] **Step 3: Commit**

```bash
git add plugins/market-radar/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(market-radar): bump version to 1.5.0 for incremental sync"
```

---

## 自检清单

### 1. Spec Coverage

| Spec Requirement | Task |
|------------------|------|
| API 参数 `since` + `cursor` | Task 3, Task 6 |
| 响应字段 `last_item_id` + `last_fetched_at` | Task 1 |
| 状态字段 `last_fetched_at` + `last_item_id` + `total_synced` | Task 2, Task 4 |
| 状态迁移策略 | Task 4 |
| 废弃 `--preview` | Task 2, Task 5 |
| 废弃 `--since`（时间范围） | Task 2, Task 5 |
| 废弃 `--until` | Task 2, Task 5 |
| 删除 `listContentRange()` | Task 3 |
| 更新 `PullOptions` 类型 | Task 2 |
| 更新 `PullResult.mode` 类型 | Task 2 |
| 更新命令文档 | Task 7 |
| 更新帮助文档 | Task 8 |

### 2. Placeholder Scan

- 无 TBD、TODO 等占位符
- 所有代码步骤包含完整实现

### 3. Type Consistency

- `PulseListResponse` 在 Task 1 定义，Task 3 使用 ✓
- `PulseCursorState` 在 Task 2 定义，Task 4 使用 ✓
- `PullOptions` 在 Task 2 定义，Task 5 使用 ✓
- `PullResult.mode` 在 Task 2 定义，Task 5 使用 ✓
- 函数名一致性：`getCursorState`、`setCursorState`、`clearCursorState` ✓

### 4. Code Correctness

- `generateReport` 使用 `getCursorState` 读取状态，不再引用不存在的字段 ✓
- `pullFromSource` 返回值包含 `lastFetchedAt` 和 `lastItemId` ✓
- `executePull` 正确调用 `setCursorState` 更新状态 ✓