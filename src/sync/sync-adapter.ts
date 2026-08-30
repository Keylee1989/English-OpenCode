/**
 * Sync Adapter seam (spec §39).
 *
 * Phase 0 is local-first: IndexedDB only, no network persistence.
 * This interface is the ONLY place a future backend (Supabase / Firebase /
   self-hosted) may attach. UI and engines must never talk to a backend
 * directly.
 *
 * The shipped DisabledSyncAdapter is honest: it reports disabled instead of
 * pretending data is synced.
 */

export type SyncConflictPolicy = "local-wins" | "remote-wins" | "manual";

export interface ISyncAdapter {
  readonly adapterId: string;
  isEnabled(): boolean;
  /** Push local changes; returns number of records pushed. */
  push(table: string, rows: unknown[]): Promise<number>;
  /** Pull remote changes since a timestamp. */
  pull(table: string, sinceMs: number): Promise<unknown[]>;
}

export class DisabledSyncAdapter implements ISyncAdapter {
  readonly adapterId = "disabled";

  isEnabled(): boolean {
    return false;
  }

  async push(_table: string, _rows: unknown[]): Promise<number> {
    return 0;
  }

  async pull(_table: string, _sinceMs: number): Promise<unknown[]> {
    return [];
  }
}
