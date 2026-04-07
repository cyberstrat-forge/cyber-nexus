#!/usr/bin/env node
/**
 * Update pending.json after Agent completes processing
 *
 * This script implements Step 8.4 of intel-distill workflow:
 * - Update pending.json with items needing review
 * - Write processed_status to converted file frontmatter
 * - Handle review mode (approve/reject/list)
 *
 * Usage:
 *   Normal mode:
 *     pnpm exec tsx update-state.ts --output <output_dir> --results <results_json>
 *
 *   Review mode:
 *     pnpm exec tsx update-state.ts --output <output_dir> --review list
 *     pnpm exec tsx update-state.ts --output <output_dir> --review approve --pending-id <id> --reason <reason>
 *     pnpm exec tsx update-state.ts --output <output_dir> --review reject --pending-id <id> --reason <reason>
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
import { PendingFile, createDefaultPending } from './types/pending';

// ==================== Type Definitions ====================

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
  // MD5 hash format validation (32 hex chars)
  const MD5_PATTERN = /^[a-f0-9]{32}$/;
  if (typeof r.content_hash !== 'string' || !MD5_PATTERN.test(r.content_hash)) {
    return { valid: false, error: `Result[${index}].content_hash must be a 32-char hex MD5 hash` };
  }
  if (typeof r.source_hash !== 'string' || !MD5_PATTERN.test(r.source_hash)) {
    return { valid: false, error: `Result[${index}].source_hash must be a 32-char hex MD5 hash` };
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

// ==================== Pending.json Operations ====================

/**
 * Get pending.json path
 */
function getPendingPath(outputDir: string): string {
  return path.join(outputDir, '.intel', 'pending.json');
}

/**
 * Load or create pending.json
 *
 * Error handling strategy:
 * - File not exists: create new structure
 * - JSON parse error: backup corrupted file, then create new structure
 * - This prevents silent data loss while allowing workflow to continue
 */
function loadOrCreatePending(pendingPath: string): PendingFile {
  if (fs.existsSync(pendingPath)) {
    const content = fs.readFileSync(pendingPath, 'utf-8');
    try {
      const parsed = JSON.parse(content);
      // Ensure required fields exist
      if (!parsed.review || !parsed.review.items) {
        parsed.review = { items: [] };
      }
      if (!parsed.pulse || !parsed.pulse.cursors) {
        parsed.pulse = { cursors: {} };
      }
      return parsed;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      // Backup corrupted file to prevent silent data loss
      const backupPath = pendingPath + '.corrupted';
      fs.writeFileSync(backupPath, content, 'utf-8');
      console.warn(`Warning: Invalid JSON in ${pendingPath}.`);
      console.warn(`  Error: ${errMsg}`);
      console.warn(`  Backup saved to: ${backupPath}`);
      console.warn(`  Creating new pending.json structure.`);
    }
  }

  return createDefaultPending();
}

/**
 * Save pending.json with error handling
 */
