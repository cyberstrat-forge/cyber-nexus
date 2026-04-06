#!/usr/bin/env node
/**
 * Migrate state.json to pending.json
 *
 * Extracts:
 * - review.pending -> pending.json review.items
 * - pulse.cursors -> pending.json pulse.cursors
 *
 * Usage:
 *   pnpm exec tsx migrate-state.ts --root <dir>
 */

import * as fs from 'fs';
import * as path from 'path';

interface OldPendingItem {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}

interface OldState {
  version: string;
  review?: {
    pending?: OldPendingItem[];
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
    items: OldPendingItem[];
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

function getStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'state.json');
}

function getPendingPath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'pending.json');
}

function migrateState(oldState: OldState): NewPending {
  // Extract review.pending
  const items = oldState.review?.pending || [];

  // Extract pulse.cursors
  const oldCursors = oldState.pulse?.cursors || {};
  const cursors: NewPending['pulse']['cursors'] = {};

  for (const [sourceName, cursor] of Object.entries(oldCursors)) {
    cursors[sourceName] = {
      last_fetched_at: cursor.last_fetched_at || null,
      last_item_id: cursor.last_item_id || null,
      last_pull: cursor.last_pull || null,
      total_synced: cursor.total_synced || 0,
    };
  }

  return {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    review: { items },
    pulse: { cursors },
  };
}

function main(): void {
  const args = process.argv.slice(2);
  let rootDir = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      rootDir = args[i + 1];
      i++;
    }
  }

  const statePath = getStatePath(rootDir);
  const pendingPath = getPendingPath(rootDir);

  // Check if state.json exists
  if (!fs.existsSync(statePath)) {
    console.log('No state.json found, nothing to migrate');
    process.exit(0);
  }

  // Check if pending.json already exists
  if (fs.existsSync(pendingPath)) {
    console.log('pending.json already exists, skipping migration');
    process.exit(0);
  }

  // Read old state
  let oldState: OldState;
  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    oldState = JSON.parse(content);
  } catch (error) {
    console.error('Error: Failed to parse state.json');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Migrate
  const newPending = migrateState(oldState);

  // Write pending.json
  const pendingDir = path.dirname(pendingPath);
  if (!fs.existsSync(pendingDir)) {
    fs.mkdirSync(pendingDir, { recursive: true });
  }

  fs.writeFileSync(pendingPath, JSON.stringify(newPending, null, 2) + '\n', 'utf-8');

  // Backup old state.json
  const backupPath = statePath + '.bak';
  fs.renameSync(statePath, backupPath);

  console.log('Migration complete');
  console.log(`   Created: ${pendingPath}`);
  console.log(`   Backup: ${backupPath}`);
  console.log(`   Review items: ${newPending.review.items.length}`);
  console.log(`   Sources: ${Object.keys(newPending.pulse.cursors).length}`);
}

main();