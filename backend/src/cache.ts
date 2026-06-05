interface CacheEntry<T> {
  value: T;
  expiry: number; // Timestamp, when cach outdated
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export const setCache = <T>(key: string, value: T, ttlSeconds: number): void => {
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

// Helper function to get or set cache with in-flight request deduplication
export const getOrSetCache = async <T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> => {
  const cachedValue = getCache<T>(key);

  if (cachedValue !== undefined) {
    return cachedValue;
  }
  // Cache miss, check for in-flight request for development logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache Miss] Key: ${key}`);
  }

  const inFlightRequest = inFlightRequests.get(key) as Promise<T> | undefined;

  if (inFlightRequest) {
    return inFlightRequest;
  }
  console.log(`[Cache Miss] Key: ${key}`);

  const requestPromise = factory().then((value) => {
    setCache(key, value, ttlSeconds);
    return value;
  });

  inFlightRequests.set(key, requestPromise as Promise<unknown>);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(key);
  }
};
