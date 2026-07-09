/**
 * Search tools
 */

import { readFile, listDirectory, stat } from '../fs/opfs'
import type { ToolDefinition } from '../index'

export const grepTool: ToolDefinition = {
  name: 'grep',
  description: 'Search for patterns in files',
  parameters: {
    pattern: {
      type: 'string',
      description: 'Regex pattern to search for',
      required: true,
    },
    path: {
      type: 'string',
      description: 'Directory to search in',
      default: '.',
    },
    include: {
      type: 'string',
      description: 'File pattern to include (e.g., "*.ts")',
    },
  },
  execute: async (params) => {
    try {
      const results: Array<{ file: string; line: number; content: string }> = []
      const regex = new RegExp(params.pattern, 'gi')

      async function searchDir(dirPath: string) {
        const entries = await listDirectory(dirPath)

        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry}`.replace(/\/+/g, '/')
          const info = await stat(fullPath)

          if (info.isDirectory) {
            await searchDir(fullPath)
          } else if (info.isFile) {
            if (params.include && !entry.match(params.include.replace('*', '.*'))) {
              continue
            }

            try {
              const content = await readFile(fullPath)
              const lines = content.split('\n')

              for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                  results.push({
                    file: fullPath,
                    line: i + 1,
                    content: lines[i].trim(),
                  })
                }
                regex.lastIndex = 0
              }
            } catch {
              // Skip binary or unreadable files
            }
          }
        }
      }

      await searchDir(params.path)

      const output = results
        .map((r) => `${r.file}:${r.line}: ${r.content}`)
        .join('\n')

      return {
        success: true,
        output: output || 'No matches found',
        metadata: { results, count: results.length },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const findFilesTool: ToolDefinition = {
  name: 'find_files',
  description: 'Find files by name pattern',
  parameters: {
    pattern: {
      type: 'string',
      description: 'Glob pattern (e.g., "*.ts", "src/**/*.tsx")',
      required: true,
    },
    path: {
      type: 'string',
      description: 'Directory to search in',
      default: '.',
    },
  },
  execute: async (params) => {
    try {
      const matches: string[] = []
      const patternParts = params.pattern.split('/')
      const hasRecursive = params.pattern.includes('**')

      async function searchDir(dirPath: string, depth: number = 0) {
        const entries = await listDirectory(dirPath)

        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry}`.replace(/\/+/g, '/')
          const info = await stat(fullPath)

          if (info.isDirectory) {
            if (hasRecursive || depth < patternParts.length - 1) {
              await searchDir(fullPath, depth + 1)
            }
          } else if (info.isFile) {
            if (matchGlob(entry, params.pattern)) {
              matches.push(fullPath)
            }
          }
        }
      }

      await searchDir(params.path)

      return {
        success: true,
        output: matches.join('\n') || 'No files found',
        metadata: { matches },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web for information',
  parameters: {
    query: {
      type: 'string',
      description: 'Search query',
      required: true,
    },
    num_results: {
      type: 'number',
      description: 'Number of results to return',
      default: 5,
    },
  },
  execute: async (params) => {
    try {
      // Use DuckDuckGo API (no API key needed)
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(params.query)}&format=json`
      )
      const data = await response.json()

      const results = data.Abstract
        ? [{ title: data.Heading, snippet: data.Abstract, url: data.AbstractURL }]
        : data.RelatedTopics?.slice(0, params.num_results).map((t: any) => ({
            title: t.Text?.split(' - ')[0] || '',
            snippet: t.Text || '',
            url: t.FirstURL || '',
          })) || []

      const output = results
        .map((r: any) => `${r.title}\n${r.snippet}\n${r.url}`)
        .join('\n\n')

      return {
        success: true,
        output: output || 'No results found',
        metadata: { results },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

function matchGlob(filename: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  const regex = new RegExp(`^${regexStr}$`)
  return regex.test(filename)
}