function savePending(pendingPath: string, pending: PendingFile): void {
  pending.updated_at = new Date().toISOString();
  const dir = path.dirname(pendingPath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2) + '\n', 'utf-8');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save pending.json to ${pendingPath}: ${errMsg}`);
  }
}

/**
 * Generate pending_id with crypto-secure random component
 */
function generatePendingId(domain: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(2).toString('hex'); // 4 hex chars
  const domainPrefix = domain.toLowerCase().replace(/[^a-z]/g, '-').slice(0, 20);
  return `pending-${domainPrefix}-${timestamp}-${random}`;
}

// ==================== Converted File Operations ====================

/**
 * Update converted file frontmatter with processed_status
 *
 * Note: This function uses custom regex parsing instead of the shared
 * parseFrontmatter utility because it needs to:
 * 1. Preserve the original frontmatter structure for modification
 * 2. Rebuild the file content with updated frontmatter
 * The shared utility only returns parsed values, not the raw frontmatter string.
 */
function updateConvertedFileStatus(
  sourceDir: string,
  convertedFile: string,
  status: 'passed' | 'rejected'
): void {
  const filePath = path.join(sourceDir, convertedFile);

  if (!fs.existsSync(filePath)) {
    // For 'rejected' status, missing file is acceptable (no agent call needed)
    // For 'passed' status, this should not happen as Agent should have created the card
    if (status === 'rejected') {
      console.warn(`Warning: Converted file not found: ${convertedFile}`);
      return;
    }
    // For 'passed', the Agent should have processed the file - this is unexpected
    throw new Error(`Converted file not found: ${convertedFile}. Agent may have failed to process.`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse existing frontmatter
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!frontmatterMatch) {
    console.warn(`Warning: No frontmatter in ${convertedFile}`);
    return;
  }

  const frontmatterContent = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Update frontmatter fields
  const timestamp = new Date().toISOString();
  // Handle different quote styles: "pending", 'pending', or unquoted pending
  let updatedFrontmatter = frontmatterContent
    .replace(/processed_status:\s*"pending"/, `processed_status: "${status}"`)
    .replace(/processed_status:\s*'pending'/, `processed_status: "${status}"`)
    .replace(/processed_status:\s*pending\b/, `processed_status: "${status}"`)
    .replace(/processed_status:\s*null/, `processed_status: "${status}"`);

  // Add processed_status if not present
  if (!updatedFrontmatter.includes('processed_status:')) {
    updatedFrontmatter += `\nprocessed_status: "${status}"`;
  }

  // Update processed_at
  if (updatedFrontmatter.includes('processed_at:')) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /processed_at:\s*[^\n]+/,
      `processed_at: "${timestamp}"`
    );
  } else {
    updatedFrontmatter += `\nprocessed_at: "${timestamp}"`;
  }

  // Write updated content
  const newContent = `---\n${updatedFrontmatter}\n---\n${body}`;
  fs.writeFileSync(filePath, newContent, 'utf-8');
}

// ==================== State Update Logic ====================

/**
 * Update state with agent results
 */
function updateStateWithResults(
  sourceDir: string,
  pendingPath: string,
  results: AgentResult[]
): void {
  const pending = loadOrCreatePending(pendingPath);

  let passedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;

  for (const result of results) {
    const { source_file, has_strategic_value, review_reason } = result;

    if (has_strategic_value === null) {
      // Needs review - check for existing entry to prevent duplicates
      const existingIndex = pending.review.items.findIndex(
        item => item.converted_file === source_file
      );

      if (existingIndex !== -1) {
        // Already in pending queue, skip
        console.warn(`Skipping duplicate pending entry: ${source_file}`);
        continue;
      }

      // Add to pending
      const pendingId = generatePendingId(result.domain || 'unknown');
      pending.review.items.push({
        pending_id: pendingId,
        converted_file: source_file,
        archived_source: result.archived_source,
        added_at: new Date().toISOString(),
        reason: review_reason || '需人工审核',
      });
      pendingCount++;
    } else if (has_strategic_value === true) {
      // Passed - update converted file
      updateConvertedFileStatus(sourceDir, source_file, 'passed');
      passedCount++;
    } else {
      // Rejected - update converted file
      updateConvertedFileStatus(sourceDir, source_file, 'rejected');
      rejectedCount++;
    }
  }

  savePending(pendingPath, pending);

  console.log(`✅ State updated successfully`);
  console.log(`   Processed: ${results.length} files`);
  console.log(`   Passed: ${passedCount}, Rejected: ${rejectedCount}, Pending: ${pendingCount}`);
}

// ==================== Review Mode Functions ====================

/**
 * Handle review action (approve/reject)
 */
function handleReviewAction(
  outputDir: string,
  action: string,
  pendingId: string,
  reason: string
): void {
  if (action === 'list') {
    listPendingReviews(outputDir);
    return;
  }

  if (!pendingId) {
    console.error('Error: --pending-id required for approve/reject');
    process.exit(1);
  }

  if (!reason) {
    console.warn('Warning: No --reason provided');
  }

  const pendingPath = getPendingPath(outputDir);
  const pending = loadOrCreatePending(pendingPath);

  // Find pending item
  const itemIndex = pending.review.items.findIndex(
    item => item.pending_id === pendingId
  );

  if (itemIndex === -1) {
    console.error(`Error: Pending ID not found: ${pendingId}`);
    process.exit(1);
  }

  const item = pending.review.items[itemIndex];

  if (action === 'approve') {
    // Note: Agent invocation is handled by the command layer
    // This function only updates the pending.json and converted file status
    updateConvertedFileStatus(outputDir, item.converted_file, 'passed');
    pending.review.items.splice(itemIndex, 1);
    savePending(pendingPath, pending);
    console.log(`✅ Approved: ${pendingId}`);
    console.log(`   Reason: ${reason || '(none)'}`);
  } else if (action === 'reject') {
    updateConvertedFileStatus(outputDir, item.converted_file, 'rejected');
    pending.review.items.splice(itemIndex, 1);
    savePending(pendingPath, pending);
    console.log(`✅ Rejected: ${pendingId}`);
    console.log(`   Reason: ${reason || '(none)'}`);
  } else {
    console.error(`Error: Unknown review action: ${action}`);
    process.exit(1);
  }
}

/**
 * List pending reviews
 */
function listPendingReviews(outputDir: string): void {
  const pendingPath = getPendingPath(outputDir);
  const pending = loadOrCreatePending(pendingPath);

  if (pending.review.items.length === 0) {
    console.log('No pending reviews');
    return;
  }

  console.log(`📋 Pending Reviews (${pending.review.items.length})\n`);
  for (const item of pending.review.items) {
    console.log(`ID: ${item.pending_id}`);
    console.log(`  Converted: ${item.converted_file}`);
    console.log(`  Archived: ${item.archived_source}`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  Added: ${item.added_at}`);
    console.log('');
  }
}

// ==================== CLI ====================

function main(): void {
  const args = process.argv.slice(2);
  let outputDir = '.';
  let resultsJson = '';
  let reviewAction = '';
  let pendingId = '';
  let reviewReason = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++;
    } else if (args[i] === '--results' && i + 1 < args.length) {
      resultsJson = args[i + 1];
      i++;
    } else if (args[i] === '--review' && i + 1 < args.length) {
      reviewAction = args[i + 1];
      i++;
    } else if (args[i] === '--pending-id' && i + 1 < args.length) {
      pendingId = args[i + 1];
      i++;
    } else if (args[i] === '--reason' && i + 1 < args.length) {
      reviewReason = args[i + 1];
      i++;
    }
  }

  // Handle review mode
  if (reviewAction) {
    handleReviewAction(outputDir, reviewAction, pendingId, reviewReason);
    return;
  }

  // Handle normal processing mode
  if (!resultsJson) {
    console.error('Error: --results parameter required');
    process.exit(1);
  }

  // Parse results
  let results: AgentResult[];
  try {
    results = JSON.parse(resultsJson);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error: Invalid JSON in --results: ${errMsg}`);
    process.exit(1);
  }

  // Validate results
  for (let i = 0; i < results.length; i++) {
    const validation = validateAgentResult(results[i], i);
    if (!validation.valid) {
      console.error(`Error: ${validation.error}`);
      process.exit(1);
    }
    results[i] = validation.data;
  }

  const pendingPath = getPendingPath(outputDir);
  updateStateWithResults(outputDir, pendingPath, results);
}

main();