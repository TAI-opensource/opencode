/**
 * SQLite WASM + OPFS adapter for browser
 * Uses sql.js with Origin Private File System for persistence
 */

import initSqlJs, { type Database } from 'sql.js'

type SqliteDatabase = Database

let dbInstance: SqliteDatabase | null = null
let dbReady: Promise<SqliteDatabase> | null = null

const DB_NAME = 'opencode.sqlite3'

/**
 * Initialize SQLite with OPFS persistence
 */
export async function initDatabase(): Promise<SqliteDatabase> {
  if (dbInstance) return dbInstance
  if (dbReady) return dbReady

  dbReady = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })

    // Try to load from OPFS
    let db: SqliteDatabase
    const data = await loadFromOPFS()

    if (data) {
      db = new SQL.Database(data)
      console.log('[SQLite] Loaded database from OPFS')
    } else {
      db = new SQL.Database()
      console.log('[SQLite] Created new in-memory database')
    }

    dbInstance = db
    await setupPragmas(dbInstance)
    await runMigrations(dbInstance)
    await saveToOPFS()

    return dbInstance
  })()

  return dbReady
}

/**
 * Load database from OPFS
 */
async function loadFromOPFS(): Promise<Uint8Array | null> {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      return null
    }

    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(DB_NAME)
    const file = await fileHandle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Save database to OPFS
 */
async function saveToOPFS(): Promise<void> {
  try {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      console.warn('[SQLite] OPFS not available, database will not persist')
      return
    }

    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(DB_NAME, { create: true })
    const writable = await fileHandle.createWritable()

    const data = dbInstance!.export()
    await writable.write(data)
    await writable.close()

    console.log('[SQLite] Database saved to OPFS')
  } catch (error) {
    console.error('[SQLite] Failed to save to OPFS:', error)
  }
}

/**
 * Setup SQLite pragmas for performance
 */
async function setupPragmas(db: SqliteDatabase): Promise<void> {
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA synchronous = NORMAL')
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA cache_size = -64000')
  db.run('PRAGMA foreign_keys = ON')
}

/**
 * Run database migrations
 */
async function runMigrations(db: SqliteDatabase): Promise<void> {
  db.run(`
    CREATE TABLE IF NOT EXISTS session (
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
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      parent_id TEXT,
      time INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS part (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      time INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      name TEXT,
      worktree TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_initialized INTEGER NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_message_session ON message(session_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_part_session ON part(session_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_part_message ON part(message_id)')
}

/**
 * Get database instance
 */
export function getDatabase(): SqliteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}

/**
 * Execute SQL query
 */
export function execute(sql: string, params?: any[]): any[] {
  const db = getDatabase()

  if (params) {
    const stmt = db.prepare(sql)
    stmt.bind(params)

    const results: any[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }

  const results: any[] = []
  const stmt = db.prepare(sql)
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

/**
 * Execute SQL and return last insert rowid
 */
export function executeInsert(sql: string, params?: any[]): number {
  const db = getDatabase()

  if (params) {
    db.run(sql, params)
  } else {
    db.run(sql)
  }

  const result = db.exec('SELECT last_insert_rowid() as id')
  return result[0]?.values[0]?.[0] as number
}

/**
 * Save database to OPFS (call after modifications)
 */
export async function saveDatabase(): Promise<void> {
  await saveToOPFS()
}

/**
 * Close database
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await saveToOPFS()
    dbInstance.close()
    dbInstance = null
  }
}
