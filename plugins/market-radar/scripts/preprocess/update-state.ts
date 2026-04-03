#!/usr/bin/env node
/**
 * Update state.json after Agent completes processing
 *
 * This script implements Step 8.4 of intel-distill workflow:
 * - Update processed records
 * - Update review.pending queue
 * - Update stats
 *
 * Usage:
 *   pnpm exec tsx update-state.ts --output <output_dir> --results <results_json>
 *
 * Input JSON format (agent results array):
 * [
 *   {
 *     "source_file": "converted/2026/04/xxx.md",
 *     "content_hash": "abc123...",
 *     "source_hash": "def456...",
 *     "archived_source": "archive/2026/04/xxx.pdf",
 *     "has_strategic_value": true,
 *     "intelligence_count": 2,
 *     "intelligence_ids": ["industry-001", "emerging-001"],
 *     "output_files": ["intelligence/Industry-Analysis/xxx.md"],
 *     "review_reason": null
 *   }
 * ]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface AgentResult {
  source_file: string;
  content_hash: string;
  source_hash: string;
  archived_source: string;
  has_strategic_value: boolean | null;
  intelligence_count: number;
  intelligence_ids: string[];
  output_files: string[];
  review_reason?: string | null;
  domain?: string;
}

interface ProcessedRecord {
  content_hash: string;
  source_hash: string;
  processed_at: string;
  intelligence_count: number;
  intelligence_ids: string[];
  output_files: string[];
  session: string;
  archived_source: string;
  archived_exists: boolean;
  converted_exists: boolean;
  review_status: string | null;
  reviewed_at?: string;
  approved_reason?: string;
  rejected_reason?: string;
  reviewed_by?: string;
}

interface PendingReview {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}

interface StateFile {
  version: string;
  updated_at: string;
  queue: { processing: Record<string, unknown> };
  review: { pending: PendingReview[] };
  processed: Record<string, ProcessedRecord>;
  stats: {
    preprocess: { scanned: number; converted: number; failed: number; duplicates: number };
    intelligence: { processed: number; cards_generated: number; pending_review: number; no_value: number; failed: number };
    review: { pending: number; approved: number; rejected: number };
    last_run: string;
  };
  pulse?: Record<string, unknown>;
}

// ==================== Validation Functions ====================

/**
 * Validate AgentResult object
 */
function validateAgentResult(result: unknown, index: number): { valid: true; data: AgentResult } | { valid: false; error: string } {
  if (typeof result !== 'object' || result === null) {
    return { valid: false, error: `Result[${index}] must be an object` };
  }

  const r = result as Record<string, unknown>;

  // Required string fields
  if (typeof r.source_file !== 'string' || r.source_file.length === 0) {
    return { valid: false, error: `Result[${index}].source_file must be a non-empty string` };
  }
  if (typeof r.content_hash !== 'string' || r.content_hash.length === 0) {
    return { valid: false, error: `Result[${index}].content_hash must be a non-empty string` };
  }
  if (typeof r.source_hash !== 'string' || r.source_hash.length === 0) {
    return { valid: false, error: `Result[${index}].source_hash must be a non-empty string` };
  }

  // has_strategic_value: must be boolean or null
  if (r.has_strategic_value !== null && typeof r.has_strategic_value !== 'boolean') {
    return { valid: false, error: `Result[${index}].has_strategic_value must be boolean or null, got ${typeof r.has_strategic_value}` };
  }

  // Numeric fields
  if (typeof r.intelligence_count !== 'number' || r.intelligence_count < 0 || !Number.isInteger(r.intelligence_count)) {
    return { valid: false, error: `Result[${index}].intelligence_count must be a non-negative integer` };
  }

  // Array fields
  if (!Array.isArray(r.intelligence_ids)) {
    return { valid: false, error: `Result[${index}].intelligence_ids must be an array` };
  }
  if (!Array.isArray(r.output_files)) {
    return { valid: false, error: `Result[${index}].output_files must be an array` };
  }

  return {
    valid: true,
    data: {
      source_file: r.source_file,
      content_hash: r.content_hash,
      source_hash: r.source_hash,
      archived_source: typeof r.archived_source === 'string' ? r.archived_source : '',
      has_strategic_value: r.has_strategic_value as boolean | null,
      intelligence_count: r.intelligence_count,
      intelligence_ids: r.intelligence_ids as string[],
      output_files: r.output_files as string[],
      review_reason: r.review_reason as string | null | undefined,
      domain: typeof r.domain === 'string' ? r.domain : undefined,
    },
  };
}

