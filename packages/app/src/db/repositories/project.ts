/**
 * Project repository
 */

import { execute, executeInsert } from '../sqlite'

export interface Project {
  id: string
  name?: string
  worktree: string
  time_created: number
  time_initialized: number
}

export const ProjectRepository = {
  findById(id: string): Project | null {
    const rows = execute('SELECT * FROM project WHERE id = ?', [id])
    return rows[0] ?? null
  },

  findByWorktree(worktree: string): Project | null {
    const rows = execute('SELECT * FROM project WHERE worktree = ?', [worktree])
    return rows[0] ?? null
  },

  findAll(): Project[] {
    return execute('SELECT * FROM project ORDER BY time_created DESC')
  },

  create(project: Omit<Project, 'id'>): Project {
    const id = project.id || crypto.randomUUID()
    const now = Date.now()

    executeInsert(
      'INSERT INTO project (id, name, worktree, time_created, time_initialized) VALUES (?, ?, ?, ?, ?)',
      [id, project.name ?? null, project.worktree, project.time_created || now, project.time_initialized || now]
    )

    return this.findById(id)!
  },

  update(id: string, updates: Partial<Project>): Project | null {
    const fields: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue
      fields.push(`${key} = ?`)
      values.push(value)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    execute(`UPDATE project SET ${fields.join(', ')} WHERE id = ?`, values)
    return this.findById(id)
  },

  delete(id: string): boolean {
    execute('DELETE FROM project WHERE id = ?', [id])
    return true
  },
}
