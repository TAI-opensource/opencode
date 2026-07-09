/**
 * Git tools
 */

import {
  initRepository,
  addFiles,
  commit as gitCommit,
  getCurrentBranch,
  listBranches,
  createBranch,
  checkout,
  getStatus,
  getLog,
  getDiff,
  addRemote,
  fetchRemote,
  pull,
  push,
} from '../fs/git/isomorphic'
import type { ToolDefinition } from '../index'

export const gitInitTool: ToolDefinition = {
  name: 'git_init',
  description: 'Initialize a new git repository',
  parameters: {
    path: {
      type: 'string',
      description: 'Directory path',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      await initRepository(params.path)
      return {
        success: true,
        output: `Git repository initialized at: ${params.path}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitAddTool: ToolDefinition = {
  name: 'git_add',
  description: 'Stage files for commit',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    files: {
      type: 'string',
      description: 'Files to stage (comma-separated or "all")',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const files = params.files === 'all' ? ['.'] : params.files.split(',')
      await addFiles(params.path, files)
      return {
        success: true,
        output: `Staged files: ${files.join(', ')}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitCommitTool: ToolDefinition = {
  name: 'git_commit',
  description: 'Create a new commit',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    message: {
      type: 'string',
      description: 'Commit message',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const sha = await gitCommit(params.path, params.message)
      return {
        success: true,
        output: `Commit created: ${sha}`,
        metadata: { sha },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitStatusTool: ToolDefinition = {
  name: 'git_status',
  description: 'Get repository status',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const branch = await getCurrentBranch(params.path)
      const files = await getStatus(params.path)
      const statusText = files
        .map((f) => `${f.workdir === '1' ? 'M' : ' '}${f.stage === '1' ? 'S' : ' '} ${f.path}`)
        .join('\n')
      return {
        success: true,
        output: `Branch: ${branch}\n\n${statusText}`,
        metadata: { branch, files },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitLogTool: ToolDefinition = {
  name: 'git_log',
  description: 'View commit history',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    count: {
      type: 'number',
      description: 'Number of commits to show',
      default: 10,
    },
  },
  execute: async (params) => {
    try {
      const log = await getLog(params.path, { depth: params.count })
      const logText = log
        .map((c) => `${c.oid.slice(0, 7)} ${c.message}`)
        .join('\n')
      return {
        success: true,
        output: logText,
        metadata: { log },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitBranchTool: ToolDefinition = {
  name: 'git_branch',
  description: 'List or create branches',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    name: {
      type: 'string',
      description: 'Branch name to create (optional)',
    },
  },
  execute: async (params) => {
    try {
      if (params.name) {
        await createBranch(params.path, params.name)
        return {
          success: true,
          output: `Branch created: ${params.name}`,
        }
      } else {
        const branches = await listBranches(params.path)
        return {
          success: true,
          output: branches.join('\n'),
          metadata: { branches },
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitCheckoutTool: ToolDefinition = {
  name: 'git_checkout',
  description: 'Switch branches or restore files',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    branch: {
      type: 'string',
      description: 'Branch name',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      await checkout(params.path, params.branch)
      return {
        success: true,
        output: `Switched to branch: ${params.branch}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitDiffTool: ToolDefinition = {
  name: 'git_diff',
  description: 'Show file changes',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    file: {
      type: 'string',
      description: 'File to diff',
      required: true,
    },
  },
  execute: async (params) => {
    try {
      const diff = await getDiff(params.path, params.file)
      return {
        success: true,
        output: diff,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitPushTool: ToolDefinition = {
  name: 'git_push',
  description: 'Push to remote repository',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    remote: {
      type: 'string',
      description: 'Remote name',
      default: 'origin',
    },
  },
  execute: async (params) => {
    try {
      await push(params.path, { remote: params.remote })
      return {
        success: true,
        output: `Pushed to ${params.remote}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}

export const gitPullTool: ToolDefinition = {
  name: 'git_pull',
  description: 'Pull from remote repository',
  parameters: {
    path: {
      type: 'string',
      description: 'Repository path',
      required: true,
    },
    remote: {
      type: 'string',
      description: 'Remote name',
      default: 'origin',
    },
  },
  execute: async (params) => {
    try {
      await pull(params.path, { remote: params.remote })
      return {
        success: true,
        output: `Pulled from ${params.remote}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}
