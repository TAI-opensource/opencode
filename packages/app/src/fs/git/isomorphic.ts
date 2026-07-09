/**
 * Git operations using isomorphic-git in the browser
 * Uses LightningFS or OPFS for filesystem backend
 */

import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { getDirectory, readFile, writeFile, fileExists, listDirectory } from '../opfs'

let fsInitialized = false

/**
 * Initialize git filesystem
 */
async function initGitFs() {
  if (fsInitialized) return
  fsInitialized = true
  console.log('[Git] Filesystem initialized')
}

/**
 * Clone a repository
 */
export async function cloneRepository(
  url: string,
  dir: string,
  options?: {
    ref?: string
    singleBranch?: boolean
    depth?: number
    corsProxy?: string
    onProgress?: (progress: any) => void
  }
): Promise<void> {
  await initGitFs()

  const fs = createFsAdapter()
  const dirHandle = await getDirectory(dir, { create: true })

  await git.clone({
    fs,
    http,
    dir,
    url,
    ref: options?.ref,
    singleBranch: options?.singleBranch ?? true,
    depth: options?.depth,
    corsProxy: options?.corsProxy,
    onProgress: options?.onProgress
      ? (event) => {
          options.onProgress!(event)
        }
      : undefined,
  })

  console.log('[Git] Repository cloned to:', dir)
}

/**
 * Initialize a new repository
 */
export async function initRepository(dir: string): Promise<void> {
  await initGitFs()

  const fs = createFsAdapter()
  const dirHandle = await getDirectory(dir, { create: true })

  await git.init({ fs, dir })
  console.log('[Git] Repository initialized at:', dir)
}

/**
 * Stage files
 */
export async function addFiles(dir: string, filepath: string | string[]): Promise<void> {
  const fs = createFsAdapter()
  const files = Array.isArray(filepath) ? filepath : [filepath]

  for (const file of files) {
    await git.add({ fs, dir, filepath: file })
  }
}

/**
 * Remove files from staging
 */
export async function removeFiles(dir: string, filepath: string | string[]): Promise<void> {
  const fs = createFsAdapter()
  const files = Array.isArray(filepath) ? filepath : [filepath]

  for (const file of files) {
    await git.remove({ fs, dir, filepath: file })
  }
}

/**
 * Create a commit
 */
export async function commit(
  dir: string,
  message: string,
  options?: {
    author?: { name: string; email: string }
    committer?: { name: string; email: string }
  }
): Promise<string> {
  const fs = createFsAdapter()

  const sha = await git.commit({
    fs,
    dir,
    message,
    author: options?.author ?? {
      name: 'OpenCode Browser',
      email: 'opencode@browser.local',
    },
    committer: options?.committer ?? {
      name: 'OpenCode Browser',
      email: 'opencode@browser.local',
    },
  })

  console.log('[Git] Commit created:', sha)
  return sha
}

/**
 * Get current branch
 */
export async function getCurrentBranch(dir: string): Promise<string> {
  const fs = createFsAdapter()
  return git.currentBranch({ fs, dir }) ?? 'main'
}

/**
 * List branches
 */
export async function listBranches(dir: string): Promise<string[]> {
  const fs = createFsAdapter()
  return git.listBranches({ fs, dir })
}

/**
 * Create a branch
 */
export async function createBranch(dir: string, name: string): Promise<void> {
  const fs = createFsAdapter()
  await git.branch({ fs, dir, ref: name })
  console.log('[Git] Branch created:', name)
}

/**
 * Checkout a branch
 */
export async function checkout(dir: string, ref: string): Promise<void> {
  const fs = createFsAdapter()
  await git.checkout({ fs, dir, ref })
  console.log('[Git] Checked out:', ref)
}

/**
 * Get file status
 */
export async function getFileStatus(
  dir: string,
  filepath: string
): Promise<string> {
  const fs = createFsAdapter()
  return git.status({ fs, dir, filepath })
}

/**
 * Get all file statuses
 */
export async function getStatus(dir: string): Promise<Array<{
  path: string
  index: string
  workdir: string
  stage: string
}>> {
  const fs = createFsAdapter()
  const statusMatrix = await git.statusMatrix({ fs, dir })

  return statusMatrix.map(([filepath, HEAD, workdir, stage]) => ({
    path: filepath,
    HEAD: HEAD === 1 ? '1' : '0',
    workdir: workdir === 1 ? '1' : '0',
    stage: stage === 1 ? '1' : '0',
  }))
}

/**
 * Get log
 */
