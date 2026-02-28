import { invoke } from "@tauri-apps/api/core";

export function isDesktopRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const maybeWindow = window as Window & { __TAURI_INTERNALS__?: unknown };
  return Boolean(maybeWindow.__TAURI_INTERNALS__) || navigator.userAgent.includes("Tauri");
}

export async function invokeTauri<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, payload || {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`TAURI_INVOKE_${command}: ${message}`);
  }
}
