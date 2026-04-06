#!/usr/bin/env node
/**
 * One-time migration script for state optimization
 *
 * Migrates from old state.json-based state management to file-system-based:
 * 1. state.json → pending.json (review.items + pulse.cursors)
 * 2. Add processed_status: 'passed' to all converted files
 * 3. Add converted_content_hash to all intelligence cards
 *
 * Usage:
 *   pnpm exec tsx migrate-v1-to-v2.ts --root <dir> [--dry-run]
 *
 * Options:
 *   --root <dir>   Root directory containing .intel/, converted/, intelligence/
 *   --dry-run      Show what would be done without making changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ==================== Type Definitions ====================

interface MigrationResult {
  stateMigrated: boolean;
  pendingCreated: boolean;
  convertedFilesUpdated: number;
  convertedFilesSkipped: number;
  intelligenceCardsUpdated: number;
  intelligenceCardsSkipped: number;
  errors: string[];
}

interface OldState {
  version: string;
  review?: {
    pending?: Array<{
      pending_id: string;
      converted_file: string;
      archived_source: string;
      added_at: string;
      reason: string;
    }>;
  };
  pulse?: {
    cursors?: Record<string, {
      last_fetched_at?: string | null;
      last_item_id?: string | null;
      last_pull?: string | null;
      total_synced?: number;
    }>;
  };
}

interface NewPending {
  version: string;
  updated_at: string;
  review: {
    items: Array<{
      pending_id: string;
      converted_file: string;
      archived_source: string;
      added_at: string;
      reason: string;
    }>;
  };
  pulse: {
    cursors: Record<string, {
      last_fetched_at: string | null;
      last_item_id: string | null;
      last_pull: string | null;
      total_synced: number;
    }>;
  };
}

// ==================== Utility Functions ====================

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    // Match both quoted and unquoted values
    const quotedMatch = line.match(/^(\w+):\s*"(.*)"$/);
    const unquotedMatch = line.match(/^(\w+):\s*(.+)$/);

    if (quotedMatch) {
      frontmatter[quotedMatch[1]] = quotedMatch[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (unquotedMatch && !unquotedMatch[2].startsWith('[')) {
      // Skip array values like tags: [...]
      frontmatter[unquotedMatch[1]] = unquotedMatch[2].trim();
    }
  }

  return frontmatter;
}

/**
 * Generate escaped YAML string value
 */
function escapeYamlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Update frontmatter field in markdown content
 */
function updateFrontmatterField(
  content: string,
  field: string,
  value: string
): string {
  const frontmatterMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);

  if (!frontmatterMatch) {
    // No frontmatter - shouldn't happen for our files
    return content;
  }

  const [, start, frontmatterContent, end] = frontmatterMatch;
  const body = content.slice(frontmatterMatch[0].length);

  // Check if field already exists
  const fieldPattern = new RegExp(`^(?:${field}:\\s*).*$`, 'm');

  let newFrontmatter: string;
  if (fieldPattern.test(frontmatterContent)) {
    // Update existing field
    newFrontmatter = frontmatterContent.replace(
      fieldPattern,
      `${field}: "${escapeYamlString(value)}"`
    );
  } else {
    // Add new field at the end
    newFrontmatter = frontmatterContent + `\n${field}: "${escapeYamlString(value)}"`;
  }

  return `${start}${newFrontmatter}${end}${body}`;
}

/**
 * Calculate MD5 hash of file content
 */
function calculateContentHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

// ==================== Migration Functions ====================

/**
 * Migrate state.json to pending.json
 */
