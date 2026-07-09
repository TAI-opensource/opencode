/**
 * Message repository
 */

import { execute, executeInsert } from '../sqlite'

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  parent_id?: string
  time: number
}

export const MessageRepository = {
  findById(id: string): Message | null {
    const rows = execute('SELECT * FROM message WHERE id = ?', [id])
    return rows[0] ?? null
  },

  findBySession(sessionId: string): Message[] {
    return execute('SELECT * FROM message WHERE session_id = ? ORDER BY time ASC', [sessionId])
  },

  create(message: Omit<Message, 'id'>): Message {
    const id = message.id || crypto.randomUUID()

    executeInsert(
      'INSERT INTO message (id, session_id, role, parent_id, time) VALUES (?, ?, ?, ?, ?)',
      [id, message.session_id, message.role, message.parent_id ?? null, message.time || Date.now()]
    )

    return this.findById(id)!
  },

  delete(id: string): boolean {
    execute('DELETE FROM message WHERE id = ?', [id])
    return true
  },

  deleteBySession(sessionId: string): boolean {
    execute('DELETE FROM message WHERE session_id = ?', [sessionId])
    return true
  },

  count(sessionId: string): number {
    const result = execute('SELECT COUNT(*) as count FROM message WHERE session_id = ?', [sessionId])
    return result[0]?.count ?? 0
  },
}
