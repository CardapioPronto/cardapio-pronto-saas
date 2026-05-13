import * as Sentry from "@sentry/react";

const publicSentryDsn = "https://0a4145edff0c18f81723f0feca265622@o4511357542203392.ingest.us.sentry.io/4511357548822528";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN || publicSentryDsn;
const appVersion = import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_SENTRY_RELEASE || "pubfy@0.0.1";
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT
  || import.meta.env.MODE
  || (import.meta.env.PROD ? "production" : "development");

let initialized = false;

function parseSampleRate(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function scrubEvent(event: Sentry.ErrorEvent) {
  if (event.request?.headers) {
    delete event.request.headers.Authorization;
    delete event.request.headers.authorization;
    delete event.request.headers.apikey;
    delete event.request.headers.cookie;
  }

  return event;
}

export function initObservability() {
  if (initialized || !sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    environment,
    release: appVersion,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.15),
    beforeSend(event) {
      return scrubEvent(event);
    },
    ignoreErrors: [
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
    ],
  });

  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) {
    if (import.meta.env.DEV) console.error("Captured before Sentry init:", error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function setObservabilityUser(user: { id?: string; email?: string | null } | null) {
  if (!initialized) return;

  Sentry.setUser(user?.id ? {
    id: user.id,
    email: user.email ?? undefined,
  } : null);
}