function migrateStateFile(
  rootDir: string,
  dryRun: boolean,
  result: MigrationResult
): void {
  const statePath = path.join(rootDir, '.intel', 'state.json');
  const pendingPath = path.join(rootDir, '.intel', 'pending.json');

  // Check if state.json exists
  if (!fs.existsSync(statePath)) {
    console.log('[state.json] No state.json found, skipping migration');
    return;
  }

  // Check if pending.json already exists
  if (fs.existsSync(pendingPath)) {
    console.log('[state.json] pending.json already exists, skipping');
    return;
  }

  // Read and parse state.json
  let oldState: OldState;
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    oldState = JSON.parse(content);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to parse state.json: ${errMsg}`);
    return;
  }

  // Build new pending.json
  const items = oldState.review?.pending || [];
  const cursors = oldState.pulse?.cursors || {};

  const newPending: NewPending = {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    review: { items },
    pulse: {
      cursors: Object.fromEntries(
        Object.entries(cursors).map(([name, cursor]) => [
          name,
          {
            last_fetched_at: cursor.last_fetched_at || null,
            last_item_id: cursor.last_item_id || null,
            last_pull: cursor.last_pull || null,
            total_synced: cursor.total_synced || 0,
          },
        ])
      ),
    },
  };

  if (dryRun) {
    console.log('[state.json] Would create pending.json with:');
    console.log(`  - Review items: ${items.length}`);
    console.log(`  - Pulse sources: ${Object.keys(cursors).length}`);
    return;
  }

  // Write pending.json
  const pendingDir = path.dirname(pendingPath);
  if (!fs.existsSync(pendingDir)) {
    fs.mkdirSync(pendingDir, { recursive: true });
  }

  fs.writeFileSync(pendingPath, JSON.stringify(newPending, null, 2) + '\n', 'utf-8');
  result.pendingCreated = true;

  // Backup state.json
  const backupPath = statePath + '.bak';
  fs.renameSync(statePath, backupPath);
  result.stateMigrated = true;

  console.log(`[state.json] Migrated to pending.json`);
  console.log(`  - Backup: ${backupPath}`);
  console.log(`  - Review items: ${items.length}`);
  console.log(`  - Pulse sources: ${Object.keys(cursors).length}`);
}

/**
 * Build converted_file → content_hash lookup from intelligence cards
 */
function buildConvertedFileHashLookup(
  rootDir: string
): Map<string, string> {
  const lookup = new Map<string, string>();
  const intelligenceDir = path.join(rootDir, 'intelligence');

  if (!fs.existsSync(intelligenceDir)) {
    return lookup;
  }

  const scanDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);

          if (frontmatter?.converted_file) {
            // Extract from WikiLink format: [[path]]
            let convertedFile = frontmatter.converted_file
              .replace(/^\[\[/, '')
              .replace(/\]\]$/, '');

            // Calculate content hash from body
            const bodyMatch = content.match(/---[\s\S]*?---\r?\n?([\s\S]*)/);
            const body = bodyMatch ? bodyMatch[1] : content;
            const hash = calculateContentHash(body);

            lookup.set(convertedFile, hash);
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  };

  scanDir(intelligenceDir);
  return lookup;
}

/**
 * Add processed_status to converted files
 */
function migrateConvertedFiles(
  rootDir: string,
  dryRun: boolean,
  result: MigrationResult
): void {
  const convertedDir = path.join(rootDir, 'converted');

  if (!fs.existsSync(convertedDir)) {
    console.log('[converted] No converted directory found');
    return;
  }

  const timestamp = new Date().toISOString();
  const scanDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(rootDir, fullPath);

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);

          // Check if processed_status already exists
          if (frontmatter?.processed_status) {
            result.convertedFilesSkipped++;
            continue;
          }

          if (dryRun) {
            console.log(`[converted] Would update: ${relativePath}`);
            continue;
          }

          // Add processed_status and processed_at
          let newContent = updateFrontmatterField(content, 'processed_status', 'passed');
          newContent = updateFrontmatterField(newContent, 'processed_at', timestamp);

          fs.writeFileSync(fullPath, newContent, 'utf-8');
          result.convertedFilesUpdated++;

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to update ${relativePath}: ${errMsg}`);
        }
      }
    }
  };

  scanDir(convertedDir);

  console.log(`[converted] Updated ${result.convertedFilesUpdated} files`);
  if (result.convertedFilesSkipped > 0) {
    console.log(`[converted] Skipped ${result.convertedFilesSkipped} files (already have processed_status)`);
  }
}

/**
 * Add converted_content_hash to intelligence cards
 */
