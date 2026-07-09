/**
 * App entry point - Browser-only version
 * Uses original providers with browser mocks
 */

import "@/index.css"
import * as Sentry from "@sentry/solid"
import { I18nProvider } from "@opencode-ai/ui/context"
import { DialogProvider } from "@opencode-ai/ui/context/dialog"
import { FileComponentProvider } from "@opencode-ai/ui/context/file"
import { MarkedProvider } from "@opencode-ai/ui/context/marked"
import { File } from "@opencode-ai/session-ui/file"
import { Font } from "@opencode-ai/ui/font"
import { ThemeProvider } from "@opencode-ai/ui/theme/context"
import { MetaProvider } from "@solidjs/meta"
import { type BaseRouterProps, Navigate, Route, Router, useParams } from "@solidjs/router"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import {
  type Component,
  createRenderEffect,
  type JSX,
  type ParentProps,
} from "solid-js"
import { Dynamic } from "solid-js/web"
import { CommandProvider } from "@/context/command"
import { CommentsProvider } from "@/context/comments"
import { FileProvider } from "@/context/file"
import { HighlightsProvider } from "@/context/highlights"
import { LanguageProvider, type Locale, useLanguage } from "@/context/language"
import { LayoutProvider } from "@/context/layout"
import { BrowserModelsProvider } from "@/context/browser-models"
import { NotificationProvider } from "@/context/notification"
import { PermissionProvider } from "@/context/permission"
import { PromptProvider } from "@/context/prompt"
import { SettingsProvider, useSettings } from "@/context/settings"
import { TabsProvider } from "@/context/tabs"
import { ServerProvider, ServerConnection } from "@/context/server"
import { BrowserGlobalProvider } from "@/context/browser-global"
import { BrowserServerSDKProvider } from "@/context/browser-server-sdk"
import { BrowserServerSyncProvider } from "@/context/browser-server-sync"

import DirectoryLayout from "@/pages/directory-layout"
import LegacyLayout from "@/pages/layout"
import NewLayout from "@/pages/layout-new"
import { ErrorPage } from "./pages/error"
import SettingsPage from "@/pages/settings"
import { SessionPage, SessionRouteErrorBoundary } from "@/pages/session"
import { BrowserSessionPage } from "@/pages/browser-session"
import { NewHome, LegacyHome } from "@/pages/home"
import { I18nProvider as UiI18nProvider } from "@opencode-ai/ui/context"

const NewSession = lazy(() => import("@/pages/new-session"))

import { lazy } from "solid-js"

export const BROWSER_SERVER: ServerConnection.Http = {
  type: "http",
  authToken: undefined,
  http: { url: "browser-only" },
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
        <BrowserModelsProvider>{props.children}</BrowserModelsProvider>
      </LayoutProvider>
    </PermissionProvider>
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

function UiI18nBridge(props: ParentProps) {
  const language = useLanguage()
  return <I18nProvider value={{ locale: language.intl, t: language.t }}>{props.children}</I18nProvider>
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
  return (
    <SettingsProvider>
      <ServerProvider
        defaultServer={ServerConnection.key(BROWSER_SERVER)}
        servers={[BROWSER_SERVER]}
      >
        <BrowserGlobalProvider>
          <BrowserServerSDKProvider>
            <BrowserServerSyncProvider>
              <Dynamic
                component={props.router ?? Router}
                root={(routerProps) => (
                  <TabsProvider>
                    <NotificationProvider>
                      <QueryProvider>
                        <SharedProviders>{routerProps.children}</SharedProviders>
                      </QueryProvider>
                    </NotificationProvider>
                  </TabsProvider>
                )}
              >
                <Routes />
              </Dynamic>
            </BrowserServerSyncProvider>
          </BrowserServerSDKProvider>
        </BrowserGlobalProvider>
      </ServerProvider>
    </SettingsProvider>
  )
}

const SessionRoute = () => {
  const params = useParams()
  return (
    <SessionRouteErrorBoundary sessionID={params.id}>
      <BrowserSessionPage />
    </SessionRouteErrorBoundary>
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
