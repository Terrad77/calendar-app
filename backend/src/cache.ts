interface CacheEntry<T> {
  value: T;
  expiry: number; // Timestamp, when cach outdated
}

// Key: string (e.g., "2025-UA")
// Value: CacheEntry<Array<Holiday>>
const cache = new Map<string, CacheEntry<any>>();

export const setCache = <T>(key: string, value: T, ttlSeconds: number) => {
  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiry });
};

export const getCache = <T>(key: string): T | undefined => {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }
  if (Date.now() > entry.expiry) {
    cache.delete(key); // cache is outdated, delete it
    return undefined;
  }
  return entry.value as T;
};
