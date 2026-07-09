/**
 * SQLite WASM + OPFS adapter for browser
 * Uses @sqlite.org/sqlite-wasm with Origin Private File System for persistence
 */

type SqliteDatabase = any
type Sqlite3Static = any

let sqlite3Instance: Sqlite3Static | null = null
let dbInstance: SqliteDatabase | null = null
let dbReady: Promise<SqliteDatabase> | null = null

const DB_NAME = '/opencode.sqlite3'

/**
 * Initialize SQLite with OPFS persistence
 */
export async function initDatabase(): Promise<SqliteDatabase> {
  if (dbInstance) return dbInstance
  if (dbReady) return dbReady

  dbReady = (async () => {
    const sqlite3 = await loadSqlite3()
    sqlite3Instance = sqlite3

    if (sqlite3.oo1.OpfsDb) {
      const db = new sqlite3.oo1.OpfsDb(DB_NAME, 'ct')
      dbInstance = db
      console.log('[SQLite] OPFS database created:', DB_NAME)
    } else {
      console.warn('[SQLite] OPFS not available, using in-memory database')
      const db = new sqlite3.oo1.DB(':memory:', 'ct')
      dbInstance = db
    }

    await setupPragmas(dbInstance)
    await runMigrations(dbInstance)

    return dbInstance
  })()

  return dbReady
}

/**
 * Load SQLite3 WASM module
 */
async function loadSqlite3(): Promise<Sqlite3Static> {
  if (sqlite3Instance) return sqlite3Instance

  // Dynamic import of @sqlite.org/sqlite-wasm
  const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default

  return new Promise((resolve, reject) => {
    sqlite3InitModule({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@latest/${file}`,
    })
      .then(resolve)
      .catch(reject)
  })
}

/**
 * Setup SQLite pragmas for performance
 */
async function setupPragmas(db: SqliteDatabase): Promise<void> {
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec('PRAGMA cache_size = -64000')
  db.exec('PRAGMA foreign_keys = ON')
}

/**
 * Run database migrations
 */
async function runMigrations(db: SqliteDatabase): Promise<void> {
  // Create tables if they don't exist
  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      parent_id TEXT,
      time INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      name TEXT,
      worktree TEXT NOT NULL,
      time_created INTEGER NOT NULL,
      time_initialized INTEGER NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Create indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_message_session ON message(session_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_part_session ON part(session_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_part_message ON part(message_id)')
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
    return db.exec({ sql, bind: params, returnValue: 'resultRows' })
  }
  return db.exec({ sql, returnValue: 'resultRows' })
}

/**
 * Execute SQL and return last insert rowid
 */
export function executeInsert(sql: string, params?: any[]): number {
  const db = getDatabase()
  if (params) {
    db.exec({ sql, bind: params })
  } else {
    db.exec(sql)
  }
  return db.exec({ sql: 'SELECT last_insert_rowid() as id', returnValue: 'resultRows' })[0]?.id
}

/**
 * Close database
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
