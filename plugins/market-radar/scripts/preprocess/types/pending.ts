/**
 * Shared type definitions for pending.json state management
 *
 * These types are aligned with pending.schema.json
 */

/**
 * Cursor state for a single intel source
 */
export interface PulseCursorState {
  last_fetched_at: string | null;
  last_item_id: string | null;
  last_pull: string | null;
  total_synced: number;
}

/**
 * Pending item for user review
 *
 * When has_strategic_value is null, the item needs manual review.
 */
export interface PendingItem {
  pending_id: string;
  converted_file: string;
  archived_source: string;
  added_at: string;
  reason: string;
}

/**
 * pending.json structure
 *
 * Lightweight runtime state shared between intel-distill and intel-pull.
 *
 * Field ownership:
 * - pulse.cursors: managed by intel-pull
 * - review.items: managed by intel-distill
 */
export interface PendingFile {
  version: string;
  updated_at: string;
  review: {
    items: PendingItem[];
  };
  pulse: {
    cursors: Record<string, PulseCursorState>;
  };
}

/**
 * Create default empty pending structure
 */
export function createDefaultPending(): PendingFile {
  return {
    version: '1.0.0',
    updated_at: new Date().toISOString(),
    review: { items: [] },
    pulse: { cursors: {} },
  };
}