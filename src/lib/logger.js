import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

export async function logEvent(type, payload = {}) {
  try {
    await fs.promises.mkdir(LOG_DIR, { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      type,
      ...payload,
    };
    await fs.promises.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
    return { ok: true };
  } catch {
    // Fail silently to avoid breaking user flows
    return { ok: false };
  }
}
