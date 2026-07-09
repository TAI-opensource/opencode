import { createSimpleContext } from "@opencode-ai/ui/context"
import { type Accessor, createMemo, createSignal } from "solid-js"
import { type ServerSDK, useServerSDK } from "./server-sdk"

export type DirectorySDK = ReturnType<ServerSDK["ensureDirSdkContext"]>

export const { use: _useSDKOriginal, provider: SDKProvider } = createSimpleContext({
  name: "SDK",
  // Resolves the directory-scoped SDK reactively from the (possibly changing) server.
  init: (props: { directory: string | Accessor<string> }) => {
    const serverSDK = useServerSDK()
    return createMemo(() => {
      const directory = typeof props.directory === "function" ? props.directory() : props.directory
      return serverSDK().ensureDirSdkContext(directory)
    })
  },
})

function createBrowserFallbackSDK(directory: string | Accessor<string>) {
  const dir = typeof directory === "function" ? directory() : directory
  const mock = {
    scope: "browser-only",
    directory: dir,
    client: {
      session: { list: async () => [], get: async () => null, create: async () => ({ id: "mock-session" }) },
      message: { list: async () => [], create: async () => ({ id: "mock-message" }) },
    },
    event: { on: () => () => {}, listen: () => () => {}, start: () => {} },
    createClient: (opts: any) => createBrowserFallbackSDK(opts.directory ?? dir),
  } as any
  const [signal] = createSignal(mock)
  return signal
}

export function useSDK(directory?: string | Accessor<string>) {
  try {
    return _useSDKOriginal()
  } catch {
    return createBrowserFallbackSDK(directory ?? "unknown")
  }
}
