/**
 * Settings page for API keys and configuration
 */

import { createSignal, For, onMount, createEffect } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { ConfigRepository } from '@/db'

interface ProviderConfig {
  name: string
  type: 'openai' | 'anthropic' | 'groq' | 'google' | 'openrouter'
  apiKey: string
  baseUrl?: string
  model?: string
  enabled: boolean
}

interface GitHubConfig {
  token: string
  username?: string
  email?: string
}

export default function SettingsPage() {
  const navigate = useNavigate()

  const [providers, setProviders] = createSignal<ProviderConfig[]>([])
  const [github, setGithub] = createSignal<GitHubConfig>({ token: '' })
  const [activeTab, setActiveTab] = createSignal<'providers' | 'github'>('providers')
  const [newProvider, setNewProvider] = createSignal<Partial<ProviderConfig>>({
    type: 'openai',
    enabled: true,
  })
  const [showAddProvider, setShowAddProvider] = createSignal(false)
  const [message, setMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null)

  onMount(() => {
    loadProviders()
    loadGitHubConfig()
  })

  createEffect(() => {
    // Save providers whenever they change
    saveProviders()
  })

  function loadProviders() {
    try {
      const stored = ConfigRepository.get('llm_providers')
      if (stored) {
        setProviders(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  function saveProviders() {
    try {
      ConfigRepository.set('llm_providers', JSON.stringify(providers()))
    } catch (error) {
      console.error('Failed to save providers:', error)
    }
  }

  function loadGitHubConfig() {
    try {
      const token = ConfigRepository.get('github_token') ?? ''
      const username = ConfigRepository.get('github_username') ?? ''
      const email = ConfigRepository.get('github_email') ?? ''
      setGithub({ token, username, email })
    } catch (error) {
      console.error('Failed to load GitHub config:', error)
    }
  }

  function saveGitHubConfig() {
    try {
      const config = github()
      ConfigRepository.set('github_token', config.token)
      ConfigRepository.set('github_username', config.username ?? '')
      ConfigRepository.set('github_email', config.email ?? '')
      setMessage({ type: 'success', text: 'GitHub configuration saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save GitHub config' })
    }
  }

  function addProvider() {
    const provider = newProvider()
    if (!provider.name || !provider.apiKey) {
      setMessage({ type: 'error', text: 'Name and API key are required' })
      return
    }

    setProviders([...providers(), provider as ProviderConfig])
    setNewProvider({ type: 'openai', enabled: true })
    setShowAddProvider(false)
    setMessage({ type: 'success', text: 'Provider added!' })
  }

  function removeProvider(index: number) {
    setProviders(providers().filter((_, i) => i !== index))
  }

  function toggleProvider(index: number) {
    const updated = [...providers()]
    updated[index].enabled = !updated[index].enabled
    setProviders(updated)
  }

  function testProvider(provider: ProviderConfig) {
    // Test API key by making a simple request
    setMessage({ type: 'success', text: `Testing ${provider.name}...` })
    // Implementation would test the API key
  }

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div class="max-w-4xl mx-auto px-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* Header */}
          <div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Configure API providers and integrations
            </p>
          </div>

          {/* Tabs */}
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="flex -mb-px">
              <button
                onClick={() => setActiveTab('providers')}
                class={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab() === 'providers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                LLM Providers
              </button>
              <button
                onClick={() => setActiveTab('github')}
                class={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab() === 'github'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                GitHub
              </button>
            </nav>
          </div>

          {/* Content */}
          <div class="p-6">
            {/* Message */}
            {message() && (
              <div
                class={`mb-4 p-4 rounded-md ${
                  message()!.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message()!.text}
              </div>
            )}

            {/* LLM Providers Tab */}
            {activeTab() === 'providers' && (
              <div>
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-lg font-medium text-gray-900 dark:text-white">
                    API Providers
                  </h2>
                  <button
                    onClick={() => setShowAddProvider(true)}
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Provider
                  </button>
                </div>

                {/* Provider List */}
                <div class="space-y-4">
                  <For each={providers()}>
                    {(provider, index) => (
                      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                          <div>
                            <h3 class="font-medium text-gray-900 dark:text-white">
                              {provider.name}
                            </h3>
                            <p class="text-sm text-gray-500">{provider.type}</p>
                            {provider.model && (
                              <p class="text-sm text-gray-500">
                                Model: {provider.model}
                              </p>
                            )}
                          </div>
                          <div class="flex space-x-2">
                            <button
                              onClick={() => testProvider(provider)}
                              class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Test
                            </button>
                            <button
                              onClick={() => toggleProvider(index())}
                              class={`px-3 py-1 text-sm rounded ${
                                provider.enabled
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {provider.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <button
                              onClick={() => removeProvider(index())}
                              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div class="mt-2">
                          <input
                            type="password"
                            value={provider.apiKey}
                            readOnly
                            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            placeholder="API Key"
                          />
                        </div>
                      </div>
                    )}
                  </For>
                </div>

                {/* Add Provider Form */}
                {showAddProvider() && (
                  <div class="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 class="font-medium text-gray-900 dark:text-white mb-4">
                      Add New Provider
                    </h3>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          type="text"
                          value={newProvider().name ?? ''}
                          onInput={(e) =>
                            setNewProvider({ ...newProvider(), name: e.currentTarget.value })
                          }
                          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="My OpenAI"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700">
                          Type
                        </label>
                        <select
                          value={newProvider().type}
                          onChange={(e) =>
                            setNewProvider({
                              ...newProvider(),
                              type: e.currentTarget.value as any,
                            })
                          }
                          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="groq">Groq</option>
                          <option value="google">Google Gemini</option>
                          <option value="openrouter">OpenRouter</option>
                        </select>
                      </div>
                      <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={newProvider().apiKey ?? ''}
                          onInput={(e) =>
                            setNewProvider({ ...newProvider(), apiKey: e.currentTarget.value })
                          }
                          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700">
                          Base URL (optional)
                        </label>
                        <input
                          type="text"
                          value={newProvider().baseUrl ?? ''}
                          onInput={(e) =>
                            setNewProvider({ ...newProvider(), baseUrl: e.currentTarget.value })
                          }
                          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700">
                          Model (optional)
                        </label>
                        <input
                          type="text"
                          value={newProvider().model ?? ''}
                          onInput={(e) =>
                            setNewProvider({ ...newProvider(), model: e.currentTarget.value })
                          }
                          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="gpt-4o"
                        />
                      </div>
                    </div>
                    <div class="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddProvider(false)}
                        class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addProvider}
                        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GitHub Tab */}
            {activeTab() === 'github' && (
              <div>
                <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  GitHub Configuration
                </h2>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={github().token}
                      onInput={(e) =>
                        setGithub({ ...github(), token: e.currentTarget.value })
                      }
                      class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="ghp_..."
                    />
                    <p class="mt-1 text-sm text-gray-500">
                      Required for pushing to GitHub. Create at{' '}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        class="text-blue-600 hover:underline"
                      >
                        github.com/settings/tokens
                      </a>
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      value={github().username ?? ''}
                      onInput={(e) =>
                        setGithub({ ...github(), username: e.currentTarget.value })
                      }
                      class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="your-username"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={github().email ?? ''}
                      onInput={(e) =>
                        setGithub({ ...github(), email: e.currentTarget.value })
                      }
                      class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div class="pt-4">
                    <button
                      onClick={saveGitHubConfig}
                      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Save GitHub Configuration
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div class="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <button
              onClick={() => navigate('/')}
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
