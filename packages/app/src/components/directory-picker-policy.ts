import { ServerConnection } from "@/context/server"
import type { Platform } from "@/context/platform"

export function directoryPickerKind(platform: Platform["platform"], server: ServerConnection.Any) {
  if (ServerConnection.browserOnly(server)) return "browser" as const
  if (platform === "desktop" && ServerConnection.local(server)) return "native" as const
  return "server" as const
}
