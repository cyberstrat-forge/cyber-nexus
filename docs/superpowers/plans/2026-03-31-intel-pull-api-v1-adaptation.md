# intel-pull 适配 cyber-pulse API v1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 intel-pull 命令适配 cyber-pulse API v1，统一输出格式，简化配置流程。

**Architecture:** 采用模块化改动策略，从底层类型定义开始，逐层向上更新 API 客户端、配置管理、输出格式、CLI 入口，最后更新预处理脚本和文档。

**Tech Stack:** TypeScript, Node.js 18+, undici (HTTP client), AJV (JSON Schema validation)

---

## 文件结构

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `scripts/pulse/types.ts` | API 类型定义、错误码 | 修改 |
| `scripts/pulse/api-client.ts` | API 客户端、请求方法 | 修改 |
| `scripts/pulse/config.ts` | 配置管理、API Key 存储 | 修改 |
| `scripts/pulse/output.ts` | 文件输出、frontmatter 生成 | 修改 |
| `scripts/pulse/index.ts` | CLI 入口、参数解析 | 修改 |
| `scripts/pulse/state.ts` | 状态管理、cursor 逻辑 | 修改 |
| `scripts/preprocess/index.ts` | 预处理、cyber-pulse 文件分支 | 修改 |
| `schemas/pulse-sources.schema.json` | 配置 Schema | 修改 |
| `commands/intel-pull.md` | 命令文档 | 修改 |
| `commands/references/intel-pull-guide.md` | 帮助文档 | 修改 |

---

## Task 1: 更新类型定义 (types.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/types.ts`

**目标:** 更新 API 类型定义以匹配 cyber-pulse API v1。

### Step 1.1: 更新 PulseSource 接口

将 `key_ref` 字段改为 `api_key`。

```typescript
/**
 * Single source configuration
 */
export interface PulseSource {
  /** Source name (unique identifier) */
  name: string;
  /** API base URL */
  url: string;
  /** API key for authentication (stored directly) */
  api_key: string;
}
```

### Step 1.2: 更新 PulseContent 接口

更新字段以匹配新 API 响应结构。

```typescript
/**
 * Source tier levels (T0 = highest priority, T3 = lowest)
 */
export type SourceTier = 'T0' | 'T1' | 'T2' | 'T3';

/**
 * Source information embedded in content (API v1)
 */
export interface PulseSourceInfo {
  /** Source ID */
  source_id: string;
  /** Source name */
  source_name: string;
  /** Source URL */
  source_url?: string;
  /** Source tier (T0-T3) */
  source_tier: SourceTier;
  /** Source score (0-100) */
  source_score?: number;
}

/**
 * API content item from cyber-pulse API v1
 *
 * Field mapping from API v1:
 * - id → item_id (frontmatter)
 * - title → Markdown 标题
 * - body → Markdown 正文
 * - fetched_at → first_seen_at (frontmatter)
 */
export interface PulseContent {
  /** Item ID (format: item_{8位hex}) */
  id: string;
  /** Title - used as Markdown heading */
  title: string;
  /** Markdown content */
  body: string;
  /** Original URL */
  url?: string;
  /** Author (optional) */
  author?: string;
  /** Tags array */
  tags?: string[];
  /** Published timestamp (ISO 8601) */
  published_at?: string;
  /** Fetched timestamp (ISO 8601) - maps to first_seen_at */
  fetched_at: string;
  /** Source information */
  source?: PulseSourceInfo;
  /** Completeness score (0-1) */
  completeness_score?: number;
  /** Word count */
  word_count?: number;
}
```

### Step 1.3: 更新 PulseListResponse 接口

添加新字段 `count` 和 `server_timestamp`。

```typescript
/**
 * API list response (v1 format)
 */
export interface PulseListResponse {
  /** List of content items */
  data: PulseContent[];
  /** Cursor for next page */
  next_cursor: string | null;
  /** Whether more items available */
  has_more: boolean;
  /** Number of items in current response */
  count: number;
  /** Server timestamp (ISO 8601) */
  server_timestamp: string;
}
```

### Step 1.4: 移除 PulseItemResponse 类型

单条获取端点已移除，删除相关类型。

```typescript
// 删除以下代码：
// export type PulseItemResponse = PulseContent;
```

### Step 1.5: 更新 PullOptions 接口

新增 `init`、`until`、`preview` 参数，移除 `id` 参数。

```typescript
/**
 * Parsed CLI arguments
 */
export interface PullOptions {
  /** Source name to pull from */
  source?: string;
  /** Pull from all sources */
  all: boolean;
  /** Output directory */
  output: string;
  /** First sync / re-sync from beginning */
  init: boolean;
  /** Pull items since datetime */
  since?: string;
  /** Pull items until datetime */
  until?: string;
  /** Preview mode - fetch only one page */
  preview: boolean;
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

### Step 1.6: 更新 PullResult 的 mode 类型

移除 `single` 模式，添加 `preview` 模式。

```typescript
/**
 * Overall pull result
 */
export interface PullResult {
  /** Pull mode used */
  mode: 'incremental' | 'init' | 'since' | 'preview' | 'all';
  // ... 其他字段保持不变
}
```

### Step 1.7: 更新错误码

添加新错误码，移除不再需要的错误码。

```typescript
/**
 * Error codes for pulse module
 */
export type PulseErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_PARSE_ERROR'
  | 'API_KEY_NOT_SET'
  | 'SOURCE_NOT_FOUND'
  | 'API_CONNECTION_FAILED'
  | 'API_AUTH_FAILED'
  | 'API_TIMEOUT'
  | 'API_ERROR'
  | 'API_INVALID_RESPONSE'
  | 'INVALID_OPTIONS';

