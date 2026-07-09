import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo } from "solid-js"
import { useServer, ServerConnection } from "@/context/server"

const BROWSER_SERVER: ServerConnection.Http = {
  type: "http",
  http: { url: "browser-only" },
  displayName: "Browser",
}

function createBrowserSdk() {
  return {
    server: BROWSER_SERVER,
    scope: "browser-only" as any,
    url: "browser-only",
    client: {} as any,
    event: {
      on: () => () => {},
      listen: () => () => {},
      start: () => {},
    },
    createClient: (_opts?: any) => createBrowserSdk() as any,
    ensureDirSdkContext: (directory: string) => ({
      scope: "browser-only" as any,
      directory,
      client: {} as any,
      event: { on: () => () => {}, emit: () => {} },
      get url() {
        return "browser-only"
      },
      createClient: () => ({}) as any,
    }),
  }
}

export type MockServerSDK = ReturnType<typeof createBrowserSdk>

export const { use: useServerSDK, provider: BrowserServerSDKProvider } = createSimpleContext({
  name: "ServerSDK",
  init: () => {
    return createMemo(() => createBrowserSdk())
  },
})
