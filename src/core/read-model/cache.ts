const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): T {
  cache.set(key, value as unknown);
  return value;
}

export function clearReadModelCache(): void {
  cache.clear();
}
