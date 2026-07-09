import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { ServerConnection, useServer } from "@/context/server"
import { QueryClient } from "@tanstack/solid-query"

const BROWSER_KEY = ServerConnection.Key.make("browser")
const BROWSER_SERVER: ServerConnection.Http = {
  type: "http",
  http: { url: "browser-only" },
  displayName: "Browser",
}

const noopProjects = {
  list: () => [],
  recentlyClosed: () => [],
  remove: () => {},
  open: () => {},
  close: () => {},
  expand: () => {},
  collapse: () => {},
  move: () => {},
  last: () => undefined,
  touch: () => {},
  addRecentlyClosed: () => {},
  removeRecentlyClosed: () => {},
}

function createBrowserServerCtx() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  })

  const emptyEmitter = {
    on: () => () => {},
    listen: () => () => {},
    start: () => {},
  }

  const sdk = {
    server: BROWSER_SERVER,
    scope: "browser-only" as any,
    url: "browser-only",
    client: {} as any,
    event: emptyEmitter,
    createClient: () => sdk as any,
    ensureDirSdkContext: createBrowserDirSdkContext,
  }

  const [childStore] = createStore({
    session: [] as any[],
    project: undefined as string | undefined,
    icon: undefined as string | undefined,
    limit: 20,
    status: "ready" as string,
    path: { directory: "/", worktree: "/", home: "/", state: "/", config: "/" },
    mcp: {} as Record<string, any>,
    command: [] as any[],
    provider: { all: new Map(), connected: [] as any[], default: {} },
    config: {} as any,
  })

  const setChildStore = (() => {}) as any

  const sync = {
    data: {
      ready: true,
      path: { home: "/", directory: "/", worktree: "/", state: "/", config: "/" },
      project: [] as any[],
      provider: { all: new Map(), connected: [] as any[], default: {} },
      config: {},
      reload: undefined as undefined | "pending" | "complete",
    },
    set: (() => {}) as any,
    get ready() {
      return true
    },
    get error() {
      return undefined
    },
    child: (_dir: string, _opts?: any) => [childStore, setChildStore] as const,
    peek: (_dir: string) => [childStore, setChildStore] as const,
    disableMcp: () => {},
    queryOptions: {
      globalConfig: () => ({ queryKey: ["browser", "globalConfig"] as const, queryFn: async () => ({}) }),
      projects: () => ({ queryKey: ["browser", "projects"] as const, queryFn: async () => [] }),
      providers: () => ({ queryKey: ["browser", null, "providers"] as const, queryFn: async () => ({ all: new Map(), connected: [], default: {} }) }),
      path: () => ({ queryKey: ["browser", null, "path"] as const, queryFn: async () => ({ home: "/", directory: "/", worktree: "/", state: "/", config: "/" }) }),
      agents: () => ({ queryKey: ["browser", "agents"] as const, queryFn: async () => [] }),
      references: () => ({ queryKey: ["browser", "references"] as const, queryFn: async () => [] }),
      mcp: () => ({ queryKey: ["browser", "mcp"] as const, queryFn: async () => ({}) }),
      mcpResources: () => ({ queryKey: ["browser", "mcpResources"] as const, queryFn: async () => ({}) }),
      lsp: () => ({ queryKey: ["browser", "lsp"] as const, queryFn: async () => [] }),
      sessions: () => ({ queryKey: ["browser", "sessions"] as const }),
    },
    updateConfig: async () => {},
    project: {
      loadSessions: async () => {},
      meta: () => {},
      icon: () => {},
    },
    session: {
      data: {
        permission: [] as any[],
        session_status: {} as Record<string, any>,
        session_working: () => false,
        message: {} as Record<string, any[]>,
        part: {} as Record<string, any[]>,
      },
      set: (() => {}) as any,
      get: () => undefined,
      peek: () => undefined,
      remember: () => {},
      resolve: async () => undefined as any,
      sync: async () => {},
      prefetch: () => {},
      shouldPrefetch: () => false,
      fresh: () => true,
      evict: () => {},
      pin: () => {},
      unpin: () => {},
      diff: async () => undefined,
      todo: async () => undefined,
      history: {
        more: () => false,
        loading: () => false,
        loadMore: async () => {},
      },
      optimistic: {
        add: () => {},
        remove: () => {},
      },
      lineage: undefined,
    },
    mcp: { toggle: async () => {} },
    ensureDirSyncContext: createBrowserDirSyncContext,
  }

  return {
    queryClient,
    sdk,
    sync,
    isLocal: true as const,
    projects: noopProjects,
  }
}

function createBrowserDirSdkContext(directory: string) {
  return {
    scope: "browser-only" as any,
    directory,
    client: {} as any,
    event: { on: () => () => {}, emit: () => {} },
    get url() {
      return "browser-only"
    },
    createClient: () => ({}) as any,
  }
}

function createBrowserDirSyncContext(directory: string) {
  const [childStore] = createStore({
    session: [] as any[],
    project: undefined as string | undefined,
    icon: undefined as string | undefined,
    limit: 20,
    status: "ready" as string,
    path: { directory, worktree: directory, home: "/", state: "/", config: "/" },
    mcp: {} as Record<string, any>,
    command: [] as any[],
    provider: { all: new Map(), connected: [] as any[], default: {} },
    config: {} as any,
  })

  return {
    data: new Proxy({} as any, {
      get(_target, prop) {
        if (prop === "session_working") return () => false
        return (childStore as any)[prop]
      },
    }),
    set: (() => {}) as any,
    get status() {
      return childStore.status
    },
    get ready() {
      return true
    },
    get project() {
      return undefined
    },
    session: {
      remember: () => {},
      get: () => undefined,
      optimistic: { add: () => {}, remove: () => {} },
      addOptimisticMessage: () => {},
      sync: async () => {},
      diff: async () => undefined,
      todo: async () => undefined,
      history: { more: () => false, loading: () => false, loadMore: async () => {} },
      evict: () => {},
      fetch: async () => {},
      more: { current: false } as any,
      archive: async () => {},
    },
    mcp: { toggle: async () => {} },
    absolute: (path: string) => path,
    get directory() {
      return directory
    },
  }
}

export const { use: useGlobal, provider: BrowserGlobalProvider } = createSimpleContext({
  name: "Global",
  init: () => {
    const serverCtx = createBrowserServerCtx()

    return {
      servers: {
        list: () => [BROWSER_SERVER] as ServerConnection.Any[],
        health: { [BROWSER_KEY]: { healthy: true, version: "browser" } } as Record<string, { healthy: boolean; version?: string }>,
      },
      settings: {
        server: {
          get key() {
            return BROWSER_KEY
          },
          selected: () => BROWSER_SERVER,
          set: (_key: ServerConnection.Key) => {},
        },
      },
      ensureServerCtx(_conn: ServerConnection.Any) {
        return serverCtx
      },
    }
  },
})
