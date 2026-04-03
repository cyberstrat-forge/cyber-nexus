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
 *   pnpm exec tsx update-state.ts --state <state_path> --results <results_json>
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

function getStatePath(outputDir: string): string {
  return path.join(outputDir, '.intel', 'state.json');
}

function loadState(statePath: string): StateFile {
  if (!fs.existsSync(statePath)) {
    // Return default state
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

  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function saveState(statePath: string, state: StateFile): void {
  const stateDir = path.dirname(statePath);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  state.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
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
      const pendingId = `pending-${result.domain || 'unknown'}-${Date.now()}`;
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
let results: AgentResult[];
try {
  results = JSON.parse(resultsJson);
} catch (e) {
  console.error('Error: Invalid JSON in --results');
  process.exit(1);
}

if (!Array.isArray(results)) {
  console.error('Error: --results must be an array');
  process.exit(1);
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
console.log(`   Pending review: ${state.stats.intelligence.pending_review}`);