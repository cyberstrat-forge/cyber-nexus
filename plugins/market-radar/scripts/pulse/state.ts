#!/usr/bin/env node
/**
 * Pulse state management
 *
 * Manages cursor tracking in pending.json (shared with intel-distill).
 *
 * Cursor format (v3.0.0):
 * - last_fetched_at: timestamp for incremental sync (since parameter)
 * - last_item_id: ID for cursor pagination
 * - last_pull: last pull completion timestamp
 * - total_synced: cumulative sync count
 *
 * Field ownership in pending.json:
 * - pulse.cursors: managed by intel-pull (this module)
 * - review.items: managed by intel-distill
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
 * Get state file path (now pending.json)
 *
 * @param rootDir - Project root directory
 * @returns Full path to pending.json
 */
export function getStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'pending.json');
}

/**
 * Get old state.json path (for migration)
 *
 * @param rootDir - Project root directory
 * @returns Full path to old state.json
 */
export function getOldStatePath(rootDir: string): string {
  return path.join(rootDir, '.intel', 'state.json');
}

/**
 * Load state from file
 *
 * @param rootDir - Project root directory
 */
export function loadState(rootDir: string): Record<string, unknown> {
  const statePath = getStatePath(rootDir);
  const oldStatePath = getOldStatePath(rootDir);

  // Check if old state.json exists (need migration)
  if (!fs.existsSync(statePath) && fs.existsSync(oldStatePath)) {
    console.log('[pulse] Old state.json detected, migration required');
    // Migration will be handled by migrate-state.ts
    // Return default structure for now
    return {
      version: STATE_VERSION,
      updated_at: new Date().toISOString(),
      review: { items: [] },
      pulse: DEFAULT_PULSE_STATE,
    };
  }

  if (!fs.existsSync(statePath)) {
    return {
      version: STATE_VERSION,
      updated_at: new Date().toISOString(),
      review: { items: [] },
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
 * Migrate state to current version (simplified for pending.json)
 */
function migrateState(state: Record<string, unknown>): Record<string, unknown> {
  // pending.json format is simpler, just ensure pulse field exists
  if (!state.pulse) {
    state.pulse = DEFAULT_PULSE_STATE;
  }

  // Ensure review.items exists
  if (!state.review) {
    state.review = { items: [] };
  } else {
    const review = state.review as { items?: unknown[] };
    if (!review.items) {
      (state.review as { items: unknown[] }).items = [];
    }
  }

  return state;
}

/**
 * Get pulse state from full state
 *
 * Returns the pulse portion of the shared pending.json, with validation.
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
    try {
      fs.mkdirSync(stateDir, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new PulseError('STATE_ERROR', `无法创建状态目录 ${stateDir}: ${message}`, { dir: stateDir, error });
    }
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
    try {
      fs.mkdirSync(stateDir, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new PulseError('STATE_ERROR', `无法创建状态目录 ${stateDir}: ${message}`, { dir: stateDir, error });
    }
  }
}