/**
 * Create default state structure
 */
function createDefaultState(): StateFile {
  return {
    version: '3.0.0',
    updated_at: new Date().toISOString(),
    queue: { processing: {} },
    review: { pending: [] },
    processed: {},
    stats: {
      preprocess: { scanned: 0, converted: 0, failed: 0, duplicates: 0 },
      intelligence: { processed: 0, cards_generated: 0, pending_review: 0, no_value: 0, failed: 0 },
      review: { pending: 0, approved: 0, rejected: 0 },
      last_run: new Date().toISOString(),
    },
  };
}

/**
 * Validate state structure has required fields
 */
function validateStateStructure(state: unknown): state is StateFile {
  if (typeof state !== 'object' || state === null) return false;
  const s = state as Record<string, unknown>;

  // Check required top-level fields
  if (typeof s.version !== 'string') return false;
  if (typeof s.updated_at !== 'string') return false;
  if (typeof s.queue !== 'object' || s.queue === null) return false;
  if (typeof s.review !== 'object' || s.review === null) return false;
  if (typeof s.processed !== 'object' || s.processed === null) return false;
  if (typeof s.stats !== 'object' || s.stats === null) return false;

  // Check nested structures
  const review = s.review as Record<string, unknown>;
  if (!Array.isArray(review.pending)) return false;

  const stats = s.stats as Record<string, unknown>;
  if (typeof stats.intelligence !== 'object' || stats.intelligence === null) return false;

  return true;
}

/**
 * Generate unique pending ID using timestamp + random suffix
 */
function generatePendingId(domain: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `pending-${domain || 'unknown'}-${timestamp}-${random}`;
}

// ==================== State Operations ====================

function getStatePath(outputDir: string): string {
  return path.join(outputDir, '.intel', 'state.json');
}

function loadState(statePath: string): StateFile {
  if (!fs.existsSync(statePath)) {
    return createDefaultState();
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate structure
    if (!validateStateStructure(parsed)) {
      console.error(`Warning: State file ${statePath} has invalid structure. Creating backup and starting fresh.`);
      backupCorruptedState(statePath);
      return createDefaultState();
    }

    return parsed;
  } catch (error) {
    const err = error as Error;
    console.error(`Error loading state from ${statePath}: ${err.message}`);
    console.error('Creating backup of corrupted file and starting with fresh state.');
    backupCorruptedState(statePath);
    return createDefaultState();
  }
}

/**
 * Backup corrupted state file before overwriting
 */
function backupCorruptedState(statePath: string): void {
  if (!fs.existsSync(statePath)) return;

  const backupPath = `${statePath}.corrupted.${Date.now()}`;
  try {
    fs.copyFileSync(statePath, backupPath);
    console.error(`Corrupted state backed up to: ${backupPath}`);
  } catch (copyError) {
    console.error(`Failed to backup corrupted state: ${(copyError as Error).message}`);
  }
}