// 移除以下错误码：
// | 'ENV_VAR_NOT_SET'
// | 'CONTENT_NOT_FOUND'
// | 'STATE_ERROR'
```

### Step 1.8: 删除 validateItemResponse 函数

单条获取端点已移除，删除验证函数。

```typescript
// 删除整个 validateItemResponse 函数
```

### Step 1.9: 更新 validateListResponse 函数

适配新的响应结构。

```typescript
/**
 * Validate API list response structure (v1)
 */
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

  // v1: next_cursor and has_more are at top level, not in meta
  if (resp.next_cursor !== null && typeof resp.next_cursor !== 'string') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 next_cursor: 应为 string 或 null，实际为 ${typeof resp.next_cursor}`,
      { nextCursorType: typeof resp.next_cursor, response }
    );
  }

  if (typeof resp.has_more !== 'boolean') {
    throw new PulseError(
      'API_INVALID_RESPONSE',
      `API 返回无效 has_more: 应为 boolean，实际为 ${typeof resp.has_more}`,
      { hasMoreType: typeof resp.has_more, response }
    );
  }

  return true;
}
```

- [ ] **Step 1.10: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

Expected: 类型错误（其他文件引用了已删除的类型），这是预期的

- [ ] **Step 1.11: 提交**

```bash
git add plugins/market-radar/scripts/pulse/types.ts
git commit -m "refactor(market-radar): update pulse types for API v1"
```

---

## Task 2: 更新 API 客户端 (api-client.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/api-client.ts`

**目标:** 更新端点路径、请求参数、响应解析逻辑。

### Step 2.1: 更新 ListQueryParams 接口

添加 `from` 参数，移除 `since`（改为顶层方法参数）。

```typescript
/**
 * Query parameters for list items API
 */
interface ListQueryParams {
  cursor?: string;
  from?: 'latest' | 'beginning';
  limit?: number;
  since?: string;
  until?: string;
}
```

### Step 2.2: 更新 makeRequest 方法的参数处理

```typescript
// 在 makeRequest 方法中，更新 query 参数构建逻辑
if (query) {
  if (query.cursor) {
    url.searchParams.set('cursor', query.cursor);
  }
  if (query.from) {
    url.searchParams.set('from', query.from);
  }
  if (query.limit !== undefined) {
    url.searchParams.set('limit', String(query.limit));
  }
  if (query.since) {
    url.searchParams.set('since', query.since);
  }
  if (query.until) {
    url.searchParams.set('until', query.until);
  }
}
```

### Step 2.3: 更新 listContent 方法

更新端点路径，添加 `from` 参数支持。

```typescript
/**
 * List content items (incremental mode)
 *
 * GET /api/v1/items?cursor={cursor}&limit={limit}
 *
 * @param cursor - Pagination cursor (optional)
 * @param limit - Number of items to return (default: 100)
 * @returns List response
 */
async listContent(
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PulseListResponse> {
  return this.makeRequest<PulseListResponse>('/api/v1/items', {
    cursor,
    limit,
  });
}
```

### Step 2.4: 添加 listContentFromBeginning 方法

```typescript
/**
 * List content items from beginning (init mode)
 *
 * GET /api/v1/items?from=beginning&limit={limit}
 *
 * @param limit - Number of items to return (default: 100)
 * @returns List response
 */
async listContentFromBeginning(
  limit: number = DEFAULT_LIMIT
): Promise<PulseListResponse> {
  return this.makeRequest<PulseListResponse>('/api/v1/items', {
    from: 'beginning',
    limit,
  });
}
```

### Step 2.5: 更新 listContentSince 方法

添加 `until` 参数支持。

```typescript
/**
 * List content items within time range
 *
 * GET /api/v1/items?since={since}&until={until}&cursor={cursor}&limit={limit}
 *
 * @param since - ISO 8601 datetime string (start)
 * @param until - ISO 8601 datetime string (end, optional)
 * @param cursor - Pagination cursor (optional)
 * @param limit - Number of items to return (default: 100)
 * @returns List response
 */
async listContentRange(
  since: string,
  until?: string,
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<PulseListResponse> {
  const params: ListQueryParams = {
    since,
    cursor,
    limit,
  };
  if (until) {
    params.until = until;
  }
  return this.makeRequest<PulseListResponse>('/api/v1/items', params);
}
```

### Step 2.6: 删除 getContent 方法

单条获取端点已移除。

```typescript
// 删除整个 getContent 方法
```

### Step 2.7: 更新导入类型

```typescript
import {
  PulseListResponse,
  PulseError,
  DEFAULT_LIMIT,
  CONNECT_TIMEOUT,
  REQUEST_TIMEOUT,
  RETRY_COUNT,
  RETRY_DELAY,
} from './types.js';

// 移除 PulseItemResponse 导入
```

- [ ] **Step 2.8: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

Expected: 类型错误（index.ts 引用了已删除的方法），这是预期的

- [ ] **Step 2.9: 提交**

```bash
git add plugins/market-radar/scripts/pulse/api-client.ts
git commit -m "refactor(market-radar): update api-client for API v1 endpoints"
```

---

## Task 3: 更新配置管理 (config.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/config.ts`

**目标:** 将 `key_ref` 改为 `api_key`，直接存储 API Key。

### Step 3.1: 更新 getApiKey 函数

直接从配置中读取 API Key，而非从环境变量。

