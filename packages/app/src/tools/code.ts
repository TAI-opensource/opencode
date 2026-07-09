/**
 * Code analysis tools
 */

import { readFile } from '../fs/opfs'
import type { ToolDefinition } from '../index'

export const analyzeCodeTool: ToolDefinition = {
  name: 'analyze_code',
  description: 'Analyze code for issues, complexity, and suggestions',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to analyze',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const content = await readFile(params.path)
      const lines = content.split('\n')
      const issues: Array<{
        line: number
        type: 'error' | 'warning' | 'info'
        message: string
      }> = []

      // Basic analysis
      lines.forEach((line, i) => {
        const lineNum = i + 1

        // Check for console.log in production
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
          issues.push({
            line: lineNum,
            type: 'warning',
            message: 'Consider removing console.log in production',
          })
        }

        // Check for TODO/FIXME
        if (line.includes('TODO') || line.includes('FIXME')) {
          issues.push({
            line: lineNum,
            type: 'info',
            message: 'Contains TODO/FIXME comment',
          })
        }

        // Check for var usage
        if (line.match(/\bvar\s+/)) {
          issues.push({
            line: lineNum,
            type: 'warning',
            message: 'Consider using const/let instead of var',
          })
        }

        // Check for long lines
        if (line.length > 120) {
          issues.push({
            line: lineNum,
            type: 'info',
            message: `Line exceeds 120 characters (${line.length})`,
          })
        }

        // Check for empty catch blocks
        if (line.match(/catch\s*\([^)]*\)\s*\{\s*\}/)) {
          issues.push({
            line: lineNum,
            type: 'warning',
            message: 'Empty catch block - consider handling the error',
          })
        }
      })

      const output = issues
        .map((i) => `${i.line}: [${i.type}] ${i.message}`)
        .join('\n')

      return {
        success: true,
        output: output || 'No issues found',
        metadata: { issues, lineCount: lines.length },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const formatCodeTool: ToolDefinition = {
  name: 'format_code',
  description: 'Format code (basic formatting)',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to format',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const content = await readFile(params.path)

      // Basic formatting
      const formatted = content
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')

      return {
        success: true,
        output: formatted,
        metadata: { formatted: true },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const countLinesTool: ToolDefinition = {
  name: 'count_lines',
  description: 'Count lines of code',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file or directory',
      required: true,
    },
    recursive: {
      type: 'boolean',
      description: 'Count recursively in subdirectories',
      default: false,
    },
  },
  execute: async (params) => {
    try {
      const content = await readFile(params.path)
      const lines = content.split('\n')
      const total = lines.length
      const blank = lines.filter((l) => l.trim() === '').length
      const code = total - blank

      const output = `Total lines: ${total}\nCode lines: ${code}\nBlank lines: ${blank}`

      return {
        success: true,
        output,
        metadata: { total, code, blank },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}
