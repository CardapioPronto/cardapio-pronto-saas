type CaptureContext = {
  functionName: string;
  req?: Request;
  level?: "error" | "warning" | "info";
  tags?: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = {
  dsn: string;
  envelopeUrl: string;
  projectId: string;
  publicKey: string;
};

const DEFAULT_SAMPLE_RATE = 1;

function parseSampleRate() {
  const parsed = Number(Deno.env.get("SENTRY_SAMPLE_RATE") ?? DEFAULT_SAMPLE_RATE);
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_RATE;
  return Math.min(1, Math.max(0, parsed));
}

function parseDsn(rawDsn: string | undefined): ParsedDsn | null {
  if (!rawDsn) return null;

  try {
    const url = new URL(rawDsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\/+/, "").split("/").pop();
    if (!publicKey || !projectId) return null;

    return {
      dsn: rawDsn,
      envelopeUrl: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      projectId,
      publicKey,
    };
  } catch {
    return null;
  }
}

function eventId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      value: error.message || "Unknown error",
      stacktrace: error.stack,
    };
  }

  return {
    type: "Error",
    value: typeof error === "string" ? error : JSON.stringify(error),
    stacktrace: undefined,
  };
}

function stackFrames(stacktrace?: string) {
  if (!stacktrace) return undefined;

  const frames = stacktrace
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      filename: line,
      function: "<unknown>",
      in_app: true,
    }))
    .reverse();

  return frames.length ? { frames } : undefined;
}

function requestContext(req?: Request) {
  if (!req) return undefined;

  const headers: Record<string, string> = {};
  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (["authorization", "apikey", "cookie", "x-cleanup-secret"].includes(lower)) continue;
    headers[key] = value;
  }

  return {
    url: req.url,
    method: req.method,
    headers,
  };
}

function normalizeTags(tags: CaptureContext["tags"]) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags ?? {})) {
    if (value === null || value === undefined) continue;
    normalized[key] = String(value);
  }
  return normalized;
}

export async function captureEdgeException(error: unknown, context: CaptureContext) {
  const dsn = parseDsn(Deno.env.get("SENTRY_DSN"));
  if (!dsn || Math.random() > parseSampleRate()) return;

  const normalizedError = normalizeError(error);
  const id = eventId();
  const now = new Date().toISOString();
  const environment = Deno.env.get("SENTRY_ENVIRONMENT")
    || Deno.env.get("ENVIRONMENT")
    || "production";

  const event = {
    event_id: id,
    timestamp: now,
    platform: "javascript",
    level: context.level ?? "error",
    environment,
    release: Deno.env.get("SENTRY_RELEASE") || undefined,
    server_name: "supabase-edge-functions",
    tags: {
      runtime: "supabase_edge",
      function: context.functionName,
      ...normalizeTags(context.tags),
    },
    request: requestContext(context.req),
    extra: context.extra,
    exception: {
      values: [
        {
          type: normalizedError.type,
          value: normalizedError.value,
          stacktrace: stackFrames(normalizedError.stacktrace),
        },
      ],
    },
    sdk: {
      name: "pubfy.edge-observability",
      version: "1.0.0",
    },
  };

  const envelope = [
    JSON.stringify({
      event_id: id,
      dsn: dsn.dsn,
      sent_at: now,
      sdk: event.sdk,
    }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(dsn.envelopeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
  } catch (captureError) {
    console.warn("Failed to capture edge exception", {
      functionName: context.functionName,
      error: captureError instanceof Error ? captureError.message : String(captureError),
    });
  }
}
