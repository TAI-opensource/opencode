/**
 * Browser-only Models Provider - simplified version without persistence
 */

import { createMemo } from "solid-js"
import { createSimpleContext } from "@opencode-ai/ui/context"

export type ModelKey = { providerID: string; modelID: string }

export const { use: useBrowserModels, provider: BrowserModelsProvider } = createSimpleContext({
  name: "BrowserModels",
  gate: false,
  init: () => {
    const list = createMemo(() => [])
    const find = (key: ModelKey) => undefined
    const visible = (model: ModelKey) => true
    const setVisibility = (model: ModelKey, state: boolean) => {}

    return {
      ready: { promise: Promise.resolve(), resolved: true } as any,
      list,
      find,
      visible,
      setVisibility,
      recent: { list: () => [] as any[], push: () => {} },
      variant: { get: () => undefined, set: () => {} },
    }
  },
})
