#!/usr/bin/env node
/**
 * Pulse - Intel Pull Command Entry Point
 *
 * CLI tool for pulling intelligence content from cyber-pulse API
 *
 * Usage:
 *   pnpm exec tsx index.ts --source local
 *   pnpm exec tsx index.ts --all --output ./inbox
 *   pnpm exec tsx index.ts --init
 *   pnpm exec tsx index.ts --since 2026-03-01T00:00:00Z --until 2026-03-31T00:00:00Z
 *   pnpm exec tsx index.ts --preview
 *   pnpm exec tsx index.ts --list-sources
 */

import { Command } from 'commander';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

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

import {
  loadConfig,
  getSource,
  getApiKey,
  saveConfig,
  addSource,
  removeSource,
  setDefaultSource,
  formatSourcesList,
} from './config.js';

import {
  loadState,
  saveState,
  getCursor,
  setCursor,
  clearCursor,
  ensureStateDir,
} from './state.js';

import { PulseClient } from './api-client.js';

import { writeContentFiles } from './output.js';

// ==================== Constants ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '..');

/** Default output directory */
const DEFAULT_OUTPUT_DIR = './inbox';

// ==================== Dependency Check ====================

/**
 * Check if node_modules exists
 */
function checkDependencies(): void {
  const nodeModulesPath = path.resolve(SCRIPTS_DIR, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('错误: 依赖未安装');
    console.error('');
    console.error('请先安装依赖:');
    console.error('  cd plugins/market-radar/scripts && pnpm install');
    console.error('');
    process.exit(1);
  }
}

// ==================== Interactive Input ====================

