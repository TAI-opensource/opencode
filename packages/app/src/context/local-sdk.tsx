/**
 * Local SDK Context - Browser-based SDK that replaces server-sdk.tsx
 * Uses OPFS, SQLite WASM, isomorphic-git, and direct LLM API calls
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { type Accessor, batch, createMemo, onCleanup, onMount, createSignal } from "solid-js"
import { initLocalSDK, cleanup as cleanupSDK, sendChatMessage, executeTool, getSessionHistory, createSession, addMessage } from "@/local-sdk"
import { useLanguage } from "./language"
import { usePlatform } from "./platform"
import { ConfigRepository, SessionRepository, MessageRepository, PartRepository } from "@/db"
import { llmEngine, saveProviderConfigs, type LLMConfig } from "@/llm"
import { toolRegistry } from "@/tools"

type LocalEvent = {
  type: string
  properties: Record<string, any>
}

type LocalSDKEventMap = {
  [key in LocalEvent["type"]]: Extract<LocalEvent, { type: key }>
}

function createLocalSDKContextBase() {
  const platform = usePlatform()
  const emitter = createGlobalEmitter<LocalSDKEventMap>()
  const [initialized, setInitialized] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  // Initialize the local SDK
  onMount(async () => {
    try {
      await initLocalSDK()
      setInitialized(true)
      console.log("[LocalSDK] Context initialized")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.error("[LocalSDK] Initialization failed:", err)
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    cleanupSDK()
  })

  // Provider management
  function registerProvider(name: string, config: LLMConfig) {
    llmEngine.registerProvider(name, config)
    saveProviderConfigs()
    emitter.emit("provider.registered", { properties: { name } })
  }

  function removeProvider(name: string) {
    llmEngine.removeProvider(name)
    saveProviderConfigs()
    emitter.emit("provider.removed", { properties: { name } })
  }

  function getProviders() {
    return llmEngine.getProviders()
  }

  // Chat functions
  async function chat(options: {
    provider: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    model?: string
    temperature?: number
    maxTokens?: number
    onChunk?: (chunk: string) => void
  }): Promise<string> {
    return sendChatMessage(options.provider, options.messages, {
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      onChunk: options.onChunk,
    })
  }

  // Tool execution
  async function executeToolCall(toolName: string, params: Record<string, any>) {
    return executeTool(toolName, params)
  }

  function getTools() {
    return toolRegistry.getDefinitions()
  }

  // Session management
  function createNewSession(params: {
    title: string
    projectId: string
    directory: string
    agent?: string
    modelId?: string
  }) {
    const session = createSession(params)
    emitter.emit("session.created", { properties: { sessionId: session.id } })
    return session
  }

  function getSession(sessionId: string) {
    return getSessionHistory(sessionId)
  }

  function addMessageToSession(params: {
    sessionId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    parentId?: string
  }) {
    const message = addMessage(params)
    emitter.emit("message.created", { properties: { sessionId: params.sessionId, messageId: message.id } })
    return message
  }

  // File operations (delegated to tools)
  async function readFile(path: string) {
    return executeTool("read_file", { path })
  }

  async function writeFile(path: string, content: string) {
    return executeTool("write_file", { path, content })
  }

  async function editFile(path: string, oldString: string, newString: string) {
    return executeTool("edit_file", { path, old_string: oldString, new_string: newString })
  }

  // Git operations (delegated to tools)
  async function gitStatus(path: string) {
    return executeTool("git_status", { path })
  }

  async function gitCommit(path: string, message: string) {
    return executeTool("git_commit", { path, message })
  }

  async function gitPush(path: string, remote?: string) {
    return executeTool("git_push", { path, remote: remote ?? "origin" })
  }

  async function gitPull(path: string, remote?: string) {
    return executeTool("git_pull", { path, remote: remote ?? "origin" })
  }

  return {
    initialized,
    error,
    emitter,
    registerProvider,
    removeProvider,
    getProviders,
    chat,
    executeToolCall,
    getTools,
    createNewSession,
    getSession,
    addMessageToSession,
    readFile,
    writeFile,
    editFile,
    gitStatus,
    gitCommit,
    gitPush,
    gitPull,
  }
}

type LocalSDKBase = ReturnType<typeof createLocalSDKContextBase>

export const { use: useLocalSDK, provider: LocalSDKProvider } = createSimpleContext({
  name: "LocalSDK",
  init: () => {
    return createLocalSDKContextBase()
  },
})

export type { LocalSDKBase }
