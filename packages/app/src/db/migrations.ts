/**
 * Schema migrations
 */

import { execute } from './sqlite'

export interface Migration {
  version: number
  up: string[]
}

const migrations: Migration[] = [
  {
    version: 1,
    up: [
      `CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        project_id TEXT NOT NULL,
        directory TEXT NOT NULL,
        title TEXT NOT NULL,
        agent TEXT,
        model_id TEXT,
        model_provider_id TEXT,
        model_variant TEXT,
        summary_additions REAL,
        summary_deletions REAL,
        summary_files REAL,
        tokens_input REAL DEFAULT 0,
        tokens_output REAL DEFAULT 0,
        tokens_reasoning REAL DEFAULT 0,
        tokens_cache_read REAL DEFAULT 0,
        tokens_cache_write REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        permission TEXT,
        time_created INTEGER NOT NULL,
        time_updated INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS message (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        parent_id TEXT,
        time INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS part (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        time INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS project (
        id TEXT PRIMARY KEY,
        name TEXT,
        worktree TEXT NOT NULL,
        time_created INTEGER NOT NULL,
        time_initialized INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_message_session ON message(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_part_session ON part(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_part_message ON part(message_id)`,
    ],
  },
]

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  // Create migrations table
  execute(`CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)`)

  // Get current version
  const result = execute('SELECT MAX(version) as version FROM _migrations')
  const currentVersion = result[0]?.version ?? 0

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[Migration] Running migration ${migration.version}`)
      for (const sql of migration.up) {
        execute(sql)
      }
      execute('INSERT INTO _migrations (version) VALUES (?)', [migration.version])
    }
  }
}
