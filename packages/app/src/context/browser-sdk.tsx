/**
 * Browser-only SDK provider that provides a mock SDK context
 * This is used when running in browser-only mode (no server)
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { type Accessor, createMemo } from "solid-js"
import { useServer, ServerConnection } from "@/context/server"
import { useLanguage } from "@/context/language"

// Mock SDK for browser-only mode
function createMockSDK(directory: string) {
  return {
    scope: "browser-only",
    directory,
    client: {
      // Mock client methods
      session: {
        list: async () => [],
        get: async () => null,
        create: async () => ({ id: "mock-session" }),
      },
      message: {
        list: async () => [],
        create: async () => ({ id: "mock-message" }),
      },
    },
    event: {
      on: () => () => {},
      listen: () => () => {},
      start: () => {},
    },
    createClient: (opts: any) => createMockSDK(opts.directory ?? directory),
  }
}

type MockSDK = ReturnType<typeof createMockSDK>

export const { use: useBrowserSDK, provider: BrowserSDKProvider } = createSimpleContext({
  name: "BrowserSDK",
  init: (props: { directory: string | Accessor<string> }) => {
    const language = useLanguage()
    return createMemo(() => {
      const directory = typeof props.directory === "function" ? props.directory() : props.directory
      return createMockSDK(directory)
    })
  },
})

export type { MockSDK }
