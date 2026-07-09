/**
 * App entry point - Browser-only version
 * Uses local providers instead of server providers
 */

import "@/index.css"
import * as Sentry from "@sentry/solid"
import { I18nProvider } from "@opencode-ai/ui/context"
import { DialogProvider } from "@opencode-ai/ui/context/dialog"
import { FileComponentProvider } from "@opencode-ai/ui/context/file"
import { MarkedProvider } from "@opencode-ai/ui/context/marked"
import { File } from "@opencode-ai/session-ui/file"
import { Font } from "@opencode-ai/ui/font"
import { Splash } from "@opencode-ai/ui/logo"
import { ThemeProvider } from "@opencode-ai/ui/theme/context"
import { MetaProvider } from "@solidjs/meta"
import { type BaseRouterProps, Navigate, Route, Router, useNavigate, useParams, useSearchParams } from "@solidjs/router"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { Effect } from "effect"
import {
  type Component,
  createEffect,
  createMemo,
  createRenderEffect,
  createResource,
  createSignal,
  ErrorBoundary,
  For,
  type JSX,
  lazy,
  onCleanup,
  type ParentProps,
  Show,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import { CommandProvider, useCommand, type CommandOption } from "@/context/command"
import { CommentsProvider } from "@/context/comments"
import { FileProvider } from "@/context/file"
import { LocalSDKProvider } from "@/context/local-sdk"
import { LocalSyncProvider, useLocalSync } from "@/context/local-sync"
import { GlobalProvider, useGlobal } from "@/context/global"
import { HighlightsProvider } from "@/context/highlights"
import { LanguageProvider, type Locale, useLanguage } from "@/context/language"
import { LayoutProvider } from "@/context/layout"
import { ModelsProvider } from "@/context/models"
import { NotificationProvider } from "@/context/notification"
import { PermissionProvider } from "@/context/permission"
import { usePlatform } from "@/context/platform"
import { PromptProvider } from "@/context/prompt"
import { SettingsProvider, useSettings } from "@/context/settings"
import { TabsProvider, useTabs, type DraftTab } from "@/context/tabs"
import DirectoryLayout, { DirectoryDataProvider } from "@/pages/directory-layout"
import LegacyLayout from "@/pages/layout"
import NewLayout from "@/pages/layout-new"
import { ErrorPage } from "./pages/error"
import SettingsPage from "@/pages/settings"

import { SessionPage, SessionRouteErrorBoundary } from "@/pages/session"
import { NewHome, LegacyHome } from "@/pages/home"

const NewSession = lazy(() => import("@/pages/new-session"))

// Local providers - no server connection needed
function LocalProviders(props: ParentProps) {
  return (
    <LocalSDKProvider>
      <LocalSyncProvider>{props.children}</LocalSyncProvider>
    </LocalSDKProvider>
  )
}

// Simplified route for browser-only mode
const SessionRoute = () => {
  const params = useParams()
  const [search] = useSearchParams<{ draftId?: string; prompt?: string }>()
  const tabs = useTabs()
  const sync = useLocalSync()

  return (
    <SessionRouteErrorBoundary sessionID={params.id}>
      <SessionPage />
    </SessionRouteErrorBoundary>
  )
}

function UiI18nBridge(props: ParentProps) {
  const language = useLanguage()
  return <I18nProvider value={{ locale: language.intl, t: language.t }}>{props.children}</I18nProvider>
}

declare global {
  interface Window {
    __OPENCODE__?: {
      deepLinks?: string[]
    }
    api?: {
      setTitlebar?: (theme: { mode: "light" | "dark"; scheme?: "system" | "light" | "dark" }) => Promise<void>
      exportDebugLogs?: () => Promise<string>
    }
  }
}

function QueryProvider(props: ParentProps) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  })
  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
}

function BodyDesignClass() {
  const settings = useSettings()

  createRenderEffect(() => {
    if (typeof document === "undefined") return

    const enabled = settings.general.newLayoutDesigns()
    document.body.toggleAttribute("data-new-layout", enabled)
    document.body.classList.toggle("text-12-regular", !enabled)
    document.body.classList.toggle("font-(family-name:--font-family-text)", enabled)
    document.body.classList.toggle("text-[13px]", enabled)
    document.body.classList.toggle("font-[440]", enabled)
  })

  return null
}

// Server-agnostic providers shared across every route
function SharedProviders(props: ParentProps) {
  return (
    <>
      <BodyDesignClass />
      <CommandProvider>
        <HighlightsProvider>{props.children}</HighlightsProvider>
      </CommandProvider>
    </>
  )
}

// Server-scoped providers shared by the legacy shell and the top-level new shell
type ServerScopedShellProps = ParentProps<{
  directory?: () => string | undefined
  sessionID?: () => string | undefined
  serverScoped?: JSX.Element
}>

