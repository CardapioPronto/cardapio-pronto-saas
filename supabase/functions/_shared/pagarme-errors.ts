type PagarmeErrorPayload = {
  message?: string;
  errors?: unknown;
  raw?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectErrorMessages(errors: unknown): string[] {
  if (!errors) return [];

  if (Array.isArray(errors)) {
    return errors
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (isRecord(entry) && typeof entry.message === "string") return entry.message;
        return null;
      })
      .filter((msg): msg is string => Boolean(msg));
  }

  if (isRecord(errors)) {
    const messages: string[] = [];
    for (const value of Object.values(errors)) {
      if (typeof value === "string") messages.push(value);
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") messages.push(item);
          else if (isRecord(item) && typeof item.message === "string") {
            messages.push(item.message);
          }
        }
      } else if (isRecord(value) && typeof value.message === "string") {
        messages.push(value.message);
      }
    }
    return messages;
  }

  return [];
}

export function pagarmeFieldErrors(data: unknown): string[] {
  const payload = isRecord(data) ? data as PagarmeErrorPayload : null;
  return collectErrorMessages(payload?.errors);
}

export function pagarmeErrorMessage(data: unknown, status?: number): string {
  const payload = isRecord(data) ? data as PagarmeErrorPayload : null;
  const fieldErrors = collectErrorMessages(payload?.errors);
  if (fieldErrors.length) return fieldErrors.join("; ");
  if (payload?.message) return payload.message;
  if (payload?.raw) return payload.raw.slice(0, 400);
  if (status) return `Pagar.me retornou HTTP ${status}`;
  return "Erro desconhecido na API Pagar.me";
}
