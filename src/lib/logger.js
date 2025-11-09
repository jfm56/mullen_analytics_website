// Console-based logger (no filesystem writes)

export async function logEvent(type, payload = {}) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      type,
      ...payload,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
