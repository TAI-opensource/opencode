import { createSimpleContext } from "@opencode-ai/ui/context"
import { createEffect, createMemo, createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createServerProjects, RECENTLY_CLOSED_DISPLAY_LIMIT, ServerConnection, useServer } from "./server"
import { pathKey } from "@/utils/path-key"
import { useServerHealth } from "@/utils/server-health"
import { createServerSdkContext } from "./server-sdk"
import { createServerSyncContext } from "./server-sync"
import { getOwner } from "solid-js/web"
import { QueryClient } from "@tanstack/solid-query"
import type { ServerScope } from "@/utils/server-scope"

export const { use: _useGlobalOriginal, provider: GlobalProvider } = createSimpleContext({
  name: "Global",
  init: () => {
    const server = useServer()
    const serverHealth = useServerHealth(
      () => server.list,
      () => true,
    )
    const [store, setStore] = createStore({
      settings: {
        serverKey: undefined as ServerConnection.Key | undefined,
      },
    })

    const settingsServer = createMemo(() => {
      const list = server.list
      return list.find((conn) => ServerConnection.key(conn) === store.settings.serverKey) ?? list[0]
    })

    createEffect(() => {
      const conn = settingsServer()
      const key = conn ? ServerConnection.key(conn) : undefined
      if (store.settings.serverKey !== key) setStore("settings", "serverKey", key)
    })

    const serverCtxs = new Map<
      ServerConnection.Key,
      { dispose: () => void; serverCtx: ReturnType<typeof createServerCtx> }
    >()

    const owner = getOwner()

    const ensureServerCtx = (conn: ServerConnection.Any) => {
      const key = ServerConnection.key(conn)
      const existing = serverCtxs.get(key)
      if (existing) return existing.serverCtx
      const root = createRoot((dispose) => {
        const serverCtx = createServerCtx(conn, server.scope(key), server.projects.forServer(key))
        return { dispose, serverCtx }
      }, owner as any)
      serverCtxs.set(key, root)
      return root.serverCtx
    }

    createMemo(() => {
      for (const conn of server.list) {
        ensureServerCtx(conn)
      }
    })

    createEffect(() => {
      for (const [key] of serverCtxs) {
        if (!server.list.find((conn) => ServerConnection.key(conn) === key)) {
          const { dispose } = serverCtxs.get(key)!
          dispose()
          serverCtxs.delete(key)
        }
      }
    })

    return {
      servers: {
        list: () => server.list,
        health: serverHealth,
      },
      settings: {
        server: {
          get key() {
            return store.settings.serverKey
          },
          selected: settingsServer,
          set(key: ServerConnection.Key) {
            if (store.settings.serverKey !== key) setStore("settings", "serverKey", key)
          },
        },
      },
      ensureServerCtx(conn: ServerConnection.Any) {
        return ensureServerCtx(conn)
      },
    }
  },
})

