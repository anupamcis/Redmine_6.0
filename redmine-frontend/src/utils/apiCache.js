/**
 * Simple in-memory cache for API responses
 * Reduces redundant API calls and improves performance
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const apiCache = {
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    if (now - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  },
  
  set: (key, data) => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  clear: (key) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  },
  
  has: (key) => {
    const item = cache.get(key);
    if (!item) return false;
    
    const now = Date.now();
    if (now - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
      return false;
    }
    
    return true;
  },
  
  keys: () => {
    return Array.from(cache.keys());
  }
};

/**
 * Wrapper for API calls with caching
 */
export const cachedApiCall = async (cacheKey, apiFunction) => {
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  
  // Make API call
  console.log(`[Cache MISS] ${cacheKey} - Fetching...`);
  const data = await apiFunction();
  
  // Store in cache
  apiCache.set(cacheKey, data);
  
  return data;
};