function ServerScopedProviders(props: ServerScopedShellProps) {
  return (
    <PermissionProvider directory={props.directory}>
      <LayoutProvider>
        {props.serverScoped}
        <ModelsProvider directory={props.directory}>{props.children}</ModelsProvider>
      </LayoutProvider>
    </PermissionProvider>
  )
}

function LegacyServerScopedShell(props: ServerScopedShellProps) {
  return (
    <ServerScopedProviders directory={props.directory} sessionID={props.sessionID} serverScoped={props.serverScoped}>
      <LegacyLayout>{props.children}</LegacyLayout>
    </ServerScopedProviders>
  )
}

function NewAppLayout(props: ParentProps<{ serverScoped?: JSX.Element }>) {
  return (
    <LocalProviders>
      <ServerScopedProviders serverScoped={props.serverScoped}>
        <NewLayout>{props.children}</NewLayout>
      </ServerScopedProviders>
    </LocalProviders>
  )
}

function DraftServerScopedProviders(props: ParentProps<{ directory?: () => string | undefined }>) {
  return (
    <PermissionProvider directory={props.directory}>
      <ModelsProvider directory={props.directory}>{props.children}</ModelsProvider>
    </PermissionProvider>
  )
}

// The draft page only renders the prompt composer, so it drops TerminalProvider
function DraftProviders(props: ParentProps) {
  return (
    <FileProvider>
      <PromptProvider>
        <CommentsProvider>{props.children}</CommentsProvider>
      </PromptProvider>
    </FileProvider>
  )
}

export function AppBaseProviders(props: ParentProps<{ locale?: Locale }>) {
  return (
    <MetaProvider>
      <Font />
      <ThemeProvider
        onThemeApplied={(_, mode, scheme) => {
          void window.api?.setTitlebar?.({ mode, scheme })
        }}
      >
        <LanguageProvider locale={props.locale}>
          <UiI18nBridge>
            <ErrorBoundary
              fallback={(error) => {
                Sentry.captureException(error)
                return <ErrorPage error={error} />
              }}
            >
              <QueryProvider>
                <DialogProvider>
                  <MarkedProvider>
                    <FileComponentProvider component={File}>{props.children}</FileComponentProvider>
                  </MarkedProvider>
                </DialogProvider>
              </QueryProvider>
            </ErrorBoundary>
          </UiI18nBridge>
        </LanguageProvider>
      </ThemeProvider>
    </MetaProvider>
  )
}

function ConnectionGate(props: ParentProps<{ disableHealthCheck?: boolean; startup?: Promise<void> }>) {
  // In browser-only mode, no server connection needed
  return <>{props.children}</>
}

function ServerKey(props: ParentProps) {
  // In browser-only mode, always render
  return <>{props.children}</>
}

// Simplified server connection for browser-only mode
function SelectedServerProviders(props: ParentProps) {
  return (
    <LocalProviders>
      <ServerKey>{props.children}</ServerKey>
    </LocalProviders>
  )
}

function LegacyServerLayout(props: ParentProps<{ serverScoped?: JSX.Element }>) {
  return (
    <SelectedServerProviders>
      <LegacyServerScopedShell serverScoped={props.serverScoped}>{props.children}</LegacyServerScopedShell>
    </SelectedServerProviders>
  )
}

export function AppInterface(props: {
  children?: JSX.Element
  defaultServer?: any
  canonicalLocalServer?: any
  servers?: any[]
  router?: Component<BaseRouterProps>
  disableHealthCheck?: boolean
  startup?: Promise<void>
  serverScoped?: JSX.Element
}) {
  // The visual new layout lives in the router root so it remains mounted across
  // route changes. Draft and session routes override only their server-bound data
  // providers beneath it.
  const ServerShell = (shellProps: ParentProps) => (
    <QueryProvider>
      <SharedProviders>
        {props.children}
        {shellProps.children}
      </SharedProviders>
    </QueryProvider>
  )

  return (
    <SettingsProvider>
      <ConnectionGate disableHealthCheck={props.disableHealthCheck} startup={props.startup}>
        <Dynamic
          component={props.router ?? Router}
          root={(routerProps) => (
            <TabsProvider>
              <NotificationProvider>
                <ServerShell>
                  <NewAppLayout serverScoped={props.serverScoped}>{routerProps.children}</NewAppLayout>
                </ServerShell>
              </NotificationProvider>
            </TabsProvider>
          )}
        >
          <Routes serverScoped={props.serverScoped} />
        </Dynamic>
      </ConnectionGate>
    </SettingsProvider>
  )
}

function Routes(props: { serverScoped?: JSX.Element }) {
  const settings = useSettings()

  return (
    <>
      <Route path="/" component={LegacyHome} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/:dir" component={DirectoryLayout}>
        <Route path="/" component={() => <Navigate href="session" />} />
        <Route path="/session/:id?" component={SessionRoute} />
      </Route>
      <Route path="/new-session" component={NewSession} />
    </>
  )
}
