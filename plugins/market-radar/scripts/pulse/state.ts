#!/usr/bin/env node
/**
 * Pulse state management
 *
 * Manages cursor tracking in state.json (shared with intel-distill).
 *
 * Cursor format (v3.0.0):
 * - last_fetched_at: timestamp for incremental sync (since parameter)
 * - last_item_id: ID for cursor pagination
 * - last_pull: last pull completion timestamp
 * - total_synced: cumulative sync count
 *
 * Field ownership in state.json:
 * - pulse.cursors: managed by intel-pull (this module)
 * - queue, review, processed, stats: managed by intel-distill
 *
 * Usage:
 *   import { loadState, saveState, getCursorState, setCursorState, clearCursorState } from './state';
 */

import * as fs from 'fs';
import * as path from 'path';
import { PulseState, PulseCursorState, PulseError } from './types';

/** Current state file version */
const STATE_VERSION = '3.0.0';

/** Default pulse state structure */
const DEFAULT_PULSE_STATE: PulseState = {
  cursors: {},
};

/** Default cursor state for a single source */
const DEFAULT_CURSOR_STATE: PulseCursorState = {
  last_fetched_at: null,
  last_item_id: null,
  last_pull: null,
  total_synced: 0,
};

/**
 * Get state file path
 *
 * @param rootDir - Project root directory (state file always in root/.intel/)
 * @returns Full path to state.json
 */
export function getStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'state.json');
}

/**
 * Load state from file
 *
 * @param rootDir - Project root directory
 */
export function loadState(rootDir: string): Record<string, unknown> {
  const statePath = getStatePath(rootDir);

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
  const rawVersion = state.version;
  const version = typeof rawVersion === 'string' ? rawVersion : '1.0';

  if (version === STATE_VERSION) {
    return state;
  }

  console.log(`[pulse] Migrating state from version ${version} to ${STATE_VERSION}`);

  // Add pulse field if missing
  if (!state.pulse) {
    state.pulse = DEFAULT_PULSE_STATE;
  }

  // Safely check for old cursor format and reset
  if (state.pulse && typeof state.pulse === 'object') {
    const pulseState = state.pulse as Record<string, unknown>;
    if (pulseState.cursors && typeof pulseState.cursors === 'object' && pulseState.cursors !== null) {
      const cursors = pulseState.cursors as Record<string, unknown>;
      for (const sourceName of Object.keys(cursors)) {
        const cursor = cursors[sourceName];
        // Only process if cursor is a non-null object
        if (cursor && typeof cursor === 'object') {
          const cursorObj = cursor as Record<string, unknown>;
          // Old format has 'cursor' field, new format has 'last_fetched_at'
          if ('cursor' in cursorObj && !('last_fetched_at' in cursorObj)) {
            console.log(`[pulse] Old cursor format detected for ${sourceName}, resetting`);
            cursors[sourceName] = DEFAULT_CURSOR_STATE;
          }
        }
      }
    }
  }

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
 * Get cursor state for a source
 */
export function getCursorState(
  state: Record<string, unknown>,
  sourceName: string
): PulseCursorState {
  const pulseState = getPulseState(state);
  const cursorState = pulseState.cursors[sourceName];

  if (cursorState && typeof cursorState === 'object') {
    // Check for new format (has last_fetched_at)
    if ('last_fetched_at' in cursorState) {
      return cursorState as PulseCursorState;
    }
    // Old format detected (has cursor but no last_fetched_at)
    if ('cursor' in cursorState) {
      console.log(`[pulse] Old cursor format detected for ${sourceName}, migration required`);
    } else {
      // Unexpected structure - log warning
      console.log(`[pulse] Warning: Unexpected cursor structure for ${sourceName}, resetting`);
    }
    return DEFAULT_CURSOR_STATE;
  }

  return DEFAULT_CURSOR_STATE;
}

/**
 * Set cursor state for a source after successful sync
 */
export function setCursorState(
  state: Record<string, unknown>,
  sourceName: string,
  lastFetchedAt: string,
  lastItemId: string,
  syncedCount: number
): Record<string, unknown> {
  const pulseState = getPulseState(state);
  const prevCursor = pulseState.cursors[sourceName] || DEFAULT_CURSOR_STATE;
  const prevTotal = prevCursor.total_synced || 0;

  return {
    ...state,
    version: STATE_VERSION,
    updated_at: new Date().toISOString(),
    pulse: {
      ...pulseState,
      cursors: {
        ...pulseState.cursors,
        [sourceName]: {
          last_fetched_at: lastFetchedAt,
          last_item_id: lastItemId,
          last_pull: new Date().toISOString(),
          total_synced: prevTotal + syncedCount,
        },
      },
    },
  };
}

/**
 * Clear cursor state for a source (used by --init mode)
 */
export function clearCursorState(
  state: Record<string, unknown>,
  sourceName: string
): Record<string, unknown> {
  const pulseState = getPulseState(state);

  const newCursors = { ...pulseState.cursors };
  delete newCursors[sourceName];

  return {
    ...state,
    version: STATE_VERSION,
    updated_at: new Date().toISOString(),
    pulse: {
      ...pulseState,
      cursors: newCursors,
    },
  };
}

/**
 * Save state to file
 *
 * @param state - State object to save
 * @param rootDir - Project root directory
 */
export function saveState(
  state: Record<string, unknown>,
  rootDir: string
): void {
  const statePath = getStatePath(rootDir);
  const stateDir = path.dirname(statePath);

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  state.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Ensure state directory exists
 *
 * @param rootDir - Project root directory
 */
export function ensureStateDir(rootDir: string): void {
  const stateDir = path.join(rootDir, '.intel');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}