```typescript
/**
 * Get API key from source configuration
 *
 * @param source - Source configuration
 * @returns API key value
 * @throws {PulseError} If API key not set
 */
export function getApiKey(source: PulseSource): string {
  if (!source.api_key) {
    throw new PulseError(
      'API_KEY_NOT_SET',
      `源 "${source.name}" 未配置 API Key`,
      { source: source.name }
    );
  }

  return source.api_key;
}
```

### Step 3.2: 更新 hasApiKey 函数

```typescript
/**
 * Check if API key is set for a source
 *
 * @param source - Source configuration
 * @returns true if API key is set, false otherwise
 */
export function hasApiKey(source: PulseSource): boolean {
  return Boolean(source.api_key && source.api_key.length > 0);
}
```

### Step 3.3: 更新 generateConfigNotFoundMessage 函数

更新示例配置中的字段名。

```typescript
export function generateConfigNotFoundMessage(configPath: string): string {
  return `配置文件不存在: ${configPath}

请先创建配置文件，示例如下:

\`\`\`json
{
  "sources": [
    {
      "name": "cyber-pulse",
      "url": "https://api.example.com",
      "api_key": "cp_live_xxxxxxxxxxxxxxxx"
    }
  ],
  "default_source": "cyber-pulse"
}
\`\`\`

创建命令:
  mkdir -p ${path.dirname(configPath)}
  # 编辑 ${configPath} 文件添加上述内容
`;
}
```

### Step 3.4: 更新 interactiveAddSource 函数（在 index.ts 中）

更新交互式添加源的提示和逻辑。

```typescript
async function interactiveAddSource(): Promise<void> {
  const rl = createReadlineInterface();

  try {
    console.log('');
    console.log('添加新的情报源');
    console.log('----------------');
    console.log('');

    const name = await prompt(rl, '源名称 (如: cyber-pulse): ');
    if (!name) {
      console.error('错误: 源名称不能为空');
      return;
    }

    const url = await prompt(rl, 'API URL (如: https://api.example.com): ');
    if (!url) {
      console.error('错误: API URL 不能为空');
      return;
    }

    const apiKey = await prompt(rl, 'API Key: ');
    if (!apiKey) {
      console.error('错误: API Key 不能为空');
      return;
    }

    // Load existing config or create new one
    let config: PulseSourcesConfig;
    try {
      config = loadConfig();
    } catch (error) {
      if (error instanceof PulseError && error.code === 'CONFIG_NOT_FOUND') {
        config = {
          sources: [],
          default_source: name,
        };
      } else {
        throw error;
      }
    }

    // Add new source
    const newSource: PulseSource = { name, url, api_key: apiKey };
    try {
      addSource(config, newSource);

      // Set as default if it's the first source
      if (config.sources.length === 1) {
        config.default_source = name;
      }

      saveConfig(config);
      console.log('');
      console.log(`成功添加源: ${name}`);
    } catch (error) {
      if (error instanceof PulseError) {
        console.error(`错误: ${error.message}`);
      } else {
        throw error;
      }
    }
  } finally {
    rl.close();
  }
}
```

### Step 3.5: 更新 formatSourcesList 函数

```typescript
export function formatSourcesList(config: PulseSourcesConfig): string {
  const lines: string[] = ['配置的情报源列表:', ''];

  for (const source of config.sources) {
    const isDefault = source.name === config.default_source;
    const hasKey = hasApiKey(source);
    const marker = isDefault ? ' *' : '  ';
    const keyStatus = hasKey ? '[已配置 API Key]' : '[未配置 API Key]';

    lines.push(`${marker} ${source.name}`);
    lines.push(`    URL: ${source.url}`);
    lines.push(`    API Key: ${keyStatus}`);
    lines.push('');
  }

  lines.push(`默认源: ${config.default_source}`);

  return lines.join('\n');
}
```

- [ ] **Step 3.6: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

- [ ] **Step 3.7: 提交**

```bash
git add plugins/market-radar/scripts/pulse/config.ts
git commit -m "refactor(market-radar): change key_ref to api_key in config"
```

---

## Task 4: 更新输出格式 (output.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/output.ts`

**目标:** 使用新的 frontmatter 格式和文件命名规则。

### Step 4.1: 更新 generateFilename 函数

新的 ID 格式为 `item_{8位hex}`。

```typescript
/**
 * Generate filename from PulseContent
 *
 * Format: {YYYYMMDD}-{item_id}.md
 * Example: 20260330-item_a1b2c3d4.md
 *
 * @param content - PulseContent item
 * @returns Generated filename
 * @throws Error if fetched_at or id format is invalid
 */
export function generateFilename(content: PulseContent): string {
  // Validate fetched_at exists
  if (!content.fetched_at) {
    throw new Error(
      `Missing fetched_at field in content ${content.id || 'unknown'}. ` +
      `Expected ISO 8601 format (e.g., 2026-03-30T09:00:00Z)`
    );
  }

  // Extract YYYYMMDD from fetched_at
  const dateMatch = content.fetched_at.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) {
    throw new Error(
      `Invalid fetched_at format for content ${content.id}: "${content.fetched_at}". ` +
      `Expected ISO 8601 format (e.g., 2026-03-30T09:00:00Z)`
    );
  }
  const dateStr = `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`;

  // Validate id exists
  if (!content.id) {
    throw new Error(
      `Missing id field in content. ` +
      `Expected format: item_xxxxxxxx`
    );
  }

  // New ID format: item_{8位hex}, use directly
  return `${dateStr}-${content.id}.md`;
}
```

