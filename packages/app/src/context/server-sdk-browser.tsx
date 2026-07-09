/**
 * Browser-only Server SDK context mock
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { type Accessor, createMemo } from "solid-js"
import { useServer, type ServerConnection } from "./server-browser"

function createBrowserSdkContext() {
  const server = useServer()
  const emitter = createGlobalEmitter<Record<string, any>>()

  return {
    server: server,
    scope: {},
    url: "browser-only",
    client: null,
    event: {
      on: emitter.on.bind(emitter),
      listen: emitter.listen.bind(emitter),
      start: () => {},
    },
    createClient: () => null,
  }
}

export type ServerSDK = ReturnType<typeof createBrowserSdkContext>

export const { use: useServerSDK, provider: ServerSDKProvider } = createSimpleContext({
  name: "ServerSDK",
  init: () => {
    return createBrowserSdkContext()
  },
})
