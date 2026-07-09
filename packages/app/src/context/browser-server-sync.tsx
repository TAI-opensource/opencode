import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo } from "solid-js"
import { createStore } from "solid-js/store"
import { useServer, ServerConnection } from "@/context/server"

const defaultState = {
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
}

const [defaultStore, setDefaultStore] = createStore(defaultState)

const sessionData = {
  permission: [] as any[],
  session_status: {} as Record<string, any>,
  session_working: (_id: string) => false,
  message: {} as Record<string, any[]>,
  part: {} as Record<string, any[]>,
}

const [sessionStore, setSessionStore] = createStore(sessionData)

const emptySession = {
  data: sessionStore,
  set: setSessionStore as any,
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
}

function createBrowserSync() {
  return {
    data: {
      ready: true,
      path: { home: "/", directory: "/", worktree: "/", state: "/", config: "/" },
      project: [] as any[],
      provider: { all: new Map(), connected: [] as any[], default: {} },
      config: {} as any,
      reload: undefined as undefined | "pending" | "complete",
    },
    set: (() => {}) as any,
    get ready() {
      return true
    },
    get error() {
      return undefined
    },
    child: (_dir: string, _opts?: any) => [defaultStore, setDefaultStore] as const,
    peek: (_dir: string) => [defaultStore, setDefaultStore] as const,
    disableMcp: () => {},
    queryOptions: {
      globalConfig: () => ({ queryKey: ["browser", "globalConfig"] as const, queryFn: async () => ({}) }),
      projects: () => ({ queryKey: ["browser", "projects"] as const, queryFn: async () => [] }),
      providers: (_dir: any) => ({ queryKey: ["browser", _dir, "providers"] as const, queryFn: async () => ({ all: new Map(), connected: [], default: {} }) }),
      path: (_dir: any) => ({ queryKey: ["browser", _dir, "path"] as const, queryFn: async () => ({ home: "/", directory: "/", worktree: "/", state: "/", config: "/" }) }),
      agents: (_dir: any) => ({ queryKey: ["browser", _dir, "agents"] as const, queryFn: async () => [] }),
      references: (_dir: any) => ({ queryKey: ["browser", _dir, "references"] as const, queryFn: async () => [] }),
      mcp: (_dir: any) => ({ queryKey: ["browser", _dir, "mcp"] as const, queryFn: async () => ({}) }),
      mcpResources: (_dir: any) => ({ queryKey: ["browser", _dir, "mcpResources"] as const, queryFn: async () => ({}) }),
      lsp: (_dir: any) => ({ queryKey: ["browser", _dir, "lsp"] as const, queryFn: async () => [] }),
      sessions: (_dir: any) => ({ queryKey: ["browser", _dir, "sessions"] as const }),
    },
    updateConfig: async () => {},
    project: {
      loadSessions: async () => {},
      meta: () => {},
      icon: () => {},
    },
    session: emptySession,
    mcp: { toggle: async () => {} },
    ensureDirSyncContext: createBrowserDirSyncContext,
  }
}

function createBrowserDirSyncContext(directory: string) {
  const [childStore, setChildStore] = createStore({
    ...defaultState,
    path: { directory, worktree: directory, home: "/", state: "/", config: "/" },
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

export const { use: useServerSync, provider: BrowserServerSyncProvider } = createSimpleContext({
  name: "ServerSync",
  init: () => {
    return createMemo(() => createBrowserSync())
  },
})
