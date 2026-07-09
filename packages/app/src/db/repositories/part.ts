/**
 * Part repository
 */

import { execute, executeInsert } from '../sqlite'

export interface Part {
  id: string
  session_id: string
  message_id: string
  type: 'text' | 'tool-call' | 'tool-result' | 'reasoning' | 'error'
  data: string
  time: number
}

export const PartRepository = {
  findById(id: string): Part | null {
    const rows = execute('SELECT * FROM part WHERE id = ?', [id])
    return rows[0] ?? null
  },

  findByMessage(messageId: string): Part[] {
    return execute('SELECT * FROM part WHERE message_id = ? ORDER BY time ASC', [messageId])
  },

  findBySession(sessionId: string): Part[] {
    return execute('SELECT * FROM part WHERE session_id = ? ORDER BY time ASC', [sessionId])
  },

  create(part: Omit<Part, 'id'>): Part {
    const id = part.id || crypto.randomUUID()

    executeInsert(
      'INSERT INTO part (id, session_id, message_id, type, data, time) VALUES (?, ?, ?, ?, ?, ?)',
      [id, part.session_id, part.message_id, part.type, part.data, part.time || Date.now()]
    )

    return this.findById(id)!
  },

  update(id: string, updates: Partial<Part>): Part | null {
    const fields: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    execute(`UPDATE part SET ${fields.join(', ')} WHERE id = ?`, values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    execute('DELETE FROM part WHERE id = ?', [id])
    return true
  },

  deleteByMessage(messageId: string): boolean {
    execute('DELETE FROM part WHERE message_id = ?', [messageId])
    return true
  },

  deleteBySession(sessionId: string): boolean {
    execute('DELETE FROM part WHERE session_id = ?', [sessionId])
    return true
  },
}