### Step 4.2: 更新 generateFrontmatter 函数

使用新的统一 frontmatter 格式。

```typescript
/**
 * Generate frontmatter YAML string
 *
 * @param content - PulseContent item
 * @param sourceName - Source name for source_type field
 * @returns YAML frontmatter string
 */
function generateFrontmatter(content: PulseContent, sourceName: string): string {
  const lines: string[] = [
    '---',
    '# ============================================',
    '# 第一组：核心标识（必须填写）',
    '# ============================================',
    `item_id: "${escapeYamlString(content.id)}"`,
    `source_type: "cyber-pulse"`,
    `first_seen_at: "${escapeYamlString(content.fetched_at)}"`,
    '',
    '# ============================================',
    '# 第二组：内容元数据',
    '# ============================================',
    `title: "${escapeYamlString(content.title || '')}"`,
  ];

  // Optional content metadata
  if (content.url) {
    lines.push(`url: "${escapeYamlString(content.url)}"`);
  }
  if (content.author) {
    lines.push(`author: "${escapeYamlString(content.author)}"`);
  }
  if (content.tags && content.tags.length > 0) {
    const escapedTags = content.tags.map(t => `"${escapeYamlString(t)}"`).join(', ');
    lines.push(`tags: [${escapedTags}]`);
  }
  if (content.published_at) {
    lines.push(`published_at: "${escapeYamlString(content.published_at)}"`);
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第三组：来源信息');
  lines.push('# ============================================');

  // Source info
  if (content.source) {
    if (content.source.source_id) {
      lines.push(`source_id: "${escapeYamlString(content.source.source_id)}"`);
    }
    if (content.source.source_name) {
      lines.push(`source_name: "${escapeYamlString(content.source.source_name)}"`);
    }
    if (content.source.source_url) {
      lines.push(`source_url: "${escapeYamlString(content.source.source_url)}"`);
    }
    if (content.source.source_tier) {
      lines.push(`source_tier: "${escapeYamlString(content.source.source_tier)}"`);
    }
    if (content.source.source_score !== undefined) {
      lines.push(`source_score: ${content.source.source_score}`);
    }
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第四组：质量指标');
  lines.push('# ============================================');

  // Quality metrics
  if (content.completeness_score !== undefined) {
    lines.push(`completeness_score: ${content.completeness_score}`);
  }
  if (content.word_count !== undefined) {
    lines.push(`word_count: ${content.word_count}`);
  }

  lines.push('');
  lines.push('# ============================================');
  lines.push('# 第五组：处理追溯（预处理脚本填充）');
  lines.push('# ============================================');
  lines.push('content_hash: ""');
  lines.push('archived_path: ""');
  lines.push('---');

  return lines.join('\n');
}
```

### Step 4.3: 更新 generateMarkdown 函数

使用 `body` 字段作为正文。

```typescript
/**
 * Generate complete Markdown content
 *
 * @param content - PulseContent item
 * @param sourceName - Source name
 * @returns Complete Markdown content string
 */
function generateMarkdown(content: PulseContent, sourceName: string): string {
  const frontmatter = generateFrontmatter(content, sourceName);
  const title = content.title || '(无标题)';
  const body = content.body || '';

  return `${frontmatter}

# ${title}

${body}
`;
}
```

- [ ] **Step 4.4: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

- [ ] **Step 4.5: 提交**

```bash
git add plugins/market-radar/scripts/pulse/output.ts
git commit -m "refactor(market-radar): update output format for API v1"
```

---

## Task 5: 更新 CLI 入口 (index.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/index.ts`

**目标:** 新增参数、更新执行逻辑。

### Step 5.1: 更新导入

移除不再需要的导入，添加新导入。

```typescript
import {
  PullOptions,
  PullResult,
  PullSourceResult,
  PullSourceResultSuccess,
  PullSourceResultFailure,
  PulseSource,
  PulseSourcesConfig,
  PulseContent,
  PulseError,
  validateListResponse,
} from './types.js';

// 移除: PulseItemResponse, validateItemResponse
```

同时更新 state.js 导入，添加 clearCursor：

```typescript
import {
  loadState,
  saveState,
  getCursor,
  setCursor,
  clearCursor,
  ensureStateDir,
} from './state.js';
```

### Step 5.2: 更新 determinePullMode 函数

```typescript
/**
 * Determine pull mode based on CLI options
 */
function determinePullMode(options: PullOptions): 'incremental' | 'init' | 'since' | 'preview' | 'all' {
  if (options.preview) {
    return 'preview';
  }
  if (options.init) {
    return 'init';
  }
  if (options.since) {
    return 'since';
  }
  if (options.all) {
    return 'all';
  }
  return 'incremental';
}
```

### Step 5.3: 更新 pullFromSource 函数

移除单条模式，添加新模式的处理逻辑。

