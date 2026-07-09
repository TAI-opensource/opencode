/**
 * GitHub synchronization using Octokit.js
 * Provides commit, push, pull operations via GitHub API
 */

import { Octokit } from '@octokit/rest'

let octokitInstance: Octokit | null = null
let currentToken: string | null = null

/**
 * Initialize GitHub client with token
 */
export function initGitHub(token: string): Octokit {
  if (octokitInstance && currentToken === token) {
    return octokitInstance
  }

  currentToken = token
  octokitInstance = new Octokit({ auth: token })
  console.log('[GitHub] Client initialized')
  return octokitInstance
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{
  login: string
  name: string | null
  email: string | null
  avatar_url: string
} | null> {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.users.getAuthenticated()
    return {
      login: data.login,
      name: data.name,
      email: data.email,
      avatar_url: data.avatar_url,
    }
  } catch (error) {
    console.error('[GitHub] Failed to get user:', error)
    return null
  }
}

/**
 * List user repositories
 */
export async function listRepositories(options?: {
  type?: 'all' | 'owner' | 'public' | 'private' | 'member'
  sort?: 'created' | 'updated' | 'pushed' | 'full_name'
  direction?: 'asc' | 'desc'
  per_page?: number
}): Promise<Array<{
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
  updated_at: string
}>> {
  const octokit = getOctokit()
  const { data } = await octokit.repos.listForAuthenticatedUser({
    type: options?.type ?? 'owner',
    sort: options?.sort ?? 'updated',
    direction: options?.direction ?? 'desc',
    per_page: options?.per_page ?? 30,
  })

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private ?? false,
    html_url: repo.html_url,
    description: repo.description,
    default_branch: repo.default_branch ?? 'main',
    updated_at: repo.updated_at ?? '',
  }))
}

/**
 * Create a new repository
 */
export async function createRepository(
  name: string,
  options?: {
    description?: string
    private?: boolean
    auto_init?: boolean
    gitignore_template?: string
    license_template?: string
  }
): Promise<{
  id: number
  name: string
  full_name: string
  html_url: string
  clone_url: string
  ssh_url: string
}> {
  const octokit = getOctokit()
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description: options?.description,
    private: options?.private ?? false,
    auto_init: options?.auto_init ?? true,
    gitignore_template: options?.gitignore_template,
    license_template: options?.license_template,
  })

  console.log('[GitHub] Repository created:', data.full_name)
  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    html_url: data.html_url,
    clone_url: data.clone_url,
    ssh_url: data.ssh_url,
  }
}

/**
 * Get repository
 */
export async function getRepository(
  owner: string,
  repo: string
): Promise<{
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
  clone_url: string
  ssh_url: string
} | null> {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.repos.get({ owner, repo })

    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      private: data.private ?? false,
      html_url: data.html_url,
      description: data.description,
      default_branch: data.default_branch ?? 'main',
      clone_url: data.clone_url,
      ssh_url: data.ssh_url,
    }
  } catch (error) {
    console.error('[GitHub] Failed to get repository:', error)
    return null
  }
}

/**
 * Create a commit via GitHub API
 */
export async function createCommit(
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: Array<{
    path: string
    content: string
  }>,
  options?: {
    author?: { name: string; email: string }
  }
): Promise<{
  sha: string
  message: string
}> {
  const octokit = getOctokit()

  // Get current commit SHA
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })

  const currentCommitSha = ref.object.sha

  // Get current commit
  const { data: currentCommit } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  })

  // Create blobs for each file
  const treeItems: Array<{
    path: string
    mode: '100644' | '100755' | '040000' | '120000' | '160000'
    type: 'blob' | 'tree' | 'commit'
    content?: string
    sha?: string
  }> = []

  for (const file of files) {
    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content: file.content,
      encoding: 'utf-8',
    })

    treeItems.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    })
  }

  // Create tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentCommit.tree.sha,
    tree: treeItems,
  })

  // Create commit
  const author = options?.author ?? {
    name: 'OpenCode Browser',
    email: 'opencode@browser.local',
  }

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: [currentCommitSha],
    author,
    committer: author,
  })

  // Update reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  })

  console.log('[GitHub] Commit created:', newCommit.sha)
  return {
    sha: newCommit.sha,
    message: newCommit.commit.message,
  }
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  options: {
    title: string
    body?: string
    head: string
    base: string
    draft?: boolean
  }
): Promise<{
  number: number
  html_url: string
  title: string
} | null> {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
      draft: options.draft ?? false,
    })

    console.log('[GitHub] Pull request created:', data.number)
    return {
      number: data.number,
      html_url: data.html_url,
      title: data.title,
    }
  } catch (error) {
    console.error('[GitHub] Failed to create pull request:', error)
    return null
  }
}

/**
 * List pull requests
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all'
    per_page?: number
  }
): Promise<Array<{
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  created_at: string
  updated_at: string
}>> {
  const octokit = getOctokit()
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: options?.state ?? 'open',
    per_page: options?.per_page ?? 30,
  })

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state as 'open' | 'closed',
    html_url: pr.html_url,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
  }))
}

/**
 * Get file content
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{
  content: string
  sha: string
  size: number
} | null> {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    })

    if ('content' in data && typeof data.content === 'string') {
      return {
        content: atob(data.content),
        sha: data.sha,
        size: data.size,
      }
    }

    return null
  } catch (error) {
    console.error('[GitHub] Failed to get file content:', error)
    return null
  }
}

/**
 * List repository files
 */
export async function listFiles(
  owner: string,
  repo: string,
  path?: string,
  ref?: string
): Promise<Array<{
  name: string
  path: string
  type: 'file' | 'dir'
  size: number
  sha: string
}>> {
  const octokit = getOctokit()
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: path ?? '',
    ref,
  })

  if (Array.isArray(data)) {
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as 'file' | 'dir',
      size: item.size ?? 0,
      sha: item.sha,
    }))
  }

  return []
}

/**
 * Get Octokit instance
 */
function getOctokit(): Octokit {
  if (!octokitInstance) {
    throw new Error('[GitHub] Client not initialized. Call initGitHub() first.')
  }
  return octokitInstance
}

/**
 * Get authenticated user info
 */
export async function getAuthInfo(): Promise<{
  login: string
  id: number
  name: string | null
  email: string | null
} | null> {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.users.getAuthenticated()
    return {
      login: data.login,
      id: data.id,
      name: data.name,
      email: data.email,
    }
  } catch (error) {
    console.error('[GitHub] Failed to get auth info:', error)
    return null
  }
}
