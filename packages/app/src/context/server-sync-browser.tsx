/**
 * Browser-only Server Sync context mock
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { type Accessor, createMemo, createSignal } from "solid-js"
import { useServer, type ServerConnection } from "./server-browser"

function createBrowserSyncContext() {
  const server = useServer()
  const emitter = createGlobalEmitter<Record<string, any>>()
  const [connected, setConnected] = createSignal(true)

  return {
    connected,
    error: () => null,
    on: (event: string, callback: (data: any) => void) => {
      return emitter.on(event, callback)
    },
    session: {
      id: undefined,
      directory: undefined,
      lineage: undefined,
    },
  }
}

export type ServerSync = ReturnType<typeof createBrowserSyncContext>

export const { use: useServerSync, provider: ServerSyncProvider } = createSimpleContext({
  name: "ServerSync",
  init: () => {
    return createBrowserSyncContext()
  },
})