// Browser-only fallback when the real Global context is not available
function createBrowserFallbackGlobal() {
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

  const emptyEmitter = { on: () => () => {}, listen: () => () => {}, start: async () => {} }

  const sdk = {
    server: BROWSER_SERVER,
    scope: "browser-only" as any,
    url: "browser-only",
    client: {} as any,
    event: emptyEmitter,
    createClient: () => sdk as any,
    ensureDirSdkContext: (directory: string) => ({
      scope: "browser-only" as any,
      directory,
      client: {} as any,
      event: { on: () => () => {}, emit: () => {} },
      get url() { return "browser-only" },
      createClient: () => ({}) as any,
    }),
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

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { refetchOnReconnect: false, refetchOnMount: false, refetchOnWindowFocus: false },
    },
  })

  const sync = {
    data: { ready: true, path: { home: "/", directory: "/", worktree: "/", state: "/", config: "/" }, project: [] as any[], provider: { all: new Map(), connected: [] as any[], default: {} }, config: {}, reload: undefined },
    set: (() => {}) as any,
    get ready() { return true },
    get error() { return undefined },
    child: (_dir: string) => [childStore, setChildStore] as const,
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
    project: { loadSessions: async () => {}, meta: () => {}, icon: () => {} },
    session: {
      data: { permission: [] as any[], session_status: {} as Record<string, any>, session_working: () => false, message: {} as Record<string, any[]>, part: {} as Record<string, any[]> },
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
      history: { more: () => false, loading: () => false, loadMore: async () => {} },
      optimistic: { add: () => {}, remove: () => {} },
      lineage: undefined,
    },
    mcp: { toggle: async () => {} },
    ensureDirSyncContext: (directory: string) => ({
      data: new Proxy({} as any, { get: (_t, prop) => (childStore as any)[prop] }),
      set: (() => {}) as any,
      get status() { return childStore.status },
      get ready() { return true },
      get project() { return undefined },
      session: { remember: () => {}, get: () => undefined, optimistic: { add: () => {}, remove: () => {} }, addOptimisticMessage: () => {}, sync: async () => {}, diff: async () => undefined, todo: async () => undefined, history: { more: () => false, loading: () => false, loadMore: async () => {} }, evict: () => {}, fetch: async () => {}, more: { current: false } as any, archive: async () => {} },
      mcp: { toggle: async () => {} },
      absolute: (path: string) => path,
      get directory() { return directory },
    }),
  } as any

  return {
    servers: {
      list: () => [BROWSER_SERVER] as ServerConnection.Any[],
      health: { [BROWSER_KEY]: { healthy: true, version: "browser" } } as Record<string, { healthy: boolean; version?: string }>,
    },
    settings: {
      server: {
        get key() { return BROWSER_KEY },
        selected: () => BROWSER_SERVER,
        set: (_key: ServerConnection.Key) => {},
      },
    },
    ensureServerCtx(_conn: ServerConnection.Any) {
      return { queryClient, sdk, sync, isLocal: true as const, projects: noopProjects }
    },
  }
}

export function useGlobal() {
  try {
    return _useGlobalOriginal()
  } catch {
    return createBrowserFallbackGlobal()
  }
}

function createServerCtx(
  conn: ServerConnection.Any,
  scope: ServerScope,
  projects: ReturnType<typeof createServerProjects>,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  })
  const sdk = createServerSdkContext(conn, scope)
  const sync = createServerSyncContext(sdk)

  function enrich(project: { worktree: string; expanded: boolean }) {
    const [childStore] = sync.child(project.worktree, { bootstrap: false })
    const projectID = childStore.project
    const metadata = projectID
      ? sync.data.project.find((x) => x.id === projectID)
      : sync.data.project.find((x) => x.worktree === project.worktree)

    // Preserve local icon override from per-workspace localStorage cache (childStore.icon).
    // Without this, different subdirectories of the same git repo would share the same
    // icon from the database instead of using their individual overrides.
    const base = { ...metadata, ...project }
    if (childStore.icon) {
      return { ...base, icon: { ...base.icon, override: childStore.icon } }
    }
    return base
  }

  const projectsList = createMemo(() => projects.list().map(enrich))
  const recentlyClosedList = createMemo(() => {
    const known = new Set(sync.data.project.map((project) => pathKey(project.worktree)))
    return projects
      .recentlyClosed()
      .filter((worktree) => known.has(pathKey(worktree)))
      .slice(0, RECENTLY_CLOSED_DISPLAY_LIMIT)
      .map((worktree) => enrich({ worktree, expanded: false }))
  })

  const isLocal =
    (conn?.type === "sidecar" && conn.variant === "base") || (conn?.type === "http" && isLocalHost(conn.http.url))

  return {
    queryClient,
    sdk,
    sync,
    isLocal,
    projects: {
      ...projects,
      list: projectsList,
      recentlyClosed: recentlyClosedList,
    },
  }
}

export type ServerCtx = ReturnType<typeof createServerCtx>

function isLocalHost(url: string) {
  const host = url.replace(/^https?:\/\//, "").split(":")[0]
  if (host === "localhost" || host === "127.0.0.1") return "local"
}