```typescript
async function pullFromSource(
  source: PulseSource,
  options: PullOptions,
  state: Record<string, unknown>
): Promise<PullSourceResult> {
  try {
    const apiKey = getApiKey(source);
    const client = new PulseClient(source.url, apiKey);

    let items: PulseContent[] = [];
    let newCursor: string | undefined;

    const mode = determinePullMode(options);

    if (mode === 'preview') {
      // Preview mode: fetch only one page, no cursor
      const response = await client.listContent(undefined, 50);
      validateListResponse(response);
      items = response.data;
      newCursor = undefined; // Don't update cursor
    } else if (mode === 'init') {
      // Init mode: from=beginning, paginate all
      let response = await client.listContentFromBeginning(100);
      validateListResponse(response);
      items.push(...response.data);

      let cursor = response.next_cursor;
      while (response.has_more && cursor) {
        response = await client.listContent(cursor, 100);
        validateListResponse(response);
        items.push(...response.data);
        cursor = response.next_cursor;
      }
      newCursor = cursor || undefined;
    } else if (mode === 'since') {
      // Since mode: use time range, paginate with cursor
      let response = await client.listContentRange(options.since, options.until, undefined, 100);
      validateListResponse(response);
      items.push(...response.data);

      let cursor = response.next_cursor;
      while (response.has_more && cursor) {
        response = await client.listContentRange(options.since, options.until, cursor, 100);
        validateListResponse(response);
        items.push(...response.data);
        cursor = response.next_cursor;
      }
      newCursor = undefined; // Don't update cursor for since mode
    } else {
      // Incremental mode: use saved cursor
      const savedCursor = getCursor(state, source.name).cursor;
      let cursor: string | undefined = savedCursor || undefined;

      let response: PulseListResponse;
      if (cursor) {
        response = await client.listContent(cursor, 100);
      } else {
        response = await client.listContent(undefined, 100);
      }

      validateListResponse(response);
      items.push(...response.data);

      cursor = response.next_cursor || undefined;
      while (response.has_more && cursor) {
        response = await client.listContent(cursor, 100);
        validateListResponse(response);
        items.push(...response.data);
        cursor = response.next_cursor || undefined;
      }
      newCursor = cursor;
    }

    // Write files
    const files = await writeContentFiles(items, options.output, source.name);

    const successResult: PullSourceResultSuccess = {
      source: source.name,
      success: true,
      count: items.length,
      files,
      new_cursor: newCursor,
    };
    return successResult;
  } catch (error) {
    let errorMessage: string;
    if (error instanceof PulseError) {
      errorMessage = `${error.message} (code: ${error.code})`;
      if (error.details) {
        console.error(`[pulse] Error details for ${source.name}:`, error.details);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    const failureResult: PullSourceResultFailure = {
      source: source.name,
      success: false,
      count: 0,
      error: errorMessage,
    };
    return failureResult;
  }
}
```

### Step 5.4: 更新 executePull 函数

更新模式判断和 cursor 更新逻辑。

**cursor 更新规则**：
- `incremental` 模式：读取保存的 cursor → 拉取 → 更新 cursor
- `init` 模式：清空 cursor → 从 `from=beginning` 拉取 → 保存新 cursor
- `since` 模式：不使用保存的 cursor → 拉取 → 不更新 cursor
- `preview` 模式：不使用保存的 cursor → 拉取一页 → 不更新 cursor

```typescript
async function executePull(options: PullOptions): Promise<PullResult> {
  const mode = determinePullMode(options);
  const result: PullResult = {
    mode,
    output_dir: path.resolve(options.output),
    sources: [],
    total_count: 0,
    pulled_at: new Date().toISOString(),
  };

  const config = loadConfig();

  const sources: PulseSource[] = [];
  if (options.all) {
    sources.push(...config.sources);
  } else {
    sources.push(getSource(config, options.source));
  }

  ensureStateDir(options.output);
  let state = loadState(options.output);

  for (const source of sources) {
    // Clear cursor before pulling in init mode
    if (mode === 'init') {
      state = clearCursor(state, source.name);
    }

    const sourceResult = await pullFromSource(source, options, state);
    result.sources.push(sourceResult);
    result.total_count += sourceResult.count;

    // Update cursor in incremental and init modes
    if (sourceResult.success && sourceResult.new_cursor) {
      if (mode === 'incremental' || mode === 'init') {
        state = setCursor(state, source.name, sourceResult.new_cursor);
      }
    }
  }

  // Save state
  saveState(state, options.output);

  return result;
}
```

### Step 5.5: 更新 generateReport 函数

更新模式描述。

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
    incremental: '增量拉取',
    init: '首次同步',
    since: '时间范围拉取',
    preview: '预览模式',
    all: '全量拉取',
  };

  // ... rest of the function remains similar
}
```

### Step 5.6: 更新 CLI 参数定义

```typescript
program
  .name('pulse')
  .description('从 cyber-pulse API 拉取情报内容')
  .version('1.0.0')
  .option('-s, --source <name>', '指定情报源名称')
  .option('-a, --all', '拉取所有配置的情报源')
  .option('-o, --output <dir>', '输出目录', DEFAULT_OUTPUT_DIR)
  .option('--init', '首次同步/重新同步（从最开始遍历）')
  .option('--since <datetime>', '拉取指定时间后的数据 (ISO 8601)')
  .option('--until <datetime>', '拉取指定时间前的数据 (ISO 8601)')
  .option('--preview', '预览最新一页（50条，不更新状态）')
  .option('--list-sources', '列出所有已配置的情报源')
  .option('--add-source', '交互式添加情报源')
  .option('--remove-source <name>', '删除指定情报源')
  .option('--set-default <name>', '设置默认情报源')
  .action(async (options: PullOptions) => {
    // ... existing action logic
  });
```

### Step 5.7: 更新参数验证逻辑

```typescript
// 在 action 中添加参数冲突检查
if (options.init && options.since) {
  console.error('错误: --init 和 --since 不能同时使用');
  process.exit(1);
}

if (options.preview && (options.init || options.since || options.until)) {
  console.error('错误: --preview 不能与其他拉取选项同时使用');
  process.exit(1);
}

