#!/usr/bin/env node
/**
 * Pulse state management
 *
 * Manages cursor tracking in state.json (shared with intel-distill).
 *
 * Field ownership in state.json:
 * - pulse.cursors: managed by intel-pull (this module)
 * - queue, review, processed, stats: managed by intel-distill
 *
 * Usage:
 *   import { loadState, saveState, getCursor, setCursor } from './state';
 */

import * as fs from 'fs';
import * as path from 'path';
import { PulseState, PulseCursorState, PulseError } from './types';

/** Current state file version */
const STATE_VERSION = '2.2.0';

/** Default pulse state structure */
const DEFAULT_PULSE_STATE: PulseState = {
  cursors: {},
};

/**
 * Get state file path
 */
export function getStatePath(outputDir: string): string {
  return path.join(outputDir, '.intel', 'state.json');
}

/**
 * Load state from file
 */
export function loadState(outputDir: string): Record<string, unknown> {
  const statePath = getStatePath(outputDir);

  if (!fs.existsSync(statePath)) {
    // Return default state structure
    return {
      version: STATE_VERSION,
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
      pulse: DEFAULT_PULSE_STATE,
    };
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);

    // Migrate if needed
    return migrateState(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PulseError('STATE_ERROR', `状态文件读取失败: ${message}`);
  }
}

/**
 * Migrate state to current version
 */
function migrateState(state: Record<string, unknown>): Record<string, unknown> {
  // Safely extract version with proper type checking
  const rawVersion = state.version;
  const version = typeof rawVersion === 'string' ? rawVersion : '1.0';

  // Already at current version
  if (version === STATE_VERSION) {
    return state;
  }

  // Log migration for debugging
  if (version !== STATE_VERSION) {
    console.log(`[pulse] Migrating state from version ${version} to ${STATE_VERSION}`);
  }

  // Add pulse field if missing
  if (!state.pulse) {
    state.pulse = DEFAULT_PULSE_STATE;
  }

  // Update version
  state.version = STATE_VERSION;

  return state;
}

/**
 * Get pulse state from full state
 *
 * Returns the pulse portion of the shared state.json, with validation.
 */
export function getPulseState(state: Record<string, unknown>): PulseState {
  const pulse = state.pulse;
  if (pulse && typeof pulse === 'object' && 'cursors' in pulse) {
    return pulse as PulseState;
  }
  return DEFAULT_PULSE_STATE;
}

/**
 * Get cursor for a source
 */
export function getCursor(
  state: Record<string, unknown>,
  sourceName: string
): PulseCursorState {
  const pulseState = getPulseState(state);
  return pulseState.cursors[sourceName] || { cursor: null, last_pull: null };
}

/**
 * Set cursor for a source
 */
export function setCursor(
  state: Record<string, unknown>,
  sourceName: string,
  cursor: string
): Record<string, unknown> {
  const pulseState = getPulseState(state);

  return {
    ...state,
    version: STATE_VERSION,
    updated_at: new Date().toISOString(),
    pulse: {
      ...pulseState,
      cursors: {
        ...pulseState.cursors,
        [sourceName]: {
          cursor,
          last_pull: new Date().toISOString(),
        },
      },
    },
  };
}

/**
 * Save state to file
 */
export function saveState(
  state: Record<string, unknown>,
  outputDir: string
): void {
  const statePath = getStatePath(outputDir);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  state.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Ensure state directory exists
 */
export function ensureStateDir(outputDir: string): void {
  const stateDir = path.join(outputDir, '.intel');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}