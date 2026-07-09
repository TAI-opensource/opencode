/**
 * Browser-only directory picker using OPFS
 */

import { useDialog } from "@opencode-ai/ui/context/dialog"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { createSignal, For, Show } from "solid-js"
import { useLanguage } from "@/context/language"
import { ServerConnection } from "@/context/server"
import {
  listDirectory,
  createDirectory,
  getDirectory,
  stat,
} from "@/fs/opfs"

interface DialogCreateProjectProps {
  server: ServerConnection.Any
  onSelect: (result: string | null) => void
}

export function DialogCreateProject(props: DialogCreateProjectProps) {
  const dialog = useDialog()
  const language = useLanguage()
  const [projectName, setProjectName] = createSignal("")
  const [parentDir, setParentDir] = createSignal("/")
  const [directories, setDirectories] = createSignal<Array<{ name: string; path: string }>>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  // Load directories from OPFS
  const loadDirectories = async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const entries = await listDirectory(path)
      const dirs: Array<{ name: string; path: string }> = []
      for (const entry of entries) {
        const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`
        try {
          const info = await stat(fullPath)
          if (info.isDirectory) {
            dirs.push({ name: entry, path: fullPath })
          }
        } catch {
          // Skip files
        }
      }
      setDirectories(dirs)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load directories")
    } finally {
      setLoading(false)
    }
  }

  // Load root directories on mount
  loadDirectories(parentDir())

  const navigateTo = (path: string) => {
    setParentDir(path)
    loadDirectories(path)
  }

  const createProject = async () => {
    const name = projectName().trim()
    if (!name) {
      setError("Please enter a project name")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const projectPath = parentDir() === "/" ? `/${name}` : `${parentDir()}/${name}`
      await createDirectory(projectPath)
      props.onSelect(projectPath)
      dialog.close()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="Create New Project">
      <div class="flex flex-col gap-4 p-4">
        {/* Current path */}
        <div class="text-sm text-gray-500">
          Location: {parentDir()}
        </div>

        {/* Project name input */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName()}
            onInput={(e) => setProjectName(e.currentTarget.value)}
            placeholder="my-project"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Directory navigation */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Navigate to location
          </label>
          
          {/* Go up button */}
          <Show when={parentDir() !== "/"}>
            <Button
              size="small"
              variant="ghost"
              onClick={() => {
                const parts = parentDir().split("/").filter(Boolean)
                parts.pop()
                navigateTo(parts.length ? `/${parts.join("/")}` : "/")
              }}
              class="mb-2"
            >
              ← Go Up
            </Button>
          </Show>

          {/* Directory list */}
          <div class="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
            <Show when={!loading()} fallback={<div class="p-2 text-gray-500">Loading...</div>}>
              <Show when={error()}>
                <div class="p-2 text-red-500 text-sm">{error()}</div>
              </Show>
              <For each={directories()}>
                {(dir) => (
                  <button
                    class="w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
                    onClick={() => navigateTo(dir.path)}
                  >
                    📁 {dir.name}
                  </button>
                )}
              </For>
              <Show when={directories().length === 0 && !error()}>
                <div class="p-2 text-gray-500 text-sm">No subdirectories</div>
              </Show>
            </For>
          </div>
        </div>

        {/* Actions */}
        <div class="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => dialog.close()}
          >
            Cancel
          </Button>
          <Button
            onClick={createProject}
            disabled={!projectName().trim() || loading()}
          >
            Create Project
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

/**
 * Hook to create a project in browser-only mode
 */
export function useBrowserProjectPicker() {
  const dialog = useDialog()

  return (input: {
    server: ServerConnection.Any
    onSelect: (result: string | null) => void
  }) => {
    dialog.show(() => (
      <DialogCreateProject
        server={input.server}
        onSelect={input.onSelect}
      />
    ))
  }
}
