/**
 * Browser-only Server context mock
 * Provides minimal server context for browser-only mode
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { type Accessor, createMemo, createSignal } from "solid-js"

export namespace ServerConnection {
  export type Key = string
  export type Http = {
    type: "http"
    authToken?: { authorization: string }
    http: { url: string }
    displayName?: string
  }
  export type HttpBase = { url: string }
  export type Any = Http | { type: string }

  export function key(conn: Any | undefined): Key {
    if (!conn) return "browser"
    if ("http" in conn) return conn.http.url
    return "browser"
  }

  export function local(conn: Any | undefined): boolean {
    return true
  }
}

export function serverName(conn?: ServerConnection.Any, ignoreDisplayName = false) {
  return "Browser"
}

const mockServer: ServerConnection.Http = {
  type: "http",
  http: { url: "browser-only" },
  displayName: "Browser",
}

function createBrowserServerContext() {
  const [active, setActive] = createSignal<ServerConnection.Key>("browser")

  const current = createMemo((): ServerConnection.Any => mockServer)

  return {
    ready: createMemo(() => true),
    isLocal: createMemo(() => true),
    get key() {
      return active()
    },
    get name() {
      return "Browser"
    },
    get list() {
      return [mockServer]
    },
    get current() {
      return current()
    },
    setActive: (key: ServerConnection.Key) => {
      setActive(key)
    },
    add: (_conn: ServerConnection.Http) => _conn,
    remove: (_key: ServerConnection.Key) => {},
    scope: () => ({
      serverKey: "browser",
      directory: undefined,
    }),
    projects: {
      list: () => [],
      add: () => {},
      remove: () => {},
      rename: () => {},
      setExpanded: () => {},
      lastProject: () => undefined,
      setLastProject: () => {},
      recentlyClosed: () => [],
      addRecentlyClosed: () => {},
      removeRecentlyClosed: () => {},
      forServer: () => ({
        list: () => [],
        add: () => {},
        remove: () => {},
      }),
    },
  }
}

export const { use: useServer, provider: ServerProvider } = createSimpleContext({
  name: "Server",
  init: () => {
    return createBrowserServerContext()
  },
})
