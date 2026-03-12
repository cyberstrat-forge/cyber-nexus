/**
 * 情报卡片扫描脚本
 *
 * 功能：
 * 1. 扫描情报卡片目录
 * 2. 检测卡片内容变化（MD5 hash）
 * 3. 识别未聚类和需要更新的卡片
 * 4. 输出待处理卡片列表
 */

import { glob } from 'glob';
import { readFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, relative } from 'path';
import type { ThemeState, CardRecord, ScanResult } from './types';

const STATE_VERSION = '1.0';

/**
 * 计算文件内容 MD5 哈希
 */
function calculateHash(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  return createHash('md5').update(content).digest('hex');
}

/**
 * 获取文件修改时间
 */
function getMtime(filePath: string): string {
  const stats = statSync(filePath);
  return stats.mtime.toISOString();
}

/**
 * 加载或创建状态文件
 */
function loadOrCreateState(statePath: string): ThemeState {
  if (existsSync(statePath)) {
    try {
      const content = readFileSync(statePath, 'utf-8');
      return JSON.parse(content) as ThemeState;
    } catch (error) {
      console.error(`状态文件损坏，将重新创建: ${error}`);
    }
  }

  return {
    version: STATE_VERSION,
    last_updated: new Date().toISOString(),
    cards: {},
    themes: {},
    stats: {
      total_cards: 0,
      clustered_cards: 0,
      unclustered_cards: 0,
      total_themes: 0,
      analyzed_themes: 0
    }
  };
}

/**
 * 扫描情报卡片
 */
async function scanCards(sourceDir: string, statePath: string, incremental: boolean): Promise<ScanResult> {
  const absoluteSourceDir = resolve(sourceDir);
  const state = loadOrCreateState(statePath);

  // 定义情报领域目录
  const domains = [
    'Threat-Landscape',
    'Industry-Analysis',
    'Vendor-Intelligence',
    'Emerging-Tech',
    'Customer-Market',
    'Policy-Regulation',
    'Capital-Investment'
  ];

  // 扫描所有情报卡片
  const patterns = domains.map(d => `${absoluteSourceDir}/${d}/*.md`);
  const cardFiles: string[] = [];

  for (const pattern of patterns) {
    const files = await glob(pattern);
    cardFiles.push(...files);
  }

  const newCards: string[] = [];
  const updatedCards: string[] = [];
  const unclusteredCards: string[] = [];

  for (const cardFile of cardFiles) {
    const relativePath = relative(absoluteSourceDir, cardFile);
    const currentHash = calculateHash(cardFile);
    const currentMtime = getMtime(cardFile);

    const existingRecord = state.cards[relativePath];

    if (!existingRecord) {
      // 新卡片
      newCards.push(relativePath);
      unclusteredCards.push(relativePath);
    } else if (existingRecord.content_hash !== currentHash) {
      // 内容变化
      updatedCards.push(relativePath);
      unclusteredCards.push(relativePath);
    } else if (existingRecord.themes.length === 0) {
      // 已存在但未聚类
      unclusteredCards.push(relativePath);
    }
  }

  // 计算主题变化
  const themesChanges: Record<string, { added: number; removed: number }> = {};

  // 统计
  const result: ScanResult = {
    total_cards: cardFiles.length,
    new_cards: newCards,
    updated_cards: updatedCards,
    unclustered_cards: unclusteredCards,
    themes_changes: themesChanges,
    state
  };

  return result;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  let sourceDir = '.';
  let stateFile = '';
  let incremental = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourceDir = args[i + 1];
      i++;
    } else if (args[i] === '--state' && args[i + 1]) {
      stateFile = args[i + 1];
      i++;
    } else if (args[i] === '--incremental') {
      incremental = true;
    }
  }

  // 设置默认状态文件路径
  if (!stateFile) {
    stateFile = resolve(sourceDir, '.themes', 'state.json');
  }

  try {
    const result = await scanCards(sourceDir, stateFile, incremental);

    // 输出 JSON 结果
    console.log(JSON.stringify({
      total_cards: result.total_cards,
      new_cards: result.new_cards,
      updated_cards: result.updated_cards,
      unclustered_cards: result.unclustered_cards,
      themes_changes: result.themes_changes
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error(`扫描失败: ${error}`);
    process.exit(1);
  }
}

main();