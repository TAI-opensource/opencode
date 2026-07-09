/**
 * Session repository
 */

import { execute, executeInsert } from '../sqlite'

export interface Session {
  id: string
  slug: string
  project_id: string
  directory: string
  title: string
  agent?: string
  model_id?: string
  model_provider_id?: string
  model_variant?: string
  summary_additions?: number
  summary_deletions?: number
  summary_files?: number
  tokens_input: number
  tokens_output: number
  tokens_reasoning: number
  tokens_cache_read: number
  tokens_cache_write: number
  cost: number
  permission?: string
  time_created: number
  time_updated: number
}

export const SessionRepository = {
  findById(id: string): Session | null {
    const rows = execute('SELECT * FROM session WHERE id = ?', [id])
    return rows[0] ?? null
  },

  findByProject(projectId: string): Session[] {
    return execute('SELECT * FROM session WHERE project_id = ? ORDER BY time_updated DESC', [projectId])
  },

  findAll(): Session[] {
    return execute('SELECT * FROM session ORDER BY time_updated DESC')
  },

  create(session: Omit<Session, 'tokens_input' | 'tokens_output' | 'tokens_reasoning' | 'tokens_cache_read' | 'tokens_cache_write' | 'cost'>): Session {
    const now = Date.now()
    const id = session.id || crypto.randomUUID()

    executeInsert(
      `INSERT INTO session (id, slug, project_id, directory, title, agent, model_id, model_provider_id, model_variant, summary_additions, summary_deletions, summary_files, permission, time_created, time_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        session.slug,
        session.project_id,
        session.directory,
        session.title,
        session.agent ?? null,
        session.model_id ?? null,
        session.model_provider_id ?? null,
        session.model_variant ?? null,
        session.summary_additions ?? null,
        session.summary_deletions ?? null,
        session.summary_files ?? null,
        session.permission ?? null,
        session.time_created || now,
        session.time_updated || now,
      ]
    )

    return this.findById(id)!
  },

  update(id: string, updates: Partial<Session>): Session | null {
    const fields: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return this.findById(id)

    fields.push('time_updated = ?')
    values.push(Date.now())
    values.push(id)

    execute(`UPDATE session SET ${fields.join(', ')} WHERE id = ?`, values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    const result = execute('DELETE FROM session WHERE id = ?', [id])
    return true
  },

  search(query: string): Session[] {
    return execute(
      'SELECT * FROM session WHERE title LIKE ? OR agent LIKE ? ORDER BY time_updated DESC',
      [`%${query}%`, `%${query}%`]
    )
  },
}