if (options.source && options.all) {
  console.error('错误: --source 和 --all 不能同时使用');
  process.exit(1);
}
```

- [ ] **Step 5.8: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

Expected: 通过

- [ ] **Step 5.9: 提交**

```bash
git add plugins/market-radar/scripts/pulse/index.ts
git commit -m "feat(market-radar): add --init, --until, --preview options"
```

---

## Task 6: 更新状态管理 (state.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/pulse/state.ts`

**目标:** 更新 cursor 格式注释，确保兼容新格式。

### Step 6.1: 更新注释说明

```typescript
/**
 * Pulse state management
 *
 * Manages cursor tracking in state.json (shared with intel-distill).
 *
 * Cursor format (v1):
 * - Old: cnt_YYYYMMDDHHMMSS_xxxxxxxx
 * - New: item_{8位hex}
 *
 * Field ownership in state.json:
 * - pulse.cursors: managed by intel-pull (this module)
 * - queue, review, processed, stats: managed by intel-distill
 */
```

### Step 6.2: 更新状态版本号

```typescript
/** Current state file version */
const STATE_VERSION = '2.3.0';
```

### Step 6.3: 添加 clearCursor 函数

用于 `--init` 模式清空 cursor。

```typescript
/**
 * Clear cursor for a source (used by --init mode)
 */
export function clearCursor(
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

- [ ] **Step 6.4: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

- [ ] **Step 6.5: 提交**

```bash
git add plugins/market-radar/scripts/pulse/state.ts
git commit -m "refactor(market-radar): update state management for API v1 cursor format"
```

---

## Task 7: 更新预处理脚本 (preprocess/index.ts)

**Files:**
- Modify: `plugins/market-radar/scripts/preprocess/index.ts`
- Modify: `plugins/market-radar/scripts/preprocess/types.ts`

**目标:** 添加 cyber-pulse 文件处理分支，更新错误码类型。

### Step 7.1: 更新 PreprocessErrorCode 类型

在 `types.ts` 中添加新错误码。

```typescript
/**
 * Error codes for preprocessing failures
 */
export type PreprocessErrorCode =
  | 'READ_FAILED'        // Source file cannot be read
  | 'CONVERSION_FAILED'  // PDF/DOCX conversion failed
  | 'CLEAN_FAILED'       // Content cleaning failed
  | 'DEPENDENCY_MISSING' // Required dependency (e.g., pandoc) not installed
  | 'ARCHIVE_FAILED'     // Failed to archive source file
  | 'INVALID_PULSE_FORMAT' // cyber-pulse file missing required fields
  | 'WRITE_FAILED';      // Failed to write converted file
```

### Step 7.2: 添加 isCyberPulseFile 函数

在 `preprocess/index.ts` 中添加检测函数。

```typescript
/**
 * Check if a file is a cyber-pulse output file
 *
 * Detection: Markdown file with source_type: cyber-pulse in frontmatter
 */
function isCyberPulseFile(filePath: string): boolean {
  if (!filePath.endsWith('.md')) {
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    return frontmatter?.source_type === 'cyber-pulse';
  } catch {
    return false;
  }
}
```

### Step 7.3: 添加 validateCyberPulseFile 函数

```typescript
/**
 * Validate cyber-pulse file has required fields
 */