function saveState(statePath: string, state: StateFile): void {
  const stateDir = path.dirname(statePath);

  try {
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Atomic write: write to temp file first, then rename
    const tempPath = `${statePath}.tmp.${process.pid}`;
    state.updated_at = new Date().toISOString();

    try {
      fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
      fs.renameSync(tempPath, statePath);
    } catch (writeError) {
      // Clean up temp file if write failed
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw writeError;
    }
  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to save state to ${statePath}: ${err.message}`);
  }
}

function generateSessionId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm2 = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mm2}${ss}`;
}

function updateState(state: StateFile, results: AgentResult[], sessionId: string): void {
  let newCardsGenerated = 0;
  let newPendingReview = 0;
  let newNoValue = 0;

  for (const result of results) {
    const relativePath = result.source_file;
    const now = new Date().toISOString();

    // Determine review status
    let reviewStatus: string | null = null;
    if (result.has_strategic_value === true) {
      reviewStatus = 'passed';
      newCardsGenerated += result.intelligence_count;
    } else if (result.has_strategic_value === false) {
      reviewStatus = 'rejected';
      newNoValue++;
    } else {
      // null means needs review
      reviewStatus = 'pending';
      newPendingReview++;
    }

    // Update processed record
    state.processed[relativePath] = {
      content_hash: result.content_hash,
      source_hash: result.source_hash,
      processed_at: now,
      intelligence_count: result.intelligence_count,
      intelligence_ids: result.intelligence_ids,
      output_files: result.output_files,
      session: sessionId,
      archived_source: result.archived_source,
      archived_exists: result.archived_source ? true : false,
      converted_exists: true,
      review_status: reviewStatus,
    };

    // Add to review.pending if needs review
    if (result.has_strategic_value === null) {
      const pendingId = generatePendingId(result.domain || 'unknown');
      state.review.pending.push({
        pending_id: pendingId,
        converted_file: relativePath,
        archived_source: result.archived_source,
        added_at: now,
        reason: result.review_reason || '需要人工复核',
      });
    }
  }

  // Update stats
  state.stats.intelligence.processed += results.length;
  state.stats.intelligence.cards_generated += newCardsGenerated;
  state.stats.intelligence.pending_review += newPendingReview;
  state.stats.intelligence.no_value += newNoValue;
  state.stats.review.pending = state.review.pending.length;
  state.stats.last_run = new Date().toISOString();
}

// CLI
const args = process.argv.slice(2);
let statePath = '';
let resultsJson = '';
let outputDir = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--state' && args[i + 1]) {
    statePath = args[i + 1];
    i++;
  } else if (args[i] === '--results' && args[i + 1]) {
    resultsJson = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputDir = args[i + 1];
    i++;
  }
}

// Derive state path from output dir if not provided
if (!statePath && outputDir) {
  statePath = getStatePath(outputDir);
}

if (!statePath) {
  console.error('Error: --state or --output must be provided');
  process.exit(1);
}

if (!resultsJson) {
  console.error('Error: --results must be provided');
  process.exit(1);
}

// Parse results
let rawResults: unknown[];
try {
  rawResults = JSON.parse(resultsJson);
} catch (e) {
  const err = e as SyntaxError;
  console.error('Error: Invalid JSON in --results');
  console.error(`Parse error: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(rawResults)) {
  console.error('Error: --results must be an array');
  process.exit(1);
}

// Validate all results
const results: AgentResult[] = [];
for (let i = 0; i < rawResults.length; i++) {
  const validation = validateAgentResult(rawResults[i], i);
  if (!validation.valid) {
    console.error(`Error: ${validation.error}`);
    process.exit(1);
  }
  results.push(validation.data);
}

// Load, update, save
const state = loadState(statePath);
const sessionId = generateSessionId();

console.log(`📝 Updating state.json with ${results.length} results...`);

updateState(state, results, sessionId);
saveState(statePath, state);

console.log(`✅ State updated successfully`);
console.log(`   Session: ${sessionId}`);
console.log(`   Processed: ${results.length} files`);
console.log(`   Cards generated: ${state.stats.intelligence.cards_generated}`);
console.log(`   Pending review: ${state.stats.intelligence.pending_review}`);;