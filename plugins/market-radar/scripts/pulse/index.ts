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
  PullSourceResultSuccess,
  PullSourceResultFailure,
  PulseSource,
  PulseSourcesConfig,
  PulseContent,
  PulseError,
  validateListResponse,
  DEFAULT_LIMIT,
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
  getCursorState,
  setCursorState,
  clearCursorState,
  ensureStateDir,
} from './state.js';

import { PulseClient } from './api-client.js';

import { writeContentFiles } from './output.js';

// ==================== Constants ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = path.resolve(__dirname, '..');

/** Default output directory (relative to root) */
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
    rl.question(question, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive source addition
 *
 * @param rootDir - Project root directory for config file location
 */
async function interactiveAddSource(rootDir: string): Promise<void> {
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
      config = loadConfig(rootDir);
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

      saveConfig(config, rootDir);
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
 * @returns The determined pull mode: 'init', 'incremental', or 'all'
 */
function determinePullMode(options: { init: boolean; all: boolean }): 'init' | 'incremental' | 'all' {
  if (options.init) {
    return 'init';
  }
  if (options.all) {
    return 'all';
  }
  return 'incremental';
}

/**
 * Pull content from a single source
 *
 * Fetches content from the specified source using since+cursor pagination.
 * Handles pagination automatically when has_more is true.
 *
 * @param source - The pulse source configuration
 * @param options - Parsed CLI arguments
 * @param state - Current state object for cursor tracking
 * @returns Result object with success status, count, and state info
 */
async function pullFromSource(
  source: PulseSource,
  options: { init: boolean; output: string },
  state: Record<string, unknown>
): Promise<{
  success: boolean;
  count: number;
  lastFetchedAt: string | null;
  lastItemId: string | null;
  files?: string[];
  error?: string;
}> {
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
        error: `未找到同步状态，请先执行 --init`,
      };
    }

    // Determine since parameter (convert null to undefined)
    const since = mode === 'init' ? 'beginning' : (cursorState.last_fetched_at ?? undefined);
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await client.listContent(since, cursor, DEFAULT_LIMIT);
      validateListResponse(response);

      items.push(...response.data);
      lastItemId = response.last_item_id;
      lastFetchedAt = response.last_fetched_at;

      // Next page uses cursor
      cursor = response.has_more ? (response.last_item_id ?? undefined) : undefined;
      hasMore = response.has_more && cursor !== undefined;
    }

    // Write files
    const files = await writeContentFiles(items, options.output, source.name);

    return {
      success: true,
      count: files.length,  // Actual files written (excluding skipped)
      lastFetchedAt,
      lastItemId,
      files,
    };
  } catch (error) {
    // Programming errors should crash the process, not be swallowed
    if (error instanceof TypeError || error instanceof ReferenceError || error instanceof RangeError) {
      console.error(`[pulse] 编程错误 in pullFromSource for ${source.name}:`);
      throw error; // Propagate programming errors
    }

    // Build error message with context for operational errors
    let errorMessage: string;
    if (error instanceof PulseError) {
      // Include error code for better debugging
      errorMessage = `${error.message} (code: ${error.code})`;
      // Log full details for debugging
      if (error.details) {
        console.error(`[pulse] Error details for ${source.name}:`, error.details);
      }
    } else if (error instanceof Error) {
      // Log non-PulseError errors for debugging
      console.error(`[pulse] Unexpected error for ${source.name}:`, error.message);
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    return {
      success: false,
      count: 0,
      lastFetchedAt: null,
      lastItemId: null,
      error: errorMessage,
    };
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

  // Resolve paths
  const rootDir = options.root ? path.resolve(options.root) : process.cwd();
  const outputDir = path.resolve(rootDir, options.output);

  const result: PullResult = {
    mode: mode === 'all' ? 'incremental' : mode,
    root_dir: rootDir,
    output_dir: outputDir,
    sources: [],
    total_count: 0,
    pulled_at: new Date().toISOString(),
  };

  // Load config
  const config = loadConfig(rootDir);

  // Determine sources to pull
  const sources: PulseSource[] = options.all
    ? config.sources
    : [getSource(config, options.from)];

  // Ensure state directory exists (in root)
  ensureStateDir(rootDir);

  // Load state (from root)
  let state = loadState(rootDir);

  // Pull from each source
  for (const source of sources) {
    // Clear cursor state for init mode
    if (options.init) {
      state = clearCursorState(state, source.name);
    }

    const sourceResult = await pullFromSource(source, { ...options, output: outputDir }, state);

    if (sourceResult.success) {
      const successResult: PullSourceResultSuccess = {
        source: source.name,
        success: true,
        count: sourceResult.count,
        files: sourceResult.files,
      };
      result.sources.push(successResult);
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
      const failureResult: PullSourceResultFailure = {
        source: source.name,
        success: false,
        count: 0,
        error: sourceResult.error!,
      };
      result.sources.push(failureResult);
    }
  }

  // Save state (to root)
  saveState(state, rootDir);

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
    incremental: '增量同步',
    init: '全量同步',
    all: '多源同步',
  };

  // Report each source
  const config = loadConfig(result.root_dir); // Load config once outside the loop
  for (const sourceResult of result.sources) {
    try {
      const source = getSource(config, sourceResult.source);

      lines.push(`源: ${source.name} (${source.url})`);
      lines.push(`模式: ${modeDescriptions[result.mode]}`);
      lines.push('');

      if (sourceResult.success) {
        lines.push('【拉取统计】');
        lines.push(`• 新增情报: ${sourceResult.count} 条`);
        lines.push(`• 写入位置: ${result.output_dir}`);
        lines.push('');

        // Read state to show cursor info (use root_dir)
        const state = loadState(result.root_dir);
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
    } catch (error) {
      // Only handle SOURCE_NOT_FOUND as "deleted", log unexpected errors
      if (error instanceof PulseError && error.code === 'SOURCE_NOT_FOUND') {
        lines.push(`源: ${sourceResult.source} (配置已删除)`);
        lines.push('');
        if (sourceResult.success) {
          lines.push('【拉取统计】');
          lines.push(`• 新增情报: ${sourceResult.count} 条`);
          lines.push('');
        } else {
          lines.push('【拉取失败】');
          lines.push(`• 错误: ${sourceResult.error}`);
          lines.push('');
        }
      } else {
        // Unexpected error - log and show basic info
        console.error(`[pulse] 生成报告时意外错误 for ${sourceResult.source}:`, error);
        lines.push(`源: ${sourceResult.source} (报告生成错误)`);
        lines.push('');
        if (sourceResult.success) {
          lines.push('【拉取统计】');
          lines.push(`• 新增情报: ${sourceResult.count} 条`);
          lines.push('');
        } else {
          lines.push('【拉取失败】');
          lines.push(`• 错误: ${sourceResult.error}`);
          lines.push('');
        }
      }
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
  .version('2.1.0')
  .option('-r, --root <dir>', '项目根目录（状态文件位置）')
  .option('-f, --from <name>', '指定情报源名称')
  .option('-a, --all', '拉取所有配置的情报源')
  .option('-o, --output <dir>', '输出目录（相对于根目录）', DEFAULT_OUTPUT_DIR)
  .option('--init', '全量同步（从头开始）')
  .option('--list-sources', '列出所有已配置的情报源')
  .option('--add-source', '交互式添加情报源')
  .option('--remove-source <name>', '删除指定情报源')
  .option('--set-default <name>', '设置默认情报源')
  .action(async (options: PullOptions) => {
    // Check dependencies
    checkDependencies();

    // Resolve root directory
    const rootDir = options.root ? path.resolve(options.root) : process.cwd();

    // Validate root directory
    if (!fs.existsSync(rootDir)) {
      console.error(`错误: 项目根目录不存在: ${rootDir}`);
      process.exit(1);
    }
    if (!fs.statSync(rootDir).isDirectory()) {
      console.error(`错误: 指定路径不是目录: ${rootDir}`);
      process.exit(1);
    }

    try {
      // Source management modes
      if (options.listSources) {
        const config = loadConfig(rootDir);
        console.log(formatSourcesList(config));
        return;
      }

      if (options.addSource) {
        await interactiveAddSource(rootDir);
        return;
      }

      if (options.removeSource) {
        const config = loadConfig(rootDir);
        removeSource(config, options.removeSource);
        saveConfig(config, rootDir);
        console.log(`成功删除源: ${options.removeSource}`);
        return;
      }

      if (options.setDefault) {
        const config = loadConfig(rootDir);
        setDefaultSource(config, options.setDefault);
        saveConfig(config, rootDir);
        console.log(`已设置默认源: ${options.setDefault}`);
        return;
      }

      // Pull mode - no explicit source specified, will use default_source from config
      // options.from remains undefined, which triggers default behavior in getSource()

      // Validate conflicting options
      if (options.from && options.all) {
        console.error('错误: --from 和 --all 不能同时使用');
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