/**
 * Create readline interface for interactive input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive source addition
 */
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

    const apiKey = await prompt(rl, 'API Key (直接输入密钥): ');
    if (!apiKey) {
      console.error('错误: API Key 不能为空');
      return;
    }

    // Load existing config or create new one
    let config: PulseSourcesConfig;
    try {
      config = loadConfig();
    } catch (error) {
      // Only create new config if file doesn't exist
      // Other errors (parse error, validation error) should be thrown
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

// ==================== Pull Operations ====================

/**
 * Determine pull mode based on CLI options
 *
 * @param options - Parsed CLI arguments
 * @returns The determined pull mode: 'incremental', 'init', 'since', 'preview', or 'all'
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

/**
 * Pull content from a single source
 *
 * Fetches content from the specified source using the appropriate mode.
 * Handles pagination automatically when has_more is true.
 *
 * @param source - The pulse source configuration
 * @param options - Parsed CLI arguments
 * @param state - Current state object for cursor tracking
 * @returns Result object with success status, count, and optional cursor/files
 */
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

    // Determine limit based on mode
    const limit = mode === 'preview' ? 50 : 100;

    // Handle different pull modes
    if (mode === 'preview') {
      // Preview mode: only pull one page, don't use cursor
      const response = await client.listContent(undefined, limit);
      validateListResponse(response);

      items = response.data;
      newCursor = response.next_cursor || undefined;
      // Don't update cursor for preview mode
    } else if (mode === 'init') {
      // Init mode: start from beginning, paginate through all
      let response = await client.listContentFromBeginning(limit);
      validateListResponse(response);

      items.push(...response.data);
      let cursor = response.next_cursor || undefined;
      let hasMore = response.has_more && cursor;

      while (hasMore) {
        response = await client.listContent(cursor, limit);
        validateListResponse(response);

        items.push(...response.data);
        cursor = response.next_cursor || undefined;
        hasMore = response.has_more && cursor;
      }

      newCursor = cursor;
    } else if (mode === 'since') {
      // Since mode: pull items within time range
      let response = await client.listContentRange(
        options.since!,
        options.until,
        undefined,
        limit
      );
      validateListResponse(response);

      items.push(...response.data);
      let cursor = response.next_cursor || undefined;
      let hasMore = response.has_more && cursor;

      while (hasMore) {
        response = await client.listContentRange(
          options.since!,
          options.until,
          cursor,
          limit
        );
        validateListResponse(response);

        items.push(...response.data);
        cursor = response.next_cursor || undefined;
        hasMore = response.has_more && cursor;
      }

      newCursor = cursor;
      // Don't update cursor for since mode
    } else {
      // Incremental or all mode: use saved cursor
      const cursorValue = getCursor(state, source.name).cursor;
      let cursor: string | undefined = cursorValue ?? undefined;
      let response = await client.listContent(cursor, limit);
      validateListResponse(response);

      items.push(...response.data);
      cursor = response.next_cursor || undefined;
      let hasMore = response.has_more && cursor;

      while (hasMore) {
        response = await client.listContent(cursor, limit);
        validateListResponse(response);

        items.push(...response.data);
        cursor = response.next_cursor || undefined;
        hasMore = response.has_more && cursor;
      }

      newCursor = cursor;
    }

    // Write files
    const files = await writeContentFiles(items, options.output, source.name);

    // Return success result
    const successResult: PullSourceResultSuccess = {
      source: source.name,
      success: true,
      count: items.length,
      files,
      new_cursor: newCursor,
    };
    return successResult;
  } catch (error) {
    // Build error message with context
    let errorMessage: string;
    if (error instanceof PulseError) {
      // Include error code for better debugging
      errorMessage = `${error.message} (code: ${error.code})`;
      // Log full details for debugging
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

/**
 * Execute pull operation
 *
 * Orchestrates the pull operation across one or more sources.
 * Manages state persistence and cursor updates.
 *
 * @param options - Parsed CLI arguments
 * @returns Overall pull result with per-source details
 */
async function executePull(options: PullOptions): Promise<PullResult> {
  const mode = determinePullMode(options);
  const result: PullResult = {
    mode,
    output_dir: path.resolve(options.output),
    sources: [],
    total_count: 0,
    pulled_at: new Date().toISOString(),
  };

  // Load config
  const config = loadConfig();

  // Determine sources to pull
  const sources: PulseSource[] = [];
  if (options.all) {
    sources.push(...config.sources);
  } else {
    sources.push(getSource(config, options.source));
  }

  // Ensure state directory exists
  ensureStateDir(options.output);

  // Load state
  let state = loadState(options.output);

  // Pull from each source
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

// ==================== Report Generation ====================

/**
 * Generate pull report
 *
 * Creates a formatted report string summarizing the pull operation.
 * Includes per-source statistics and any error messages.
 *
 * @param result - The pull result to format
 * @returns Formatted report string for console output
 */
function generateReport(result: PullResult): string {
  const lines: string[] = [
    '',
    '════════════════════════════════════════════════════════',
    '📡 情报拉取报告',
    '════════════════════════════════════════════════════════',
    '',
  ];

  // Mode description
  const modeDescriptions: Record<string, string> = {
    incremental: '增量拉取',
    init: '首次同步',
    since: '时间范围拉取',
    preview: '预览模式',
    all: '全量拉取',
  };

  // Report each source
  const config = loadConfig();  // Load config once outside the loop
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

      if (sourceResult.new_cursor) {
        lines.push('【状态更新】');
        lines.push(`• cursor: ${sourceResult.new_cursor}`);
        lines.push(`• 更新时间: ${result.pulled_at}`);
        lines.push('');
      }
    } else {
      lines.push('【拉取失败】');
      lines.push(`• 错误: ${sourceResult.error}`);
      lines.push('');
    }
  }

  // Hint
  if (result.total_count > 0) {
    lines.push('💡 提示: 使用 /intel-distill 处理情报');
  }

  lines.push('');
  lines.push('════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

// ==================== CLI Setup ====================

const program = new Command();

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
    // Check dependencies
    checkDependencies();

    try {
      // Source management modes
      if (options.listSources) {
        const config = loadConfig();
        console.log(formatSourcesList(config));
        return;
      }

      if (options.addSource) {
        await interactiveAddSource();
        return;
      }

      if (options.removeSource) {
        const config = loadConfig();
        removeSource(config, options.removeSource);
        saveConfig(config);
        console.log(`成功删除源: ${options.removeSource}`);
        return;
      }

      if (options.setDefault) {
        const config = loadConfig();
        setDefaultSource(config, options.setDefault);
        saveConfig(config);
        console.log(`已设置默认源: ${options.setDefault}`);
        return;
      }

      // Pull mode - no explicit source specified, will use default_source from config
      // options.source remains undefined, which triggers default behavior in getSource()

      // Validate conflicting options
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

      if (options.until && !options.since) {
        console.error('错误: --until 必须与 --since 配合使用');
        process.exit(1);
      }

      // Execute pull
      const result = await executePull(options);
      console.log(generateReport(result));

      // Exit with error code if any source failed
      const hasFailure = result.sources.some((s) => !s.success);
      if (hasFailure) {
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof PulseError) {
        console.error(`错误: ${error.message}`);
      } else {
        console.error('未知错误:', error);
      }
      process.exit(1);
    }
  });

// Parse arguments
program.parse();