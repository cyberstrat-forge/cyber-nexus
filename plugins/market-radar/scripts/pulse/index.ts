#!/usr/bin/env node
/**
 * Pulse - Intel Pull Command Entry Point
 *
 * CLI tool for pulling intelligence content from cyber-pulse API
 *
 * Usage:
 *   npx tsx index.ts --source local
 *   npx tsx index.ts --all --output ./inbox
 *   npx tsx index.ts --since 2026-03-01T00:00:00Z
 *   npx tsx index.ts --id cnt_20260319143052_a1b2c3d4
 *   npx tsx index.ts --list-sources
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
  PulseSource,
  PulseSourcesConfig,
  PulseContent,
  PulseError,
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
  getDefaultConfigPath,
} from './config.js';

import {
  loadState,
  saveState,
  getCursor,
  setCursor,
  ensureStateDir,
} from './state.js';

import { PulseClient } from './api-client.js';

import { writeContentFiles } from './output.js';

// ==================== Constants ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

/** Default output directory */
const DEFAULT_OUTPUT_DIR = './inbox';

// ==================== Dependency Check ====================

/**
 * Check if node_modules exists
 */
function checkDependencies(): void {
  const nodeModulesPath = path.resolve(PLUGIN_ROOT, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('错误: 依赖未安装');
    console.error('');
    console.error('请先安装依赖:');
    console.error('  cd plugins/market-radar && npm install');
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

    const keyRef = await prompt(rl, 'API Key 环境变量名 (如: CYBER_PULSE_API_KEY): ');
    if (!keyRef) {
      console.error('错误: 环境变量名不能为空');
      return;
    }

    // Load existing config or create new one
    let config: PulseSourcesConfig;
    try {
      config = loadConfig();
    } catch {
      // Create new config if doesn't exist
      config = {
        sources: [],
        default_source: name,
      };
    }

    // Add new source
    const newSource: PulseSource = { name, url, key_ref: keyRef };
    try {
      addSource(config, newSource);

      // Set as default if it's the first source
      if (config.sources.length === 1) {
        config.default_source = name;
      }

      saveConfig(config);
      console.log('');
      console.log(`成功添加源: ${name}`);
      console.log('');
      console.log(`提示: 请设置环境变量 ${keyRef}`);
      console.log(`  export ${keyRef}="your-api-key"`);
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
 * Determine pull mode based on options
 */
function determinePullMode(options: PullOptions): 'incremental' | 'since' | 'single' | 'all' {
  if (options.id) {
    return 'single';
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
 */
async function pullFromSource(
  source: PulseSource,
  options: PullOptions,
  state: Record<string, unknown>
): Promise<PullSourceResult> {
  const result: PullSourceResult = {
    source: source.name,
    success: false,
    count: 0,
  };

  try {
    const apiKey = getApiKey(source);
    const client = new PulseClient(source.url, apiKey);

    let items: PulseContent[] = [];
    let newCursor: string | undefined;

    if (options.id) {
      // Single item mode
      const response = await client.getContent(options.id);
      items = [response.item];
      newCursor = undefined; // Don't update cursor for single item pull
    } else {
      // List mode (incremental, since, or all)
      const cursorValue = options.since ? undefined : getCursor(state, source.name).cursor;
      const cursor = cursorValue ?? undefined; // Convert null to undefined
      const limit = 100;

      let response;
      if (options.since) {
        response = await client.listContentSince(options.since, cursor, limit);
      } else {
        response = await client.listContent(cursor, limit);
      }

      items = response.items;
      newCursor = response.next_cursor || undefined;
    }

    // Write files
    const files = await writeContentFiles(items, options.output, source.name);

    result.success = true;
    result.count = items.length;
    result.files = files;
    result.new_cursor = newCursor;
  } catch (error) {
    if (error instanceof PulseError) {
      result.error = error.message;
    } else {
      result.error = error instanceof Error ? error.message : String(error);
    }
  }

  return result;
}

/**
 * Execute pull operation
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
    const sourceResult = await pullFromSource(source, options, state);
    result.sources.push(sourceResult);
    result.total_count += sourceResult.count;

    // Update cursor if pull was successful and not single item mode
    if (sourceResult.success && sourceResult.new_cursor && !options.id) {
      state = setCursor(state, source.name, sourceResult.new_cursor);
    }
  }

  // Save state
  saveState(state, options.output);

  return result;
}

// ==================== Report Generation ====================

/**
 * Generate pull report
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
    since: '指定时间拉取',
    single: '单条拉取',
    all: '全量拉取',
  };

  // Report each source
  for (const sourceResult of result.sources) {
    const config = loadConfig();
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
  .option('--since <datetime>', '拉取指定时间后的数据 (ISO 8601)')
  .option('--id <content_id>', '拉取单条指定情报')
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

      // Pull mode - ensure at least one source option or use default
      if (!options.source && !options.all && !options.id) {
        // Default to incremental pull from default source
        options.source = undefined;
      }

      // Validate conflicting options
      if (options.source && options.all) {
        console.error('错误: --source 和 --all 不能同时使用');
        process.exit(1);
      }

      if (options.id && (options.source || options.all || options.since)) {
        console.error('错误: --id 不能与其他拉取选项同时使用');
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