function migrateIntelligenceCards(
  rootDir: string,
  dryRun: boolean,
  convertedToHash: Map<string, string>,
  result: MigrationResult
): void {
  const intelligenceDir = path.join(rootDir, 'intelligence');

  if (!fs.existsSync(intelligenceDir)) {
    console.log('[intelligence] No intelligence directory found');
    return;
  }

  const scanDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(rootDir, fullPath);

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const frontmatter = parseFrontmatter(content);

          // Check if converted_content_hash already exists
          if (frontmatter?.converted_content_hash) {
            result.intelligenceCardsSkipped++;
            continue;
          }

          // Get converted_file from frontmatter
          if (!frontmatter?.converted_file) {
            result.intelligenceCardsSkipped++;
            continue;
          }

          // Extract from WikiLink format
          let convertedFile = frontmatter.converted_file
            .replace(/^\[\[/, '')
            .replace(/\]\]$/, '');

          // Get hash from lookup
          const hash = convertedToHash.get(convertedFile);
          if (!hash) {
            result.errors.push(`No hash found for ${convertedFile} in ${relativePath}`);
            result.intelligenceCardsSkipped++;
            continue;
          }

          if (dryRun) {
            console.log(`[intelligence] Would update: ${relativePath}`);
            continue;
          }

          // Add converted_content_hash
          const newContent = updateFrontmatterField(content, 'converted_content_hash', hash);
          fs.writeFileSync(fullPath, newContent, 'utf-8');
          result.intelligenceCardsUpdated++;

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to update ${relativePath}: ${errMsg}`);
        }
      }
    }
  };

  scanDir(intelligenceDir);

  console.log(`[intelligence] Updated ${result.intelligenceCardsUpdated} cards`);
  if (result.intelligenceCardsSkipped > 0) {
    console.log(`[intelligence] Skipped ${result.intelligenceCardsSkipped} cards`);
  }
}

// ==================== Main ====================

function main(): void {
  const args = process.argv.slice(2);
  let rootDir = '.';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: pnpm exec tsx migrate-v1-to-v2.ts --root <dir> [--dry-run]

Migrates from old state.json-based state management to file-system-based.

Options:
  --root <dir>   Root directory (default: current directory)
  --dry-run      Show what would be done without making changes
  --help         Show this help

Migration steps:
  1. state.json → pending.json (review.items + pulse.cursors)
  2. Add processed_status: 'passed' to all converted files
  3. Add converted_content_hash to all intelligence cards

This script is idempotent - safe to run multiple times.
      `);
      process.exit(0);
    }
  }

  rootDir = path.resolve(rootDir);

  console.log('=== State Optimization Migration ===');
  console.log(`Root directory: ${rootDir}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  const result: MigrationResult = {
    stateMigrated: false,
    pendingCreated: false,
    convertedFilesUpdated: 0,
    convertedFilesSkipped: 0,
    intelligenceCardsUpdated: 0,
    intelligenceCardsSkipped: 0,
    errors: [],
  };

  // Step 1: Build converted_file → hash lookup from intelligence cards
  console.log('[lookup] Building converted_file → content_hash lookup...');
  const convertedToHash = buildConvertedFileHashLookup(rootDir);
  console.log(`[lookup] Found ${convertedToHash.size} intelligence cards with converted_file`);
  console.log('');

  // Step 2: Migrate state.json to pending.json
  console.log('[1/3] Migrating state.json to pending.json...');
  migrateStateFile(rootDir, dryRun, result);
  console.log('');

  // Step 3: Add processed_status to converted files
  console.log('[2/3] Adding processed_status to converted files...');
  migrateConvertedFiles(rootDir, dryRun, result);
  console.log('');

  // Step 4: Add converted_content_hash to intelligence cards
  console.log('[3/3] Adding converted_content_hash to intelligence cards...');
  migrateIntelligenceCards(rootDir, dryRun, convertedToHash, result);
  console.log('');

  // Summary
  console.log('=== Migration Summary ===');
  console.log(`State file migrated: ${result.stateMigrated}`);
  console.log(`pending.json created: ${result.pendingCreated}`);
  console.log(`Converted files updated: ${result.convertedFilesUpdated}`);
  console.log(`Converted files skipped: ${result.convertedFilesSkipped}`);
  console.log(`Intelligence cards updated: ${result.intelligenceCardsUpdated}`);
  console.log(`Intelligence cards skipped: ${result.intelligenceCardsSkipped}`);

  if (result.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log('');
  if (dryRun) {
    console.log('✓ Dry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('✓ Migration complete.');
  }
}

main();