function validateCyberPulseFile(filePath: string): { valid: boolean; missingFields: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  const requiredFields = ['item_id', 'source_type', 'first_seen_at', 'title'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!frontmatter || !frontmatter[field]) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
```

### Step 7.4: 添加 collectKnownFiles 函数

完整实现递归搜索 converted 目录。

```typescript
/**
 * Collect known filenames from converted directory for cyber-pulse deduplication
 *
 * Walks through converted/YYYY/MM/ directories to collect all .md filenames.
 * Since cyber-pulse files are named with item_id, filename uniquely identifies a file.
 */
function collectKnownFiles(sourceDir: string): Set<string> {
  const knownFiles = new Set<string>();
  const convertedBase = path.join(sourceDir, 'converted');

  if (!fs.existsSync(convertedBase)) {
    return knownFiles;
  }

  // Walk through converted/YYYY/MM/ directories
  let years: string[];
  try {
    years = fs.readdirSync(convertedBase, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))
      .map(e => e.name);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Cannot read converted directory ${convertedBase}: ${errMsg}`);
    return knownFiles;
  }

  for (const year of years) {
    let months: string[];
    try {
      months = fs.readdirSync(path.join(convertedBase, year), { withFileTypes: true })
        .filter(e => e.isDirectory() && /^\d{2}$/.test(e.name))
        .map(e => e.name);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read year directory ${year}: ${errMsg}`);
      continue;
    }

    for (const month of months) {
      const monthDir = path.join(convertedBase, year, month);
      let files: string[];
      try {
        files = fs.readdirSync(monthDir, { withFileTypes: true })
          .filter(e => e.isFile() && e.name.endsWith('.md'))
          .map(e => e.name);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Cannot read month directory ${monthDir}: ${errMsg}`);
        continue;
      }

      for (const mdFile of files) {
        knownFiles.add(mdFile);
      }
    }
  }

  return knownFiles;
}
```

### Step 7.5: 添加 processCyberPulseFile 函数

确保返回类型与 `PreprocessResult` 兼容。

```typescript
/**
 * Process a cyber-pulse file
 *
 * For cyber-pulse files:
 * - Skip format conversion (already Markdown)
 * - Skip content cleaning (already processed)
 * - Calculate content_hash and update frontmatter
 * - Move to converted/YYYY/MM/
 */
async function processCyberPulseFile(
  sourcePath: string,
  convertedDir: string,
  sourceDir: string,
  knownFiles: Set<string>
): Promise<PreprocessResult> {
  const filename = path.basename(sourcePath);

  // Check for duplicate by filename (item_id is in filename)
  if (knownFiles.has(filename)) {
    return {
      success: true,
      isDuplicate: true,
      archivedPath: sourcePath,
    };
  }

  // Validate required fields
  const validation = validateCyberPulseFile(sourcePath);
  if (!validation.valid) {
    const errorMsg = `cyber-pulse 文件格式不完整，缺少字段: ${validation.missingFields.join(', ')}`;
    const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'INVALID_PULSE_FORMAT', errorMsg);
    return {
      success: false,
      error: { code: 'INVALID_PULSE_FORMAT', message: errorMsg },
      errorLogPath,
    };
  }

  // Read file content
  const content = fs.readFileSync(sourcePath, 'utf-8');

  // Calculate content_hash from body (content after frontmatter)
  const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : '';
  const crypto = require('crypto');
  const contentHash = crypto.createHash('md5').update(body).digest('hex');

  // Update frontmatter with content_hash
  const updatedContent = content.replace(
    /^content_hash: ""$/m,
    `content_hash: "${contentHash}"`
  );

  // Write to converted directory
  const convertedPath = path.join(convertedDir, filename);
  try {
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }
    fs.writeFileSync(convertedPath, updatedContent, 'utf-8');

    // Remove original file from inbox
    fs.unlinkSync(sourcePath);

    return {
      success: true,
      isDuplicate: false,
      convertedPath,
      archivedPath: '', // cyber-pulse files have no archive
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const errorLogPath = writeErrorLog(sourcePath, sourceDir, 'WRITE_FAILED', message);
    return {
      success: false,
      error: { code: 'WRITE_FAILED', message },
      errorLogPath,
    };
  }
}
```

### Step 7.6: 更新 scanDirectory 函数

添加对 `.md` 文件的检测（cyber-pulse 文件）。

```typescript
/**
 * Scan directory for files to process
 * Priority: inbox/ first, then root directory (excluding special dirs)
 */
function scanDirectory(sourceDir: string): string[] {
  const files: string[] = [];
  const excludeDirs = new Set(['inbox', 'archive', 'converted', 'intelligence', '.intel']);

  function scan(dir: string, isRoot: boolean = false) {
    if (!fs.existsSync(dir)) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read directory ${dir}: ${errMsg}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip hidden directories and special directories
      if (entry.name.startsWith('.') || excludeDirs.has(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && isSupportedFormat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  // Priority 1: Scan inbox/ directory
  const inboxDir = path.join(sourceDir, 'inbox');
  if (fs.existsSync(inboxDir)) {
    try {
      const inboxEntries = fs.readdirSync(inboxDir, { withFileTypes: true });
      for (const entry of inboxEntries) {
        const fullPath = path.join(inboxDir, entry.name);
        // Include supported formats AND .md files (for cyber-pulse detection)
        if (entry.isFile() && (isSupportedFormat(fullPath) || entry.name.endsWith('.md'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Cannot read inbox directory ${inboxDir}: ${errMsg}`);
    }
  }

  // Priority 2: Scan root directory (for backward compatibility)
  scan(sourceDir, true);

  return files;
}
```

### Step 7.7: 更新 batchProcess 函数

添加 cyber-pulse 文件分支处理。

```typescript
async function batchProcess(options: PreprocessOptions): Promise<BatchResult> {
  const {
    sourceDir,
    archiveDir,
    convertedDir,
    preprocessorVersion,
    force = false,
    dateRef = new Date(),
  } = options;

  // Collect known hashes for local file deduplication
  const knownHashes = force ? new Map<string, string>() : collectKnownHashes(sourceDir);

  // Collect known files for cyber-pulse deduplication
  const knownFiles = force ? new Set<string>() : collectKnownFiles(sourceDir);

  // Scan for files
  const files = scanDirectory(sourceDir);
  const results = new Map<string, PreprocessResult>();
  let processed = 0;
  let skipped = 0;
  let duplicates = 0;
  let failed = 0;

  for (const sourcePath of files) {
    // Check if cyber-pulse file (handle first)
    if (isCyberPulseFile(sourcePath)) {
      const result = await processCyberPulseFile(
        sourcePath,
        convertedDir,
        sourceDir,
        knownFiles
      );
      results.set(sourcePath, result);

      if (result.isDuplicate) {
        duplicates++;
      } else if (result.success) {
        processed++;
        // Add to known files to avoid re-processing in same batch
        knownFiles.add(path.basename(sourcePath));
      } else {
        failed++;
        console.error(`Failed: ${sourcePath} - ${result.error?.message}`);
      }
      continue;
    }

    // Local file processing (existing logic)
    const sourceHash = calculateHash(sourcePath);

    // Check if already processed (unless force)
    if (!force && knownHashes.has(sourceHash)) {
      duplicates++;
      results.set(sourcePath, {
        success: true,
        isDuplicate: true,
        archivedPath: knownHashes.get(sourceHash),
      });
      continue;
    }

    // Process local file
    const result = await processFile(
      sourcePath,
      archiveDir,
      convertedDir,
      sourceDir,
      preprocessorVersion,
      knownHashes,
      dateRef
    );

    results.set(sourcePath, result);

    if (result.isDuplicate) {
      duplicates++;
    } else if (result.success) {
      processed++;
      // Add to known hashes to avoid re-processing in same batch
      knownHashes.set(sourceHash, result.archivedPath || '');
    } else {
      failed++;
      console.error(`Failed: ${sourcePath} - ${result.error?.message}`);
    }
  }

  return {
    total: files.length,
    processed,
    skipped,
    duplicates,
    failed,
    results,
    archiveDir,
    convertedDir,
  };
}
```

### Step 7.8: 更新 generateErrorLog 函数

添加新的错误码建议操作。

```typescript
const suggestionMap: Record<string, string[]> = {
  CONVERSION_FAILED: [
    '检查文件是否损坏',
    '尝试用其他工具打开文件',
    '如为扫描版 PDF，请使用 OCR 工具处理',
  ],
  DEPENDENCY_MISSING: [
    '安装缺失的依赖工具',
    'macOS: brew install pandoc poppler',
    'Python: pip install PyMuPDF',
  ],
  READ_FAILED: [
    '检查文件是否存在',
    '检查文件权限',
    '确认文件未被其他程序占用',
  ],
  CLEAN_FAILED: [
    '检查文件内容格式',
    '尝试手动查看文件内容',
  ],
  ARCHIVE_FAILED: [
    '检查输出目录权限',
    '确认磁盘空间充足',
    '检查 converted/ 目录是否可写',
  ],
  INVALID_PULSE_FORMAT: [
    '检查文件是否为 intel-pull 正确输出',
    '检查 frontmatter 是否包含必需字段',
    '重新执行 /intel-pull 命令',
  ],
  WRITE_FAILED: [
    '检查输出目录权限',
    '确认磁盘空间充足',
    '检查 converted/ 目录是否可写',
  ],
};
```

- [ ] **Step 7.9: 运行类型检查**

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

- [ ] **Step 7.10: 提交**

```bash
git add plugins/market-radar/scripts/preprocess/index.ts
git add plugins/market-radar/scripts/preprocess/types.ts
git commit -m "feat(market-radar): add cyber-pulse file handling in preprocess"
```

---

## Task 8: 更新 JSON Schema (pulse-sources.schema.json)

**Files:**
- Modify: `plugins/market-radar/schemas/pulse-sources.schema.json`

**目标:** 更新 Schema 定义以匹配新的配置格式。

### Step 8.1: 更新 Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "pulse-sources.schema.json",
  "title": "Pulse Sources Configuration Schema",
  "description": "JSON Schema for pulse-sources.json validation (API v1)",
  "type": "object",
  "required": ["sources", "default_source"],
  "additionalProperties": false,
  "properties": {
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "url", "api_key"],
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1,
            "pattern": "^[a-z][a-z0-9_-]*$",
            "description": "Source name (lowercase alphanumeric with hyphens/underscores)"
          },
          "url": {
            "type": "string",
            "format": "uri",
            "description": "API base URL"
          },
          "api_key": {
            "type": "string",
            "minLength": 1,
            "description": "API key for authentication"
          }
        }
      }
    },
    "default_source": {
      "type": "string",
      "minLength": 1,
      "description": "Default source name (must exist in sources)"
    }
  }
}
```

