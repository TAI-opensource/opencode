/**
 * Tool registry
 */

export interface ToolParameter {
  type: string
  description: string
  required?: boolean
  default?: any
  enum?: string[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  execute: (params: Record<string, any>, context: any) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  output?: string
  error?: string
  metadata?: Record<string, any>
}

/**
 * Tool registry class
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
    console.log(`[Tool] Registered: ${tool.name}`)
  }

  unregister(name: string): void {
    this.tools.delete(name)
    console.log(`[Tool] Unregistered: ${name}`)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getDefinitions(): Array<{
    name: string
    description: string
    parameters: Record<string, ToolParameter>
  }> {
    return this.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }))
  }

  async execute(
    name: string,
    params: Record<string, any>,
    context: any
  ): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      }
    }

    try {
      return await tool.execute(params, context)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry()
