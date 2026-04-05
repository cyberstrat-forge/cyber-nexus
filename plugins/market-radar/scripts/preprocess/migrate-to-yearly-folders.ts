#!/usr/bin/env node
/**
 * 历史情报卡片迁移脚本
 *
 * 将扁平结构的情报卡片迁移到年月子目录结构
 *
 * 用法：
 *   pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence
 *   pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  total: number;
  migrated: number;
  skippedAlreadyInSubfolder: number;
  skippedInvalidName: number;
  skippedError: number;
  details: MigrationDetail[];
}

interface MigrationDetail {
  source: string;
  target?: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
}

const DOMAINS = [
  'Threat-Landscape',
  'Industry-Analysis',
  'Vendor-Intelligence',
  'Emerging-Tech',
  'Customer-Market',
  'Policy-Regulation',
  'Capital-Investment',
];

function parseArgs(): { directory: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let directory = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--directory' && args[i + 1]) {
      directory = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!directory) {
    console.error('错误：必须指定 --directory 参数');
    console.error('用法：pnpm exec tsx migrate-to-yearly-folders.ts --directory ./intelligence [--dry-run]');
    process.exit(1);
  }

  return { directory, dryRun };
}

function extractDateFromFilename(filename: string): { year: string; month: string } | null {
  // 从文件名提取 YYYYMMDD（前 8 位）
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})-/);
  if (!match) {
    return null;
  }
  return {
    year: match[1],
    month: match[2],
  };
}

function migrateDirectory(
  domainDir: string,
  domain: string,
  dryRun: boolean
): MigrationResult {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skippedAlreadyInSubfolder: 0,
    skippedInvalidName: 0,
    skippedError: 0,
    details: [],
  };

  if (!fs.existsSync(domainDir)) {
    return result;
  }

  // 读取目录内容（包装错误处理）
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(domainDir, { withFileTypes: true });
  } catch (err) {
    result.skippedError++;
    result.details.push({
      source: domainDir,
      status: 'error',
      reason: `无法读取目录: ${err instanceof Error ? err.message : String(err)}`,
    });
    return result;
  }

  for (const entry of entries) {
    // 递归处理子目录中的文件
    if (entry.isDirectory()) {
      const subDir = path.join(domainDir, entry.name);
      const subResult = migrateDirectory(subDir, domain, dryRun);

      // 如果子目录中有文件被处理，说明已经在子目录中
      if (subResult.total > 0) {
        result.skippedAlreadyInSubfolder += subResult.total;
        for (const detail of subResult.details) {
          result.details.push({
            ...detail,
            reason: '已在子目录中',
          });
        }
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    // 跳过 _index.base 文件
    if (entry.name === '_index.base') {
      continue;
    }

    result.total++;

    const sourcePath = path.join(domainDir, entry.name);

    // 检查是否已在子目录中（通过检查路径是否包含年份目录）
    const relativePath = path.relative(domainDir, sourcePath);
    if (relativePath.includes(path.sep)) {
      result.skippedAlreadyInSubfolder++;
      result.details.push({
        source: sourcePath,
        status: 'skipped',
        reason: '已在子目录中',
      });
      continue;
    }

    // 从文件名提取日期
    const dateInfo = extractDateFromFilename(entry.name);
    if (!dateInfo) {
      result.skippedInvalidName++;
      result.details.push({
        source: sourcePath,
        status: 'skipped',
        reason: '文件名不以日期开头',
      });
      continue;
    }

    // 构建目标路径
    const targetDir = path.join(domainDir, dateInfo.year, dateInfo.month);
    let targetPath = path.join(targetDir, entry.name);
    let conflictReason: string | undefined;

    // 检查目标文件是否已存在（冲突处理）
    if (fs.existsSync(targetPath)) {
      const ext = path.extname(entry.name);
      const baseName = path.basename(entry.name, ext);
      let seq = 2;
      do {
        targetPath = path.join(targetDir, `${baseName}-${seq}${ext}`);
        seq++;
      } while (fs.existsSync(targetPath));
      conflictReason = '目标文件已存在，追加序号';
    }

    // 执行迁移
    if (!dryRun) {
      try {
        // 创建目标目录
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.renameSync(sourcePath, targetPath);
        result.migrated++;
        result.details.push({
          source: sourcePath,
          target: targetPath,
          status: 'migrated',
          reason: conflictReason,
        });
      } catch (err) {
        result.skippedError++;
        result.details.push({
          source: sourcePath,
          target: targetPath,
          status: 'error',
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      // 模拟运行，直接计数
      result.migrated++;
      result.details.push({
        source: sourcePath,
        target: targetPath,
        status: 'migrated',
        reason: conflictReason,
      });
    }
  }

  return result;
}

function printReport(results: Map<string, MigrationResult>, dryRun: boolean) {
  console.log('════════════════════════════════════════════════════════');
  console.log(`📊 迁移执行报告${dryRun ? '（模拟运行）' : ''}`);
  console.log('════════════════════════════════════════════════════════');
  console.log();

  // 汇总统计
  let totalFiles = 0;
  let totalMigrated = 0;
  let totalSkippedSubfolder = 0;
  let totalSkippedInvalid = 0;
  let totalErrors = 0;

  results.forEach((result) => {
    totalFiles += result.total;
    totalMigrated += result.migrated;
    totalSkippedSubfolder += result.skippedAlreadyInSubfolder;
    totalSkippedInvalid += result.skippedInvalidName;
    totalErrors += result.skippedError;
  });

  console.log('【迁移统计】');
  console.log(`• 扫描到文件: ${totalFiles} 个`);
  console.log(`• 成功迁移: ${totalMigrated} 个`);
  console.log(`• 跳过（已在子目录）: ${totalSkippedSubfolder} 个`);
  console.log(`• 跳过（日期格式错误）: ${totalSkippedInvalid} 个`);
  if (totalErrors > 0) {
    console.log(`• 错误: ${totalErrors} 个`);
  }
  console.log();

  // 迁移详情
  console.log('【迁移详情】');
  results.forEach((result, domain) => {
    if (result.migrated === 0 && result.total === 0) {
      return;
    }

    console.log();
    console.log(`### ${domain}`);

    for (const detail of result.details) {
      if (detail.status === 'migrated') {
        console.log(`✅ ${detail.source}`);
        console.log(`   → ${detail.target}`);
      } else if (detail.status === 'skipped') {
        console.log(`⚠️  跳过: ${detail.source}（${detail.reason}）`);
      } else if (detail.status === 'error') {
        console.log(`❌ 错误: ${detail.source}（${detail.reason}）`);
      }
    }
  });

  console.log();
  console.log('════════════════════════════════════════════════════════');
}

function main() {
  try {
    const { directory, dryRun } = parseArgs();

    console.log(`正在扫描目录: ${directory}`);
    if (dryRun) {
      console.log('（模拟运行，不实际移动文件）');
    }
    console.log();

    const results = new Map<string, MigrationResult>();

    for (const domain of DOMAINS) {
      const domainDir = path.join(directory, domain);
      const result = migrateDirectory(domainDir, domain, dryRun);
      results.set(domain, result);
    }

    printReport(results, dryRun);
  } catch (err) {
    console.error('迁移脚本执行失败:');
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();