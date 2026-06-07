export async function readJsonObject(request: Request, errorMessage: string) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { data: null, error: errorMessage };
    }

    return { data: body as Record<string, unknown>, error: null };
  } catch {
    return { data: null, error: errorMessage };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
