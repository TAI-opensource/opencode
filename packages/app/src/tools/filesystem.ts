/**
 * File system tools
 */

import { readFile, writeFile, deleteFile, fileExists, listDirectory, stat } from '../fs/opfs'
import type { ToolDefinition } from '../index'

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: 'Read the contents of a file',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to read',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const content = await readFile(params.path)
      return {
        success: true,
        output: content,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const writeFileTool: ToolDefinition = {
  name: 'write_file',
  description: 'Write content to a file',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to write',
      required: true,
    },
    content: {
      type: 'string',
      description: 'Content to write to the file',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      await writeFile(params.path, params.content)
      return {
        success: true,
        output: `File written: ${params.path}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const editFileTool: ToolDefinition = {
  name: 'edit_file',
  description: 'Edit a file by replacing content',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to edit',
      required: true,
    },
    old_string: {
      type: 'string',
      description: 'String to replace',
      required: true,
    },
    new_string: {
      type: 'string',
      description: 'Replacement string',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const content = await readFile(params.path)
      if (!content.includes(params.old_string)) {
        return {
          success: false,
          error: 'Old string not found in file',
        }
      }
      const newContent = content.replace(params.old_string, params.new_string)
      await writeFile(params.path, newContent)
      return {
        success: true,
        output: `File edited: ${params.path}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const deleteFileTool: ToolDefinition = {
  name: 'delete_file',
  description: 'Delete a file',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the file to delete',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      await deleteFile(params.path)
      return {
        success: true,
        output: `File deleted: ${params.path}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const fileExistsTool: ToolDefinition = {
  name: 'file_exists',
  description: 'Check if a file exists',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to check',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const exists = await fileExists(params.path)
      return {
        success: true,
        output: exists ? 'File exists' : 'File does not exist',
        metadata: { exists },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const listDirectoryTool: ToolDefinition = {
  name: 'list_directory',
  description: 'List files in a directory',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to the directory',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const entries = await listDirectory(params.path)
      return {
        success: true,
        output: entries.join('\n'),
        metadata: { entries },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const statFileTool: ToolDefinition = {
  name: 'stat_file',
  description: 'Get file/directory metadata',
  parameters: {
    path: {
      type: 'string',
      description: 'Path to check',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const info = await stat(params.path)
      return {
        success: true,
        output: JSON.stringify(info, null, 2),
        metadata: info,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}
