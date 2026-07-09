/**
 * Config repository
 */

import { execute, executeInsert } from '../sqlite'

export interface Config {
  key: string
  value: string
  updated_at: number
}

export const ConfigRepository = {
  get(key: string): string | null {
    const rows = execute('SELECT value FROM config WHERE key = ?', [key])
    return rows[0]?.value ?? null
  },

  set(key: string, value: string): void {
    const now = Date.now()
    const existing = this.get(key)

    if (existing !== null) {
      execute('UPDATE config SET value = ?, updated_at = ? WHERE key = ?', [value, now, key])
    } else {
      executeInsert('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)', [key, value, now])
    }
  },

  delete(key: string): boolean {
    execute('DELETE FROM config WHERE key = ?', [key])
    return true
  },

  getAll(): Record<string, string> {
    const rows = execute('SELECT key, value FROM config')
    const config: Record<string, string> = {}
    for (const row of rows) {
      config[row.key] = row.value
    }
    return config
  },

  getByPrefix(prefix: string): Record<string, string> {
    const rows = execute('SELECT key, value FROM config WHERE key LIKE ?', [`${prefix}%`])
    const config: Record<string, string> = {}
    for (const row of rows) {
      config[row.key] = row.value
    }
    return config
  },
}