- [ ] **Step 8.2: 提交**

```bash
git add plugins/market-radar/schemas/pulse-sources.schema.json
git commit -m "refactor(market-radar): update pulse-sources schema for api_key"
```

---

## Task 9: 更新命令文档 (intel-pull.md)

**Files:**
- Modify: `plugins/market-radar/commands/intel-pull.md`

**目标:** 更新命令文档以反映新的参数和行为。

### Step 9.1: 更新参数列表

移除 `--id` 参数，添加 `--init`、`--until`、`--preview` 参数。

### Step 9.2: 更新示例命令

更新示例以展示新的参数用法。

### Step 9.3: 更新 API 对应表

更新端点映射为新格式。

### Step 9.4: 更新配置文件示例

更新配置文件示例以使用 `api_key` 字段。

- [ ] **Step 9.5: 提交**

```bash
git add plugins/market-radar/commands/intel-pull.md
git commit -m "docs(market-radar): update intel-pull command documentation for API v1"
```

---

## Task 10: 更新帮助文档 (intel-pull-guide.md)

**Files:**
- Modify: `plugins/market-radar/commands/references/intel-pull-guide.md`

**目标:** 更新帮助文档以反映新的参数和行为。

- [ ] **Step 10.1: 提交**

```bash
git add plugins/market-radar/commands/references/intel-pull-guide.md
git commit -m "docs(market-radar): update intel-pull guide for API v1"
```

---

## Task 11: 集成测试

**目标:** 确保所有改动正常工作。

### Step 11.1: 运行完整类型检查

```bash
cd plugins/market-radar/scripts && pnpm exec tsc --noEmit
```

Expected: 通过，无错误

### Step 11.2: 测试 CLI 帮助信息

```bash
cd plugins/market-radar/scripts && pnpm exec tsx pulse/index.ts --help
```

Expected: 显示新的参数说明

### Step 11.3: 测试配置管理

```bash
cd plugins/market-radar/scripts && pnpm exec tsx pulse/index.ts --list-sources
```

Expected: 显示配置的源列表

### Step 11.4: 提交最终改动

```bash
git add -A
git commit -m "chore(market-radar): complete API v1 adaptation"
```

---

## 自检清单

- [ ] 所有类型定义已更新
- [ ] API 客户端端点已更新
- [ ] 配置文件 Schema 已更新
- [ ] 输出格式已更新
- [ ] CLI 参数已更新
- [ ] 预处理脚本已添加 cyber-pulse 分支
- [ ] 文档已更新
- [ ] 类型检查通过
- [ ] 无遗留 TODO 或占位符