export async function getLog(
  dir: string,
  options?: {
    ref?: string
    depth?: number
    since?: Date
  }
): Promise<Array<{
  oid: string
  message: string
  author: { name: string; email: string; timestamp: number }
  committer: { name: string; email: string; timestamp: number }
}>> {
  const fs = createFsAdapter()
  const log = await git.log({
    fs,
    dir,
    ref: options?.ref,
    depth: options?.depth,
    since: options?.since,
  })

  return log.map((commit) => ({
    oid: commit.oid,
    message: commit.commit.message,
    author: commit.commit.author,
    committer: commit.commit.committer,
  }))
}

/**
 * Get diff for a file
 */
export async function getDiff(
  dir: string,
  filepath: string
): Promise<string> {
  const fs = createFsAdapter()

  try {
    const head = await git.show({
      fs,
      dir,
      oid: await git.resolveRef({ fs, dir, ref: 'HEAD' }),
      filepath,
    })

    const current = await readFile(`${dir}/${filepath}`)
    return `--- a/${filepath}\n+++ b/${filepath}\n${head}\n${current}`
  } catch {
    // File doesn't exist in HEAD, it's new
    const content = await readFile(`${dir}/${filepath}`)
    return `--- /dev/null\n+++ b/${filepath}\n+${content}`
  }
}

/**
 * Add remote
 */
export async function addRemote(
  dir: string,
  name: string,
  url: string
): Promise<void> {
  const fs = createFsAdapter()
  await git.addRemote({ fs, dir, remote: name, url })
  console.log('[Git] Remote added:', name, url)
}

/**
 * Remove remote
 */
export async function removeRemote(
  dir: string,
  name: string
): Promise<void> {
  const fs = createFsAdapter()
  await git.removeRemote({ fs, dir, remote: name })
  console.log('[Git] Remote removed:', name)
}

/**
 * Fetch from remote
 */
export async function fetchRemote(
  dir: string,
  remote: string = 'origin',
  options?: {
    ref?: string
    depth?: number
    corsProxy?: string
  }
): Promise<void> {
  const fs = createFsAdapter()

  await git.fetch({
    fs,
    http,
    dir,
    remote,
    ref: options?.ref,
    depth: options?.depth,
    corsProxy: options?.corsProxy,
  })

  console.log('[Git] Fetched from:', remote)
}

/**
 * Pull from remote
 */
export async function pull(
  dir: string,
  options?: {
    remote?: string
    ref?: string
    corsProxy?: string
  }
): Promise<void> {
  const fs = createFsAdapter()

  await git.pull({
    fs,
    http,
    dir,
    remote: options?.remote ?? 'origin',
    ref: options?.ref,
    corsProxy: options?.corsProxy,
  })

  console.log('[Git] Pulled from:', options?.remote ?? 'origin')
}

/**
 * Push to remote
 */
export async function push(
  dir: string,
  options?: {
    remote?: string
    ref?: string
    corsProxy?: string
    onProgress?: (progress: any) => void
  }
): Promise<void> {
  const fs = createFsAdapter()

  await git.push({
    fs,
    http,
    dir,
    remote: options?.remote ?? 'origin',
    ref: options?.ref,
    corsProxy: options?.corsProxy,
    onProgress: options?.onProgress
      ? (event) => {
          options.onProgress!(event)
        }
      : undefined,
  })

  console.log('[Git] Pushed to:', options?.remote ?? 'origin')
}

/**
 * Create filesystem adapter using OPFS
 */
function createFsAdapter() {
  return {
    readFile: async (path: string, options?: { encoding?: string }) => {
      const content = await readFile(path)
      if (options?.encoding === 'utf8') {
        return content
      }
      return new TextEncoder().encode(content).buffer
    },
    writeFile: async (path: string, data: string | Uint8Array) => {
      await writeFile(path, typeof data === 'string' ? data : new TextDecoder().decode(data))
    },
    unlink: async (path: string) => {
      const { deleteFile } = await import('../opfs')
      await deleteFile(path)
    },
    mkdir: async (path: string) => {
      const { createDirectory } = await import('../opfs')
      await createDirectory(path)
    },
    rmdir: async (path: string) => {
      const { deleteDirectory } = await import('../opfs')
      await deleteDirectory(path)
    },
    readdir: async (path: string) => {
      const { listDirectory } = await import('../opfs')
      return listDirectory(path)
    },
    stat: async (path: string) => {
      const { stat } = await import('../opfs')
      const s = await stat(path)
      return {
        isFile: () => s.isFile,
        isDirectory: () => s.isDirectory,
        size: s.size,
        mtimeMs: s.lastModified,
      }
    },
    lstat: async (path: string) => {
      return createFsAdapter().stat(path)
    },
    readlink: async (path: string) => {
      return path
    },
    symlink: async (target: string, path: string) => {
      // Symlinks not supported in OPFS
    },
    chmod: async (path: string, mode: number) => {
      // chmod not supported in OPFS
    },
  }
}
