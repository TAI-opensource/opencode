/**
 * OPFS (Origin Private File System) adapter for browser
 * Provides filesystem operations using the File System Access API
 */

let rootHandle: FileSystemDirectoryHandle | null = null

/**
 * Initialize OPFS and get root directory handle
 */
export async function initOPFS(): Promise<FileSystemDirectoryHandle> {
  if (rootHandle) return rootHandle

  try {
    // Try to get OPFS (Origin Private File System)
    if (navigator.storage && navigator.storage.getDirectory) {
      rootHandle = await navigator.storage.getDirectory()
      console.log('[OPFS] Root directory handle obtained')
      return rootHandle
    }

    // Fallback: request user permission for a directory
    console.warn('[OPFS] navigator.storage.getDirectory not available')
    throw new Error('OPFS not supported')
  } catch (error) {
    console.error('[OPFS] Failed to initialize:', error)
    throw error
  }
}

/**
 * Get or create a directory
 */
export async function getDirectory(
  path: string,
  options?: { create?: boolean }
): Promise<FileSystemDirectoryHandle> {
  const root = await initOPFS()
  const parts = path.split('/').filter(Boolean)

  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: options?.create ?? false })
  }

  return current
}

/**
 * Get or create a file
 */
export async function getFile(
  path: string,
  options?: { create?: boolean }
): Promise<FileSystemFileHandle> {
  const dirPath = path.substring(0, path.lastIndexOf('/'))
  const fileName = path.substring(path.lastIndexOf('/') + 1)

  const dir = await getDirectory(dirPath || '/', { create: options?.create })
  return dir.getFileHandle(fileName, { create: options?.create ?? false })
}

/**
 * Read file as text
 */
export async function readFile(path: string): Promise<string> {
  const fileHandle = await getFile(path)
  const file = await fileHandle.getFile()
  return file.text()
}

/**
 * Read file as array buffer
 */
export async function readFileBuffer(path: string): Promise<ArrayBuffer> {
  const fileHandle = await getFile(path)
  const file = await fileHandle.getFile()
  return file.arrayBuffer()
}

/**
 * Write file with text content
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const fileHandle = await getFile(path, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Write file with buffer content
 */
export async function writeFileBuffer(path: string, content: ArrayBuffer): Promise<void> {
  const fileHandle = await getFile(path, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Delete a file
 */
export async function deleteFile(path: string): Promise<void> {
  const dirPath = path.substring(0, path.lastIndexOf('/'))
  const fileName = path.substring(path.lastIndexOf('/') + 1)

  const dir = await getDirectory(dirPath || '/')
  await dir.removeEntry(fileName)
}

/**
 * Check if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const dirPath = path.substring(0, path.lastIndexOf('/'))
    const fileName = path.substring(path.lastIndexOf('/') + 1)

    const dir = await getDirectory(dirPath || '/')
    await dir.getFileHandle(fileName)
    return true
  } catch {
    return false
  }
}

/**
 * Check if directory exists
 */
export async function directoryExists(path: string): Promise<boolean> {
  try {
    await getDirectory(path)
    return true
  } catch {
    return false
  }
}

/**
 * List directory contents
 */
export async function listDirectory(path: string): Promise<string[]> {
  const dir = await getDirectory(path)
  const entries: string[] = []

  for await (const [name] of dir) {
    entries.push(name)
  }

  return entries
}

/**
 * Create directory
 */
export async function createDirectory(path: string): Promise<void> {
  await getDirectory(path, { create: true })
}

/**
 * Delete directory
 */
export async function deleteDirectory(path: string): Promise<void> {
  const parentPath = path.substring(0, path.lastIndexOf('/'))
  const dirName = path.substring(path.lastIndexOf('/') + 1)

  const parent = await getDirectory(parentPath || '/')
  await parent.removeEntry(dirName, { recursive: true })
}

/**
 * Copy file
 */
export async function copyFile(source: string, destination: string): Promise<void> {
  const content = await readFileBuffer(source)
  await writeFileBuffer(destination, content)
}

/**
 * Move file
 */
export async function moveFile(source: string, destination: string): Promise<void> {
  await copyFile(source, destination)
  await deleteFile(source)
}

/**
 * Get file stat
 */
export async function stat(path: string): Promise<{
  isFile: boolean
  isDirectory: boolean
  size: number
  lastModified: number
}> {
  try {
    const fileHandle = await getFile(path)
    const file = await fileHandle.getFile()
    return {
      isFile: true,
      isDirectory: false,
      size: file.size,
      lastModified: file.lastModified,
    }
  } catch {
    try {
      await getDirectory(path)
      return {
        isFile: false,
        isDirectory: true,
        size: 0,
        lastModified: 0,
      }
    } catch {
      throw new Error(`Path not found: ${path}`)
    }
  }
}

/**
 * Recursive directory read
 */
export async function readDirectoryRecursive(
  path: string,
  callback: (path: string, isDirectory: boolean) => void
): Promise<void> {
  const entries = await listDirectory(path)

  for (const entry of entries) {
    const fullPath = `${path}/${entry}`.replace(/\/+/g, '/')
    const statResult = await stat(fullPath)

    callback(fullPath, statResult.isDirectory)

    if (statResult.isDirectory) {
      await readDirectoryRecursive(fullPath, callback)
    }
  }
}
