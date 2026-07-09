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

// Browser-only providers
import { ServerProvider } from "@/context/server-browser"
import { ServerSDKProvider } from "@/context/server-sdk-browser"
import { ServerSyncProvider } from "@/context/server-sync-browser"
import { LocalSDKProvider } from "@/context/local-sdk"
import { LocalSyncProvider, useLocalSync } from "@/context/local-sync"

import DirectoryLayout, { DirectoryDataProvider } from "@/pages/directory-layout"
import LegacyLayout from "@/pages/layout"
import NewLayout from "@/pages/layout-new"
import { ErrorPage } from "./pages/error"
import SettingsPage from "@/pages/settings"

import { SessionPage, SessionRouteErrorBoundary } from "@/pages/session"
import { NewHome, LegacyHome } from "@/pages/home"

const NewSession = lazy(() => import("@/pages/new-session"))

// Local providers wrapper
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
  })
  return null
}

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

function ServerScopedProviders(props: ParentProps) {
  return (
    <PermissionProvider>
      <LayoutProvider>
        <ModelsProvider>{props.children}</ModelsProvider>
      </LayoutProvider>
    </PermissionProvider>
  )
}

function LegacyLayoutWrapper(props: ParentProps) {
  return (
    <ServerScopedProviders>
      <LegacyLayout>{props.children}</LegacyLayout>
    </ServerScopedProviders>
  )
}

function NewLayoutWrapper(props: ParentProps) {
  return (
    <ServerScopedProviders>
      <NewLayout>{props.children}</NewLayout>
    </ServerScopedProviders>
  )
}

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
      <ThemeProvider>
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

export function AppInterface(props: {
  children?: JSX.Element
  router?: Component<BaseRouterProps>
}) {
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
      <ServerProvider>
        <ServerSDKProvider>
          <ServerSyncProvider>
            <LocalProviders>
              <Dynamic
                component={props.router ?? Router}
                root={(routerProps) => (
                  <TabsProvider>
                    <NotificationProvider>
                      <ServerShell>{routerProps.children}</ServerShell>
                    </NotificationProvider>
                  </TabsProvider>
                )}
              >
                <Routes />
              </Dynamic>
            </LocalProviders>
          </ServerSyncProvider>
        </ServerSDKProvider>
      </ServerProvider>
    </SettingsProvider>
  )
}

function Routes() {
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
