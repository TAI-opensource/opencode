/**
 * Local SDK - Browser-based SDK that replaces server-sdk.tsx
 * Uses OPFS, SQLite WASM, isomorphic-git, and direct LLM API calls
 */

import { initDatabase, closeDatabase } from './db'
import { initLLMEngine, saveProviderConfigs, type LLMConfig } from './llm'
import { toolRegistry } from './tools'
import { readFileTool, writeFileTool, editFileTool, deleteFileTool, fileExistsTool, listDirectoryTool, statFileTool } from './tools/filesystem'
import { gitInitTool, gitAddTool, gitCommitTool, gitStatusTool, gitLogTool, gitBranchTool, gitCheckoutTool, gitDiffTool, gitPushTool, gitPullTool } from './tools/git'
import { grepTool, findFilesTool, webSearchTool } from './tools/search'
import { analyzeCodeTool, formatCodeTool, countLinesTool } from './tools/code'
import { SessionRepository, MessageRepository, PartRepository, ProjectRepository } from './db'

/**
 * Initialize the local SDK
 */
export async function initLocalSDK(): Promise<void> {
  console.log('[LocalSDK] Initializing...')

  // Initialize database
  await initDatabase()
  console.log('[LocalSDK] Database initialized')

  // Initialize LLM engine
  await initLLMEngine()
  console.log('[LocalSDK] LLM engine initialized')

  // Register tools
  registerTools()
  console.log('[LocalSDK] Tools registered')

  console.log('[LocalSDK] Initialization complete')
}

/**
 * Register all tools
 */
function registerTools(): void {
  // File system tools
  toolRegistry.register(readFileTool)
  toolRegistry.register(writeFileTool)
  toolRegistry.register(editFileTool)
  toolRegistry.register(deleteFileTool)
  toolRegistry.register(fileExistsTool)
  toolRegistry.register(listDirectoryTool)
  toolRegistry.register(statFileTool)

  // Git tools
  toolRegistry.register(gitInitTool)
  toolRegistry.register(gitAddTool)
  toolRegistry.register(gitCommitTool)
  toolRegistry.register(gitStatusTool)
  toolRegistry.register(gitLogTool)
  toolRegistry.register(gitBranchTool)
  toolRegistry.register(gitCheckoutTool)
  toolRegistry.register(gitDiffTool)
  toolRegistry.register(gitPushTool)
  toolRegistry.register(gitPullTool)

  // Search tools
  toolRegistry.register(grepTool)
  toolRegistry.register(findFilesTool)
  toolRegistry.register(webSearchTool)

  // Code tools
  toolRegistry.register(analyzeCodeTool)
  toolRegistry.register(formatCodeTool)
  toolRegistry.register(countLinesTool)
}

/**
 * Configure LLM provider
 */
export function configureProvider(name: string, config: LLMConfig): void {
  const { llmEngine } = require('./llm')
  llmEngine.registerProvider(name, config)
  saveProviderConfigs()
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  provider: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    onChunk?: (chunk: string) => void
  }
): Promise<string> {
  const { llmEngine } = require('./llm')

  if (options?.onChunk) {
    let fullContent = ''
    for await (const event of llmEngine.chatStream(provider, {
      messages,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    })) {
      if (event.type === 'delta' && event.content) {
        fullContent += event.content
        options.onChunk(event.content)
      }
    }
    return fullContent
  }

  const response = await llmEngine.chat(provider, {
    messages,
    model: options?.model,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  })
  return response.content
}

/**
 * Execute a tool
 */
export async function executeTool(
  toolName: string,
  params: Record<string, any>
): Promise<{ success: boolean; output?: string; error?: string }> {
  return toolRegistry.execute(toolName, params, {
    工作目录: '/',
    文件系统: null,
    Git: null,
    LLM: null,
  })
}

/**
 * Get session history
 */
export function getSessionHistory(sessionId: string) {
  const session = SessionRepository.findById(sessionId)
  if (!session) return null

  const messages = MessageRepository.findBySession(sessionId)
  const messagesWithParts = messages.map((msg) => ({
    ...msg,
    parts: PartRepository.findByMessage(msg.id),
  }))

  return {
    session,
    messages: messagesWithParts,
  }
}

/**
 * Create a new session
 */
export function createSession(params: {
  title: string
  projectId: string
  directory: string
  agent?: string
  modelId?: string
}) {
  const now = Date.now()
  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return SessionRepository.create({
    id: crypto.randomUUID(),
    slug,
    project_id: params.projectId,
    directory: params.directory,
    title: params.title,
    agent: params.agent,
    model_id: params.modelId,
    time_created: now,
    time_updated: now,
  })
}

/**
 * Add message to session
 */
export function addMessage(params: {
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parentId?: string
}) {
  const now = Date.now()

  const message = MessageRepository.create({
    id: crypto.randomUUID(),
    session_id: params.sessionId,
    role: params.role,
    parent_id: params.parentId,
    time: now,
  })

  // Add text part
  PartRepository.create({
    id: crypto.randomUUID(),
    session_id: params.sessionId,
    message_id: message.id,
    type: 'text',
    data: JSON.stringify({ content: params.content }),
    time: now,
  })

  return message
}

/**
 * Cleanup
 */
export async function cleanup(): Promise<void> {
  await closeDatabase()
  console.log('[LocalSDK] Cleanup complete')
}
