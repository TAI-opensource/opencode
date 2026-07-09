/**
 * Unified Models Context
 * Provides useModels hook that works in both browser-only and server modes
 */

import { createSimpleContext } from "@opencode-ai/ui/context"
import { type Accessor } from "solid-js"
import { useBrowserModels, type ModelKey } from "./browser-models"
import { useModels as useOriginalModels } from "./models"

export type { ModelKey }

function useModelsUnified() {
  // Try to use browser models first, fall back to original
  try {
    const browserModels = useBrowserModels()
    return browserModels
  } catch {
    // If browser models not available, use original
    return useOriginalModels()
  }
}

export const { use: useModels, provider: ModelsProvider } = createSimpleContext({
  name: "Models",
  gate: false,
  init: (props: { directory?: Accessor<string | undefined> } = {}) => {
    // This is a wrapper that delegates to the appropriate implementation
    // The actual initialization happens in the specific providers
    return useModelsUnified()
  },
})
